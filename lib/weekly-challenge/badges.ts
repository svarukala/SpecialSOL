import type { Band } from './band'

export type BadgeType = 'puzzle' | 'streak_milestone'

export interface BadgeAward {
  badgeKey: string
  badgeType: BadgeType
  band: Band
  title: string
  emoji: string
}

export function puzzleBadge(
  puzzleId: string,
  puzzleType: 'mystery_code' | 'soldle',
  title: string,
  band: Band
): BadgeAward {
  return {
    badgeKey: `puzzle:${puzzleId}`,
    badgeType: 'puzzle',
    band,
    title,
    emoji: puzzleType === 'mystery_code' ? '🗝️' : '🔢',
  }
}

const STREAK_TIER_EMOJI = ['🥉', '🥈', '🥇', '🏆']

export function streakMilestoneBadge(band: Band, currentStreak: number): BadgeAward | null {
  if (currentStreak <= 0 || currentStreak % 5 !== 0) return null

  const tierIndex = Math.min(currentStreak / 5 - 1, STREAK_TIER_EMOJI.length - 1)

  return {
    badgeKey: `streak:${band}:${currentStreak}`,
    badgeType: 'streak_milestone',
    band,
    title: `${currentStreak}-Week Streak`,
    emoji: STREAK_TIER_EMOJI[tierIndex],
  }
}
