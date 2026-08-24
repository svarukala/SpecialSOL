export interface StreakState {
  currentStreak: number
  bestStreak: number
  lastSolvedWeek: string | null
}

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000

function isExactlyOneWeekBefore(prev: string, next: string): boolean {
  const prevMs = new Date(`${prev}T00:00:00Z`).getTime()
  const nextMs = new Date(`${next}T00:00:00Z`).getTime()
  return nextMs - prevMs === ONE_WEEK_MS
}

export function computeStreakUpdate(state: StreakState, weekStartDate: string): StreakState {
  const isConsecutive = state.lastSolvedWeek !== null && isExactlyOneWeekBefore(state.lastSolvedWeek, weekStartDate)
  const currentStreak = isConsecutive ? state.currentStreak + 1 : 1
  return {
    currentStreak,
    bestStreak: Math.max(state.bestStreak, currentStreak),
    lastSolvedWeek: weekStartDate,
  }
}
