'use client'
import { useEffect } from 'react'
import { playFanfare } from '@/lib/audio/web-audio'
import { Button } from '@/components/ui/button'

interface Props {
  scorePercent: number
  correctCount: number
  questionsTotal: number
  onPracticeAgain: () => void
  onGoHome: () => void
  positiveReinforcement: boolean
}

function scoreToStars(percent: number): number {
  if (percent >= 90) return 5
  if (percent >= 80) return 4
  if (percent >= 70) return 3
  if (percent >= 60) return 2
  return 1
}

const MESSAGES: Record<number, string> = {
  5: "Outstanding! You're a superstar! 🌟",
  4: "Great work! Keep it up! 🎉",
  3: "Good job! You're getting there! 💪",
  2: "Nice try! Practice makes perfect! 📚",
  1: "Keep going — every attempt counts! 🌱",
}

export function SessionComplete({ scorePercent, correctCount, questionsTotal, onPracticeAgain, onGoHome, positiveReinforcement }: Props) {
  const stars = scoreToStars(scorePercent)

  useEffect(() => {
    if (positiveReinforcement) playFanfare()
  }, [positiveReinforcement])

  return (
    <div className="text-center space-y-6 p-8">
      <h1 className="text-3xl font-bold">Session Complete!</h1>
      <div className="text-6xl" aria-label={`${stars} out of 5 stars`}>
        {'⭐'.repeat(stars)}{'☆'.repeat(5 - stars)}
      </div>
      <p className="text-2xl font-semibold">{correctCount} / {questionsTotal} correct</p>
      <p className="text-muted-foreground">{MESSAGES[stars]}</p>
      <div className="flex gap-3 justify-center">
        <Button variant="outline" size="lg" onClick={onGoHome}>Go Home</Button>
        <Button size="lg" onClick={onPracticeAgain}>Practice Again</Button>
      </div>
    </div>
  )
}
