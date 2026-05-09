'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const PROBLEMS_PER_ROUND = 10

interface Props {
  childId: string
  multiplier?: number
  mode?: 'drill' | 'speed'
}

interface Problem {
  multiplier: number
  multiplicand: number
}

type FeedbackState = 'idle' | 'correct' | 'wrong'

interface RoundResult {
  correct: number
  avgResponseMs: number
  totalMs: number
}

function generateProblems(multiplier?: number): Problem[] {
  if (multiplier) {
    const multiplicands = Array.from({ length: 11 }, (_, i) => i + 2)
    const shuffled = multiplicands.sort(() => Math.random() - 0.5).slice(0, PROBLEMS_PER_ROUND)
    return shuffled.map((m) => ({ multiplier, multiplicand: m }))
  }
  const problems: Problem[] = []
  for (let i = 0; i < PROBLEMS_PER_ROUND; i++) {
    const a = Math.floor(Math.random() * 11) + 2
    const b = Math.floor(Math.random() * 11) + 2
    problems.push({ multiplier: a, multiplicand: b })
  }
  return problems
}

export function TimesTablesDrillClient({ childId, multiplier, mode = 'drill' }: Props) {
  const router = useRouter()
  const [problems, setProblems] = useState<Problem[]>(() => generateProblems(multiplier))
  const [currentIndex, setCurrentIndex] = useState(0)
  const [inputValue, setInputValue] = useState('')
  const [feedback, setFeedback] = useState<FeedbackState>('idle')
  const [correctAnswer, setCorrectAnswer] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [responseTimes, setResponseTimes] = useState<number[]>([])
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now())
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const currentProblem = problems[currentIndex]

  useEffect(() => {
    setQuestionStartTime(Date.now())
    inputRef.current?.focus()
  }, [currentIndex])

  const submitAnswer = useCallback(async () => {
    if (submitting || feedback !== 'idle' || !inputValue.trim()) return
    const parsed = parseInt(inputValue, 10)
    if (isNaN(parsed)) return

    setSubmitting(true)
    const elapsed = Date.now() - questionStartTime

    const res = await fetch('/api/times-tables/attempt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        childId,
        multiplier: currentProblem.multiplier,
        multiplicand: currentProblem.multiplicand,
        answerGiven: parsed,
        responseTimeMs: elapsed,
      }),
    })

    const data = await res.json() as { isCorrect: boolean; correctAnswer: number }
    setSubmitting(false)
    setFeedback(data.isCorrect ? 'correct' : 'wrong')
    setCorrectAnswer(data.correctAnswer)
    setResponseTimes((prev) => [...prev, elapsed])
    if (data.isCorrect) setScore((s) => s + 1)

    setTimeout(() => {
      setFeedback('idle')
      setCorrectAnswer(null)
      setInputValue('')

      if (currentIndex + 1 >= PROBLEMS_PER_ROUND) {
        const allTimes = [...responseTimes, elapsed]
        const avg = Math.round(allTimes.reduce((a, b) => a + b, 0) / allTimes.length)
        const total = allTimes.reduce((a, b) => a + b, 0)
        setRoundResult({
          correct: data.isCorrect ? score + 1 : score,
          avgResponseMs: avg,
          totalMs: total,
        })
      } else {
        setCurrentIndex((i) => i + 1)
      }
    }, data.isCorrect ? 600 : 1400)
  }, [submitting, feedback, inputValue, questionStartTime, childId, currentProblem, currentIndex, responseTimes, score])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') submitAnswer()
  }

  function restart() {
    setProblems(generateProblems(multiplier))
    setCurrentIndex(0)
    setInputValue('')
    setFeedback('idle')
    setCorrectAnswer(null)
    setScore(0)
    setResponseTimes([])
    setRoundResult(null)
    setQuestionStartTime(Date.now())
  }

  if (roundResult) {
    const pct = Math.round((roundResult.correct / PROBLEMS_PER_ROUND) * 100)
    const avgSec = (roundResult.avgResponseMs / 1000).toFixed(1)
    return (
      <div className="flex flex-col items-center gap-6 p-8 max-w-sm mx-auto text-center">
        <h2 className="text-3xl font-bold">
          {pct === 100 ? 'Perfect!' : pct >= 80 ? 'Great job!' : 'Keep practicing!'}
        </h2>
        <p className="text-5xl font-bold">
          {roundResult.correct}<span className="text-muted-foreground text-3xl">/{PROBLEMS_PER_ROUND}</span>
        </p>
        <p className="text-muted-foreground text-sm">Avg response time: {avgSec}s</p>
        <div className="flex gap-3 w-full">
          <Button variant="outline" className="flex-1" onClick={() => router.push('/times-tables')}>
            All Tables
          </Button>
          <Button className="flex-1" onClick={restart}>
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  const feedbackBg =
    feedback === 'correct'
      ? 'bg-green-50 border-green-300'
      : feedback === 'wrong'
      ? 'bg-red-50 border-red-300'
      : 'bg-background border-border'

  return (
    <div className="flex flex-col items-center gap-8 p-8 max-w-sm mx-auto">
      <div className="flex items-center justify-between w-full text-sm text-muted-foreground">
        <span>{currentIndex + 1} / {PROBLEMS_PER_ROUND}</span>
        <span>{score} correct</span>
      </div>

      <div
        className={`w-full rounded-xl border-2 p-8 text-center transition-colors ${feedbackBg}`}
      >
        <p className="text-5xl font-bold tracking-wide">
          {currentProblem.multiplier} × {currentProblem.multiplicand} = ?
        </p>
        {feedback === 'wrong' && correctAnswer !== null && (
          <p className="mt-4 text-red-600 font-semibold text-lg">
            Answer: {correctAnswer}
          </p>
        )}
        {feedback === 'correct' && (
          <p className="mt-4 text-green-600 font-semibold text-lg">Correct! ✓</p>
        )}
      </div>

      <div className="flex gap-3 w-full">
        <Input
          ref={inputRef}
          type="number"
          inputMode="numeric"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={feedback !== 'idle' || submitting}
          placeholder="Your answer"
          className="text-center text-xl h-12"
          autoFocus
        />
        <Button
          onClick={submitAnswer}
          disabled={feedback !== 'idle' || submitting || !inputValue.trim()}
          className="h-12 px-6"
        >
          {submitting ? '...' : 'Check'}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">Press Enter to submit</p>
    </div>
  )
}
