'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GameMode = 'learn' | 'test' | 'compete'
type Phase = 'select' | 'playing' | 'results'
type Operator = '<' | '=' | '>'
type FeedbackState = 'idle' | 'correct' | 'wrong'

interface Pair {
  left: number
  right: number
  correct: Operator
}

interface TestQuestion extends Pair {
  chosen: Operator
  wasCorrect: boolean
}

interface ScoreRow {
  mode: string
  best_score: number
  best_total: number
}

interface Props {
  childId: string
  scores: ScoreRow[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function correctOperator(left: number, right: number): Operator {
  if (left < right) return '<'
  if (left > right) return '>'
  return '='
}

/** Generate a random pair with roughly equal distribution of <, =, > outcomes.
 *  ~20% chance of equal pair, 40% each for < and >. */
function generatePair(): Pair {
  const roll = Math.random()
  if (roll < 0.2) {
    // equal
    const n = Math.floor(Math.random() * 100)
    return { left: n, right: n, correct: '=' }
  }
  // distinct
  let left = Math.floor(Math.random() * 100)
  let right = Math.floor(Math.random() * 100)
  while (left === right) {
    right = Math.floor(Math.random() * 100)
  }
  return { left, right, correct: correctOperator(left, right) }
}

const OPERATORS: Operator[] = ['<', '=', '>']
const TEST_TOTAL = 15
const COMPETE_SECONDS = 30

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ModeCard({
  emoji,
  title,
  description,
  onClick,
  bestScore,
}: {
  emoji: string
  title: string
  description: string
  onClick: () => void
  bestScore?: string
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start gap-1 rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary hover:bg-primary/5 w-full"
    >
      <div className="flex items-center justify-between w-full">
        <span className="text-lg font-bold flex items-center gap-2">
          <span>{emoji}</span>
          <span>{title}</span>
        </span>
        {bestScore && (
          <span className="text-xs text-muted-foreground">{bestScore}</span>
        )}
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CrocodileGameClient({ childId, scores }: Props) {
  const [phase, setPhase] = useState<Phase>('select')
  const [mode, setMode] = useState<GameMode>('learn')

  // ---- shared playing state ----
  const [pair, setPair] = useState<Pair>(generatePair)
  const [feedback, setFeedback] = useState<FeedbackState>('idle')
  const [chosen, setChosen] = useState<Operator | null>(null)

  // ---- test mode state ----
  const [testIndex, setTestIndex] = useState(0)
  const [testLog, setTestLog] = useState<TestQuestion[]>([])

  // ---- compete mode state ----
  const [timeLeft, setTimeLeft] = useState(COMPETE_SECONDS)
  const [competeCorrect, setCompeteCorrect] = useState(0)
  const [competeTotal, setCompeteTotal] = useState(0)

  // ---- submitting flag to avoid duplicate POSTs ----
  const [submitting, setSubmitting] = useState(false)
  const submitted = useRef(false)

  // ---- compete timer ----
  useEffect(() => {
    if (phase !== 'playing' || mode !== 'compete') return
    if (timeLeft <= 0) {
      setPhase('results')
      return
    }
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearTimeout(id)
  }, [phase, mode, timeLeft])

  // ---- post score when results screen appears ----
  useEffect(() => {
    if (phase !== 'results') return
    if (mode === 'learn') return
    if (submitted.current) return
    submitted.current = true

    const scoreVal = mode === 'test'
      ? testLog.filter((q) => q.wasCorrect).length
      : competeCorrect
    const totalVal = mode === 'test' ? TEST_TOTAL : competeTotal

    setSubmitting(true)
    fetch('/api/crocodile-numbers/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId, mode, score: scoreVal, total: totalVal }),
    }).finally(() => setSubmitting(false))
  }, [phase, mode, childId, testLog, competeCorrect, competeTotal])

  // ---- answer handler ----
  const handleAnswer = useCallback(
    (op: Operator) => {
      if (feedback !== 'idle') return
      const isCorrect = op === pair.correct
      setChosen(op)
      setFeedback(isCorrect ? 'correct' : 'wrong')

      if (mode === 'learn') {
        // no auto-advance; user hits Next button manually on correct
        if (!isCorrect) {
          // allow retry: reset after brief flash
          setTimeout(() => {
            setFeedback('idle')
            setChosen(null)
          }, 900)
        }
        return
      }

      if (mode === 'test') {
        const entry: TestQuestion = {
          ...pair,
          chosen: op,
          wasCorrect: isCorrect,
        }
        const nextLog = [...testLog, entry]
        setTestLog(nextLog)

        setTimeout(() => {
          setFeedback('idle')
          setChosen(null)
          if (nextLog.length >= TEST_TOTAL) {
            setPhase('results')
          } else {
            setTestIndex((i) => i + 1)
            setPair(generatePair())
          }
        }, 1200)
        return
      }

      if (mode === 'compete') {
        setCompeteTotal((t) => t + 1)
        if (isCorrect) setCompeteCorrect((c) => c + 1)
        // advance immediately
        setTimeout(() => {
          setFeedback('idle')
          setChosen(null)
          setPair(generatePair())
        }, 300)
      }
    },
    [feedback, pair, mode, testLog]
  )

  // ---- learn next handler ----
  function handleLearnNext() {
    setFeedback('idle')
    setChosen(null)
    setPair(generatePair())
  }

  // ---- start a mode ----
  function startMode(m: GameMode) {
    setMode(m)
    setPair(generatePair())
    setFeedback('idle')
    setChosen(null)
    setTestIndex(0)
    setTestLog([])
    setTimeLeft(COMPETE_SECONDS)
    setCompeteCorrect(0)
    setCompeteTotal(0)
    submitted.current = false
    setPhase('playing')
  }

  // ---- restart ----
  function restart() {
    startMode(mode)
  }

  // ---- back to select ----
  function backToSelect() {
    setPhase('select')
    setFeedback('idle')
    setChosen(null)
  }

  // ----------------------------------------------------------------
  // Lookup best scores
  // ----------------------------------------------------------------
  function bestScoreLabel(m: 'test' | 'compete') {
    const row = scores.find((s) => s.mode === m)
    if (!row) return undefined
    return `Best: ${row.best_score}/${row.best_total}`
  }

  // ================================================================
  // RENDER
  // ================================================================

  // ---- Mode selection screen ----
  if (phase === 'select') {
    return (
      <div className="space-y-3">
        <ModeCard
          emoji="📖"
          title="Learn"
          description="No timer, no score. Practice at your own pace."
          onClick={() => startMode('learn')}
        />
        <ModeCard
          emoji="📝"
          title="Test"
          description="15 questions. See how many you get right."
          onClick={() => startMode('test')}
          bestScore={bestScoreLabel('test')}
        />
        <ModeCard
          emoji="⚡"
          title="Compete"
          description="30 seconds. Answer as many as you can!"
          onClick={() => startMode('compete')}
          bestScore={bestScoreLabel('compete')}
        />
      </div>
    )
  }

  // ---- Results screen ----
  if (phase === 'results') {
    if (mode === 'test') {
      const correct = testLog.filter((q) => q.wasCorrect).length
      const pct = Math.round((correct / TEST_TOTAL) * 100)
      return (
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-6 text-center space-y-2">
            <p className="text-4xl font-bold">
              {correct}
              <span className="text-muted-foreground text-2xl">/{TEST_TOTAL}</span>
            </p>
            <p className="text-lg font-semibold">
              {pct === 100 ? 'Perfect!' : pct >= 80 ? 'Great job!' : 'Keep practicing!'}
            </p>
            {submitting && (
              <p className="text-xs text-muted-foreground">Saving score…</p>
            )}
          </div>

          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Q</th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground">Left</th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground">Your answer</th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground">Right</th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {testLog.map((q, i) => (
                  <tr key={i} className={q.wasCorrect ? '' : 'bg-red-50'}>
                    <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2 text-center font-mono font-semibold">{q.left}</td>
                    <td className="px-3 py-2 text-center font-bold text-lg">{q.chosen}</td>
                    <td className="px-3 py-2 text-center font-mono font-semibold">{q.right}</td>
                    <td className="px-3 py-2 text-center">
                      {q.wasCorrect ? (
                        <span className="text-green-600">✓</span>
                      ) : (
                        <span className="text-red-600">✗</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3">
            <button
              onClick={backToSelect}
              className="flex-1 inline-flex items-center justify-center rounded-xl border bg-background h-10 text-sm font-medium hover:bg-muted transition-colors"
            >
              Menu
            </button>
            <button
              onClick={restart}
              className="flex-1 inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground h-10 text-sm font-semibold hover:bg-primary/80 transition-colors"
            >
              Play Again
            </button>
          </div>
        </div>
      )
    }

    if (mode === 'compete') {
      return (
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-6 text-center space-y-2">
            <p className="text-5xl font-bold">
              {competeCorrect}
              <span className="text-muted-foreground text-3xl">/{competeTotal}</span>
            </p>
            <p className="text-lg font-semibold">
              {competeTotal === 0
                ? 'No answers yet!'
                : competeCorrect === competeTotal
                ? 'Perfect accuracy!'
                : `${Math.round((competeCorrect / competeTotal) * 100)}% accuracy`}
            </p>
            <p className="text-sm text-muted-foreground">in {COMPETE_SECONDS} seconds</p>
            {submitting && (
              <p className="text-xs text-muted-foreground">Saving score…</p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={backToSelect}
              className="flex-1 inline-flex items-center justify-center rounded-xl border bg-background h-10 text-sm font-medium hover:bg-muted transition-colors"
            >
              Menu
            </button>
            <button
              onClick={restart}
              className="flex-1 inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground h-10 text-sm font-semibold hover:bg-primary/80 transition-colors"
            >
              Play Again
            </button>
          </div>
        </div>
      )
    }
  }

  // ---- Playing screen ----
  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-3 py-0.5 text-xs font-semibold uppercase tracking-wide">
            {mode === 'learn' ? '📖 Learn' : mode === 'test' ? '📝 Test' : '⚡ Compete'}
          </span>
          {mode === 'test' && (
            <span className="text-sm text-muted-foreground">
              {testIndex + 1} / {TEST_TOTAL}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {mode === 'compete' && (
            <span
              className={`text-2xl font-bold tabular-nums ${
                timeLeft <= 10 ? 'text-red-500' : 'text-foreground'
              }`}
            >
              {timeLeft}s
            </span>
          )}
          <button
            onClick={backToSelect}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          >
            ← Back
          </button>
        </div>
      </div>

      {/* Number display */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center justify-center gap-6 sm:gap-10">
          <span className="text-6xl font-bold tabular-nums w-24 text-center">{pair.left}</span>
          <span className="text-4xl font-bold text-muted-foreground">?</span>
          <span className="text-6xl font-bold tabular-nums w-24 text-center">{pair.right}</span>
        </div>

        {/* Feedback message */}
        <div className="h-8 mt-4 flex items-center justify-center">
          {feedback === 'correct' && (
            <p className="text-green-600 font-semibold text-base">
              ✓ Correct! The croc eats the bigger number.
            </p>
          )}
          {feedback === 'wrong' && mode === 'learn' && (
            <p className="text-red-600 font-semibold text-base">
              ✗ Not quite — try again!
            </p>
          )}
          {feedback === 'wrong' && mode !== 'learn' && (
            <p className="text-red-600 font-semibold text-base">
              ✗ The answer was <strong>{pair.correct}</strong>
            </p>
          )}
        </div>
      </div>

      {/* Operator buttons */}
      <div className="grid grid-cols-3 gap-3">
        {OPERATORS.map((op) => {
          let buttonClass =
            'h-16 text-2xl font-bold rounded-xl border transition-colors min-w-0 w-full '

          if (feedback !== 'idle' && chosen === op) {
            buttonClass +=
              feedback === 'correct'
                ? 'bg-green-500 text-white border-green-500'
                : 'bg-red-500 text-white border-red-500'
          } else if (feedback !== 'idle') {
            buttonClass += 'bg-muted text-muted-foreground border-border opacity-50 cursor-not-allowed'
          } else {
            buttonClass +=
              'bg-primary text-primary-foreground border-primary hover:bg-primary/80 cursor-pointer'
          }

          return (
            <button
              key={op}
              onClick={() => handleAnswer(op)}
              disabled={feedback !== 'idle'}
              className={buttonClass}
            >
              {op}
            </button>
          )
        })}
      </div>

      {/* Learn mode: Next button after correct */}
      {mode === 'learn' && feedback === 'correct' && (
        <button
          onClick={handleLearnNext}
          className="w-full inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground h-12 text-base font-semibold hover:bg-primary/80 transition-colors"
        >
          Next →
        </button>
      )}
    </div>
  )
}
