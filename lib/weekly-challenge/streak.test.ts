import { describe, it, expect } from 'vitest'
import { computeStreakUpdate } from './streak'

describe('computeStreakUpdate', () => {
  it('starts a streak at 1 on the first-ever solve', () => {
    const result = computeStreakUpdate(
      { currentStreak: 0, bestStreak: 0, lastSolvedWeek: null },
      '2026-08-24'
    )
    expect(result).toEqual({ currentStreak: 1, bestStreak: 1, lastSolvedWeek: '2026-08-24' })
  })

  it('increments the streak when solved exactly 7 days after the last solve', () => {
    const result = computeStreakUpdate(
      { currentStreak: 3, bestStreak: 3, lastSolvedWeek: '2026-08-24' },
      '2026-08-31'
    )
    expect(result).toEqual({ currentStreak: 4, bestStreak: 4, lastSolvedWeek: '2026-08-31' })
  })

  it('resets to 1 when there is a gap longer than 7 days', () => {
    const result = computeStreakUpdate(
      { currentStreak: 4, bestStreak: 4, lastSolvedWeek: '2026-08-24' },
      '2026-09-14'
    )
    expect(result).toEqual({ currentStreak: 1, bestStreak: 4, lastSolvedWeek: '2026-09-14' })
  })

  it('keeps bestStreak at its prior max after a reset', () => {
    const result = computeStreakUpdate(
      { currentStreak: 1, bestStreak: 10, lastSolvedWeek: '2026-08-24' },
      '2026-09-14'
    )
    expect(result.bestStreak).toBe(10)
  })
})
