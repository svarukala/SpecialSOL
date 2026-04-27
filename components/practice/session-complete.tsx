'use client'
import { useEffect } from 'react'
import { playFanfare, playPerfectFanfare, playGentleChime } from '@/lib/audio/web-audio'
import { Button } from '@/components/ui/button'
import type { StreakMilestone } from '@/lib/supabase/streak'

interface Props {
  scorePercent: number
  correctCount: number
  questionsTotal: number
  onPracticeAgain: () => void
  onGoHome: () => void
  positiveReinforcement: boolean
  newStreak?: number
  streakMilestone?: StreakMilestone | null
  newlyMastered?: string[]
}

type Tier = 'perfect' | 'high' | 'good' | 'ok' | 'low'

function getTier(percent: number): Tier {
  if (percent === 100) return 'perfect'
  if (percent >= 90)  return 'high'
  if (percent >= 70)  return 'good'
  if (percent >= 50)  return 'ok'
  return 'low'
}

const TIER_CONFIG: Record<Tier, {
  headline: string
  sub: string
  stars: number
  confetti: 'full' | 'light' | 'none'
}> = {
  perfect: { headline: 'PERFECT!',      sub: "You got every question right! 🎉",         stars: 5, confetti: 'full'  },
  high:    { headline: 'Amazing!',       sub: "Almost perfect — incredible work! ⭐",      stars: 5, confetti: 'full'  },
  good:    { headline: 'Great job!',     sub: "You're getting stronger every session! 💪", stars: 4, confetti: 'light' },
  ok:      { headline: 'Keep going!',    sub: "Every session makes you better. 🌱",        stars: 3, confetti: 'none'  },
  low:     { headline: 'You practiced!', sub: "That's what matters. Come back tomorrow!",  stars: 2, confetti: 'none'  },
}

// star count by tier
function starsForTier(tier: Tier, percent: number): number {
  if (tier === 'perfect') return 5
  if (tier === 'high')    return 5
  if (percent >= 80)      return 4
  if (percent >= 70)      return 3
  if (percent >= 60)      return 2
  return 1
}

const MILESTONE_MESSAGES: Record<StreakMilestone, string> = {
  7:   '🔥 7-day streak! You\'re on fire!',
  30:  '⭐ 30-day streak! Amazing dedication!',
  100: '🏆 100-day streak! You\'re a champion!',
}

async function fireConfetti(level: 'full' | 'light') {
  const confetti = (await import('canvas-confetti')).default
  if (level === 'full') {
    confetti({ particleCount: 150, spread: 80, origin: { y: 0.55 } })
    setTimeout(() => confetti({ particleCount: 80, spread: 120, origin: { y: 0.4 }, angle: 60 }), 300)
    setTimeout(() => confetti({ particleCount: 80, spread: 120, origin: { y: 0.4 }, angle: 120 }), 300)
  } else {
    confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } })
  }
}

export function SessionComplete({
  scorePercent,
  correctCount,
  questionsTotal,
  onPracticeAgain,
  onGoHome,
  positiveReinforcement,
  newStreak,
  streakMilestone,
  newlyMastered = [],
}: Props) {
  const tier = getTier(scorePercent)
  const config = TIER_CONFIG[tier]
  const stars = starsForTier(tier, scorePercent)

  useEffect(() => {
    if (!positiveReinforcement) return
    if (tier === 'perfect') playPerfectFanfare()
    else if (tier === 'high' || tier === 'good') playFanfare()
    else if (tier === 'ok') playGentleChime()

    if (config.confetti !== 'none') {
      fireConfetti(config.confetti)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="text-center space-y-6 p-8 max-w-sm mx-auto">
      <h1 className={`font-bold ${tier === 'perfect' ? 'text-5xl text-yellow-500' : 'text-3xl'}`}>
        {config.headline}
      </h1>

      <div className="text-6xl" aria-label={`${stars} out of 5 stars`}>
        {'⭐'.repeat(stars)}{'☆'.repeat(5 - stars)}
      </div>

      <p className="text-2xl font-semibold">{correctCount} / {questionsTotal} correct</p>
      <p className="text-muted-foreground">{config.sub}</p>

      {streakMilestone && (
        <div className="rounded-lg bg-orange-50 border border-orange-200 px-4 py-3 text-orange-800 font-medium">
          {MILESTONE_MESSAGES[streakMilestone]}
        </div>
      )}

      {!streakMilestone && newStreak && newStreak > 1 && (
        <p className="text-sm text-muted-foreground">🔥 {newStreak}-day streak — keep it going!</p>
      )}

      {newlyMastered.length > 0 && (
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-yellow-800 text-sm font-medium space-y-0.5">
          {newlyMastered.map((t) => (
            <p key={t}>⭐ New mastery: <strong>{t}</strong>!</p>
          ))}
        </div>
      )}

      <div className="flex gap-3 justify-center">
        <Button variant="outline" size="lg" onClick={onGoHome}>Go Home</Button>
        <Button size="lg" onClick={onPracticeAgain}>Practice Again</Button>
      </div>
    </div>
  )
}
