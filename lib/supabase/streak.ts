import { SupabaseClient } from '@supabase/supabase-js'

export type StreakMilestone = 7 | 30 | 100

export type StreakResult = {
  newStreak: number
  bestStreak: number
  /** Set when this session crossed a milestone boundary for the first time. */
  milestone: StreakMilestone | null
}

/**
 * Updates the streak counters on the child row after a completed session.
 * Safe to call multiple times on the same day — idempotent after first call.
 */
export async function updateStreak(
  supabase: SupabaseClient,
  childId: string
): Promise<StreakResult> {
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0]

  const { data: child } = await supabase
    .from('children')
    .select('current_streak, best_streak, last_practice_date')
    .eq('id', childId)
    .single()

  if (!child) return { newStreak: 0, bestStreak: 0, milestone: null }

  // Already updated for today — don't double-count
  if (child.last_practice_date === today) {
    return { newStreak: child.current_streak, bestStreak: child.best_streak ?? 0, milestone: null }
  }

  const prevStreak = child.current_streak ?? 0
  const extended = child.last_practice_date === yesterday
  const newStreak = extended ? prevStreak + 1 : 1
  const bestStreak = Math.max(newStreak, child.best_streak ?? 0)

  // Detect milestone crossing (highest matching threshold wins)
  const milestone = ([100, 30, 7] as const).find(
    (m) => newStreak >= m && prevStreak < m
  ) ?? null

  const update: Record<string, unknown> = {
    current_streak: newStreak,
    best_streak: bestStreak,
    last_practice_date: today,
  }
  if (!extended) update.streak_start_date = today

  await supabase.from('children').update(update).eq('id', childId)

  return { newStreak, bestStreak, milestone }
}
