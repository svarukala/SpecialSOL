'use client'
import { useEffect } from 'react'
import { useTimer } from '@/lib/practice/use-timer'

interface Props {
  /** Total seconds for this question. */
  durationSeconds: number
  /** Called when the countdown reaches zero. */
  onExpire: () => void
  /** Passing a new value here triggers a reset + restart. Tie to question id. */
  questionKey: string
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`
}

export function QuestionTimer({ durationSeconds, onExpire, questionKey }: Props) {
  const { timeLeft, fractionLeft, start, reset } = useTimer({
    durationSeconds,
    onExpire,
  })

  // Reset and restart whenever the question changes
  useEffect(() => {
    reset(durationSeconds)
    // Small delay to let the component settle before starting
    const id = setTimeout(() => start(), 50)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionKey])

  const pct = Math.round(fractionLeft * 100)

  // Color: green > 50%, amber 20–50%, red ≤ 20%
  const barColor =
    fractionLeft > 0.5
      ? 'bg-green-500'
      : fractionLeft > 0.2
      ? 'bg-amber-400'
      : 'bg-red-500'

  const textColor =
    fractionLeft > 0.5
      ? 'text-green-700'
      : fractionLeft > 0.2
      ? 'text-amber-600'
      : 'text-red-600'

  return (
    <div
      role="timer"
      aria-label={`${timeLeft} seconds remaining`}
      aria-live="off"
      className="space-y-1"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Time remaining</span>
        <span className={`text-xs font-mono font-semibold tabular-nums ${textColor}`}>
          {formatTime(timeLeft)}
        </span>
      </div>
      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ease-linear ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
