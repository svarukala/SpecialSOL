import { describe, it, expect } from 'vitest'
import { puzzleBadge, streakMilestoneBadge } from './badges'

describe('puzzleBadge', () => {
  it('uses a key emoji for mystery_code', () => {
    const badge = puzzleBadge('puzzle-1', 'mystery_code', 'The Locker Code', 'elementary')
    expect(badge).toEqual({
      badgeKey: 'puzzle:puzzle-1',
      badgeType: 'puzzle',
      band: 'elementary',
      title: 'The Locker Code',
      emoji: '🗝️',
    })
  })

  it('uses a number emoji for soldle', () => {
    const badge = puzzleBadge('puzzle-2', 'soldle', 'Ratio Riddle', 'middle')
    expect(badge.emoji).toBe('🔢')
    expect(badge.badgeKey).toBe('puzzle:puzzle-2')
  })
})

describe('streakMilestoneBadge', () => {
  it('returns null below the first 5-week milestone', () => {
    expect(streakMilestoneBadge('elementary', 4)).toBeNull()
    expect(streakMilestoneBadge('elementary', 0)).toBeNull()
  })

  it('returns a bronze badge at a 5-week streak', () => {
    const badge = streakMilestoneBadge('elementary', 5)
    expect(badge).toEqual({
      badgeKey: 'streak:elementary:5',
      badgeType: 'streak_milestone',
      band: 'elementary',
      title: '5-Week Streak',
      emoji: '🥉',
    })
  })

  it('returns a silver badge at 10 and gold at 15', () => {
    expect(streakMilestoneBadge('middle', 10)?.emoji).toBe('🥈')
    expect(streakMilestoneBadge('middle', 15)?.emoji).toBe('🥇')
  })

  it('caps the tier at a trophy for 20+ week streaks', () => {
    expect(streakMilestoneBadge('middle', 20)?.emoji).toBe('🏆')
    expect(streakMilestoneBadge('middle', 35)?.emoji).toBe('🏆')
  })

  it('returns null for a streak that is not a multiple of 5', () => {
    expect(streakMilestoneBadge('elementary', 6)).toBeNull()
    expect(streakMilestoneBadge('elementary', 11)).toBeNull()
  })
})
