import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { gradeToBand } from '@/lib/weekly-challenge/band'
import { getCurrentWeekStartDate } from '@/lib/weekly-challenge/week'
import { computeStreakUpdate, type StreakState } from '@/lib/weekly-challenge/streak'
import { puzzleBadge, streakMilestoneBadge, type BadgeAward } from '@/lib/weekly-challenge/badges'
import {
  checkMysteryCodeAnswers,
  checkSoldleGuess,
  type MysteryCodeContent,
  type SoldleContent,
  type SoldleSolution,
} from '@/lib/weekly-challenge/puzzle-types'

interface AttemptBody {
  childId: string
  puzzleId: string
  mysteryAnswerIndexes?: number[]
  soldleGuess?: number
}

async function awardBadge(
  supabase: Awaited<ReturnType<typeof createClient>>,
  childId: string,
  badge: BadgeAward
) {
  const { error } = await supabase.from('child_badges').upsert(
    {
      child_id: childId,
      badge_key: badge.badgeKey,
      badge_type: badge.badgeType,
      band: badge.band,
      title: badge.title,
      emoji: badge.emoji,
    },
    { onConflict: 'child_id,badge_key', ignoreDuplicates: true }
  )
  return !error
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { childId, puzzleId, mysteryAnswerIndexes, soldleGuess } = await req.json() as AttemptBody

  const { data: child } = await supabase
    .from('children')
    .select('id, grade')
    .eq('id', childId)
    .eq('parent_id', user.id)
    .single()
  if (!child) return NextResponse.json({ error: 'Child not found' }, { status: 404 })

  const currentWeek = getCurrentWeekStartDate()

  const { data: puzzle } = await supabase
    .from('weekly_puzzles')
    .select('id, band, puzzle_type, title, week_start_date, content, solution')
    .eq('id', puzzleId)
    .eq('status', 'approved')
    .eq('week_start_date', currentWeek)
    .single()
  if (!puzzle) return NextResponse.json({ error: 'Puzzle not found' }, { status: 404 })

  const band = gradeToBand(child.grade)
  if (band !== puzzle.band) return NextResponse.json({ error: 'Wrong band' }, { status: 403 })

  const { data: existingAttempt } = await supabase
    .from('weekly_puzzle_attempts')
    .select('solved_at, attempt_count')
    .eq('child_id', childId)
    .eq('puzzle_id', puzzleId)
    .maybeSingle()

  const wasAlreadySolved = Boolean(existingAttempt?.solved_at)
  const priorAttemptCount = existingAttempt?.attempt_count ?? 0

  let solved = false
  let revealedCode: string | undefined
  let feedback: 'correct' | 'too_low' | 'too_high' | undefined

  if (puzzle.puzzle_type === 'mystery_code') {
    const result = checkMysteryCodeAnswers(puzzle.content as MysteryCodeContent, mysteryAnswerIndexes ?? [])
    solved = result.solved
    revealedCode = result.revealedCode
  } else {
    const content = puzzle.content as SoldleContent

    if (!wasAlreadySolved && priorAttemptCount >= content.maxGuesses) {
      return NextResponse.json({ error: 'Out of guesses for this week' }, { status: 403 })
    }
    if (
      typeof soldleGuess !== 'number' ||
      !Number.isInteger(soldleGuess) ||
      soldleGuess < content.min ||
      soldleGuess > content.max
    ) {
      return NextResponse.json({ error: 'Invalid guess' }, { status: 400 })
    }

    feedback = checkSoldleGuess(puzzle.solution as SoldleSolution, soldleGuess)
    solved = feedback === 'correct'
  }

  const attemptCount = priorAttemptCount + 1
  const isFirstSolve = solved && !wasAlreadySolved

  await supabase.from('weekly_puzzle_attempts').upsert(
    {
      child_id: childId,
      puzzle_id: puzzleId,
      band,
      attempt_count: attemptCount,
      solved_at: wasAlreadySolved ? existingAttempt!.solved_at : (solved ? new Date().toISOString() : null),
    },
    { onConflict: 'child_id,puzzle_id' }
  )

  const newBadges: BadgeAward[] = []

  if (isFirstSolve && puzzle.puzzle_type === 'soldle') {
    const badge = puzzleBadge(puzzle.id, 'soldle', puzzle.title as string, band)
    if (await awardBadge(supabase, childId, badge)) newBadges.push(badge)
  }

  let currentStreak: number | undefined
  let bestStreak: number | undefined

  if (isFirstSolve) {
    const currentCol = band === 'elementary' ? 'current_streak_elementary' : 'current_streak_middle'
    const bestCol = band === 'elementary' ? 'best_streak_elementary' : 'best_streak_middle'
    const lastCol = band === 'elementary' ? 'last_solved_week_elementary' : 'last_solved_week_middle'

    const { data: streakRow } = await supabase
      .from('children')
      .select(`${currentCol}, ${bestCol}, ${lastCol}`)
      .eq('id', childId)
      .single()

    const priorState: StreakState = {
      currentStreak: (streakRow as any)?.[currentCol] ?? 0,
      bestStreak: (streakRow as any)?.[bestCol] ?? 0,
      lastSolvedWeek: (streakRow as any)?.[lastCol] ?? null,
    }

    const updated = computeStreakUpdate(priorState, currentWeek)
    currentStreak = updated.currentStreak
    bestStreak = updated.bestStreak

    await supabase
      .from('children')
      .update({
        [currentCol]: updated.currentStreak,
        [bestCol]: updated.bestStreak,
        [lastCol]: updated.lastSolvedWeek,
      })
      .eq('id', childId)

    const streakBadge = streakMilestoneBadge(band, updated.currentStreak)
    if (streakBadge && (await awardBadge(supabase, childId, streakBadge))) {
      newBadges.push(streakBadge)
    }
  }

  return NextResponse.json({
    solved,
    attemptCount,
    ...(revealedCode !== undefined ? { revealedCode } : {}),
    ...(feedback !== undefined ? { feedback } : {}),
    ...(currentStreak !== undefined ? { currentStreak, bestStreak } : {}),
    newBadges,
  })
}
