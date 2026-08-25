// app/api/weekly-challenge/redeem/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { gradeToBand } from '@/lib/weekly-challenge/band'
import { getCurrentWeekStartDate } from '@/lib/weekly-challenge/week'
import { puzzleBadge } from '@/lib/weekly-challenge/badges'
import type { MysteryCodeSolution } from '@/lib/weekly-challenge/puzzle-types'

interface RedeemBody {
  childId: string
  puzzleId: string
  code: string
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { childId, puzzleId, code } = await req.json() as RedeemBody

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
    .select('id, band, puzzle_type, title, week_start_date, solution')
    .eq('id', puzzleId)
    .eq('status', 'approved')
    .eq('week_start_date', currentWeek)
    .eq('puzzle_type', 'mystery_code')
    .single()
  if (!puzzle) return NextResponse.json({ error: 'Puzzle not found' }, { status: 404 })

  const band = gradeToBand(child.grade)
  if (band !== puzzle.band) return NextResponse.json({ error: 'Wrong band' }, { status: 403 })

  const { data: attempt } = await supabase
    .from('weekly_puzzle_attempts')
    .select('solved_at')
    .eq('child_id', childId)
    .eq('puzzle_id', puzzleId)
    .maybeSingle()
  if (!attempt?.solved_at) return NextResponse.json({ error: 'Not solved yet' }, { status: 404 })

  const solution = puzzle.solution as MysteryCodeSolution
  if (typeof code !== 'string' || code.trim() !== solution.code) {
    return NextResponse.json({ error: 'incorrect_code' }, { status: 400 })
  }

  const badge = puzzleBadge(puzzle.id, 'mystery_code', puzzle.title as string, band)

  await supabase.from('child_badges').upsert(
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

  return NextResponse.json({ badge })
}
