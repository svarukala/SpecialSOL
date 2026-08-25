// app/(parent)/challenge/page.tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { gradeToBand } from '@/lib/weekly-challenge/band'
import { getCurrentWeekStartDate } from '@/lib/weekly-challenge/week'
import { MysteryCode } from '@/components/weekly-challenge/mystery-code'
import { Soldle } from '@/components/weekly-challenge/soldle'
import type { MysteryCodeContent, SoldleContent } from '@/lib/weekly-challenge/puzzle-types'

export default async function ChallengePage({
  searchParams,
}: {
  searchParams: Promise<{ childId?: string }>
}) {
  const { childId: selectedId } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: children } = await supabase
    .from('children')
    .select('id, name, grade, avatar')
    .eq('parent_id', user.id)
    .order('created_at')

  if (!children || children.length === 0) redirect('/children/new')

  const activeChild = children.find((c) => c.id === selectedId) ?? children[0]
  const band = gradeToBand(activeChild.grade)
  const weekStartDate = getCurrentWeekStartDate()

  const { data: puzzle } = await supabase
    .from('weekly_puzzles')
    .select('id, puzzle_type, title, content')
    .eq('band', band)
    .eq('status', 'approved')
    .eq('week_start_date', weekStartDate)
    .maybeSingle()

  const currentCol = band === 'elementary' ? 'current_streak_elementary' : 'current_streak_middle'
  const { data: childStreak } = await supabase
    .from('children')
    .select(currentCol)
    .eq('id', activeChild.id)
    .single()

  const { data: attempt } = puzzle
    ? await supabase
        .from('weekly_puzzle_attempts')
        .select('solved_at, attempt_count')
        .eq('child_id', activeChild.id)
        .eq('puzzle_id', puzzle.id)
        .maybeSingle()
    : { data: null }

  const { data: existingBadge } = puzzle
    ? await supabase
        .from('child_badges')
        .select('id')
        .eq('child_id', activeChild.id)
        .eq('badge_key', `puzzle:${puzzle.id}`)
        .maybeSingle()
    : { data: null }

  const streakCount = (childStreak as Record<string, number> | null)?.[currentCol] ?? 0

  return (
    <main className="max-w-lg mx-auto p-6 space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          🧩 Weekly Challenge
        </h1>
        <p className="text-sm text-muted-foreground">
          One puzzle a week, no pressure — just a few fun minutes.
        </p>
      </div>

      {children.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {children.map((child) => (
            <Link
              key={child.id}
              href={`/challenge?childId=${child.id}`}
              className={`inline-flex items-center rounded-lg border px-3 h-8 text-sm font-medium transition-colors whitespace-nowrap ${
                child.id === activeChild.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background hover:bg-muted'
              }`}
            >
              {child.name}
            </Link>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        {streakCount > 0 ? (
          <p className="text-sm text-muted-foreground">
            🔥 {activeChild.name}&apos;s streak: {streakCount} week{streakCount === 1 ? '' : 's'}
          </p>
        ) : <span />}
        <Link href={`/badges?childId=${activeChild.id}`} className="text-sm text-primary hover:underline">
          🏅 My Badges
        </Link>
      </div>

      {!puzzle ? (
        <p className="text-sm text-muted-foreground">
          No challenge is live for {activeChild.name} this week yet — check back soon!
        </p>
      ) : puzzle.puzzle_type === 'mystery_code' ? (
        <MysteryCode
          childId={activeChild.id}
          puzzleId={puzzle.id}
          title={puzzle.title}
          content={puzzle.content as MysteryCodeContent}
          alreadySolved={Boolean(attempt?.solved_at)}
          alreadyRedeemed={Boolean(existingBadge)}
        />
      ) : (
        <Soldle
          childId={activeChild.id}
          puzzleId={puzzle.id}
          title={puzzle.title}
          content={puzzle.content as SoldleContent}
          alreadySolved={Boolean(attempt?.solved_at)}
        />
      )}
    </main>
  )
}
