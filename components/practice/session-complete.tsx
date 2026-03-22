'use client'
import { useEffect } from 'react'
import { playFanfare } from '@/lib/audio/web-audio'
import { Button } from '@/components/ui/button'

interface Props {
  scorePercent: number
  onPracticeAgain: () => void
  positiveReinforcement: boolean
}

function scoreToStars(percent: number): number {
  if (percent >= 90) return 5
  if (percent >= 80) return 4
  if (percent >= 70) return 3
  if (percent >= 60) return 2
  return 1
}

export function SessionComplete({ scorePercent, onPracticeAgain, positiveReinforcement }: Props) {
  const stars = scoreToStars(scorePercent)

  useEffect(() => {
    if (positiveReinforcement) playFanfare()
  }, [positiveReinforcement])

  return (
    <div className="text-center space-y-6 p-8">
      <h1 className="text-3xl font-bold">Great job! 🎉</h1>
      <div className="text-6xl" aria-label={`${stars} out of 5 stars`}>
        {'⭐'.repeat(stars)}{'☆'.repeat(5 - stars)}
      </div>
      <p className="text-xl text-muted-foreground">You got {scorePercent}% correct!</p>
      <Button size="lg" onClick={onPracticeAgain}>Practice Again</Button>
    </div>
  )
}
