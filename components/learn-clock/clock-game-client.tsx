'use client'

import { useState, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Difficulty = 'easy' | 'medium' | 'hard'

interface ScoreRow {
  difficulty: string
  best_score: number
  rounds_played: number
}

interface Props {
  childId: string
  scores: ScoreRow[]
}

interface ClockTime {
  hour: number   // 1–12
  minute: number // 0–59
}

type GamePhase = 'pick-difficulty' | 'playing' | 'results'

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_QUESTIONS = 10

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(t: ClockTime): string {
  const h = t.hour
  const m = t.minute.toString().padStart(2, '0')
  return `${h}:${m}`
}

function timesEqual(a: ClockTime, b: ClockTime): boolean {
  return a.hour === b.hour && a.minute === b.minute
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateCorrectTime(difficulty: Difficulty): ClockTime {
  const hour = randomInt(1, 12)
  let minute: number
  if (difficulty === 'easy' || difficulty === 'medium') {
    minute = randomInt(0, 11) * 5
  } else {
    minute = randomInt(0, 59)
  }
  return { hour, minute }
}

function addMinutes(t: ClockTime, delta: number): ClockTime {
  const totalMins = (t.hour % 12) * 60 + t.minute + delta
  const normalised = ((totalMins % 720) + 720) % 720
  const h = Math.floor(normalised / 60)
  const m = normalised % 60
  return { hour: h === 0 ? 12 : h, minute: m }
}

/** Snap a minute to the nearest 5-minute interval */
function snapTo5(m: number): number {
  return Math.round(m / 5) * 5 % 60
}

function generateWrongAnswers(correct: ClockTime, difficulty: Difficulty): ClockTime[] {
  const candidates: ClockTime[] = []
  const minuteStep = difficulty === 'hard' ? 15 : 5

  const deltas = [-minuteStep * 2, -minuteStep, minuteStep, minuteStep * 2, -60, 60, -120, 120]

  for (const delta of deltas) {
    if (candidates.length >= 6) break
    let candidate = addMinutes(correct, delta)
    if (difficulty !== 'hard') {
      candidate = { ...candidate, minute: snapTo5(candidate.minute) }
    }
    if (!timesEqual(candidate, correct) && !candidates.some((c) => timesEqual(c, candidate))) {
      candidates.push(candidate)
    }
  }

  // Fallback: vary hour
  for (let hDelta = 1; candidates.length < 6; hDelta++) {
    const hourVariant: ClockTime = {
      hour: ((correct.hour - 1 + hDelta) % 12) + 1,
      minute: correct.minute,
    }
    if (!timesEqual(hourVariant, correct) && !candidates.some((c) => timesEqual(c, hourVariant))) {
      candidates.push(hourVariant)
    }
    if (hDelta > 12) break
  }

  return candidates.slice(0, 3)
}

function buildOptions(correct: ClockTime, difficulty: Difficulty): ClockTime[] {
  const wrongs = generateWrongAnswers(correct, difficulty)
  const all = [correct, ...wrongs]
  // Fisher-Yates shuffle
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[all[i], all[j]] = [all[j], all[i]]
  }
  return all
}

function starsFor(score: number): number {
  if (score >= 8) return 3
  if (score >= 4) return 2
  return 1
}

// ─── SVG Analog Clock ─────────────────────────────────────────────────────────

interface AnalogClockProps {
  time: ClockTime
  difficulty: Difficulty
}

function AnalogClock({ time, difficulty }: AnalogClockProps) {
  const { hour, minute } = time
  const hourAngle = (hour % 12) * 30 + minute * 0.5
  const minuteAngle = minute * 6

  const showAllNumbers = difficulty === 'easy'
  const showQuarterNumbers = difficulty === 'medium'

  // Numbers around the clock face
  const numbers = Array.from({ length: 12 }, (_, i) => i + 1)

  return (
    <svg
      viewBox="0 0 200 200"
      className="w-48 h-48 sm:w-56 sm:h-56 mx-auto drop-shadow-md"
      aria-label={`Clock showing ${formatTime(time)}`}
    >
      {/* Clock face */}
      <circle cx="100" cy="100" r="96" fill="white" stroke="#1e293b" strokeWidth="4" />

      {/* Tick marks */}
      {numbers.map((n) => {
        const angleDeg = n * 30
        const angleRad = (angleDeg - 90) * (Math.PI / 180)
        const isQuarter = n % 3 === 0
        const innerR = isQuarter ? 80 : 84
        const outerR = 92
        const x1 = 100 + innerR * Math.cos(angleRad)
        const y1 = 100 + innerR * Math.sin(angleRad)
        const x2 = 100 + outerR * Math.cos(angleRad)
        const y2 = 100 + outerR * Math.sin(angleRad)
        return (
          <line
            key={n}
            x1={x1} y1={y1}
            x2={x2} y2={y2}
            stroke="#1e293b"
            strokeWidth={isQuarter ? 3 : 1.5}
            strokeLinecap="round"
          />
        )
      })}

      {/* Clock numbers */}
      {numbers.map((n) => {
        const showNumber =
          showAllNumbers ||
          (showQuarterNumbers && n % 3 === 0) ||
          (!showAllNumbers && !showQuarterNumbers && n === 12)
        if (!showNumber) return null
        const angleDeg = n * 30
        const angleRad = (angleDeg - 90) * (Math.PI / 180)
        const r = 72
        const x = 100 + r * Math.sin(angleDeg * (Math.PI / 180))
        const y = 100 - r * Math.cos(angleDeg * (Math.PI / 180))
        return (
          <text
            key={n}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={n % 3 === 0 ? '14' : '11'}
            fontWeight={n % 3 === 0 ? '700' : '500'}
            fill="#1e293b"
          >
            {n}
          </text>
        )
      })}

      {/* Hour hand */}
      <line
        x1="100" y1="100"
        x2="100" y2="45"
        stroke="#1e293b"
        strokeWidth="6"
        strokeLinecap="round"
        transform={`rotate(${hourAngle} 100 100)`}
      />

      {/* Minute hand */}
      <line
        x1="100" y1="100"
        x2="100" y2="25"
        stroke="#475569"
        strokeWidth="4"
        strokeLinecap="round"
        transform={`rotate(${minuteAngle} 100 100)`}
      />

      {/* Center dot */}
      <circle cx="100" cy="100" r="5" fill="#1e293b" />
    </svg>
  )
}

// ─── Difficulty Picker ────────────────────────────────────────────────────────

interface DifficultyPickerProps {
  onSelect: (d: Difficulty) => void
  scores: ScoreRow[]
}

const DIFFICULTY_INFO: Record<Difficulty, { label: string; desc: string }> = {
  easy: { label: 'Easy', desc: '5-min intervals, full numbers' },
  medium: { label: 'Medium', desc: '5-min intervals, fewer numbers' },
  hard: { label: 'Hard', desc: 'Any minute, minimal numbers' },
}

function DifficultyPicker({ onSelect, scores }: DifficultyPickerProps) {
  const scoreMap = Object.fromEntries(scores.map((s) => [s.difficulty, s]))

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Choose a Difficulty</h2>
      <div className="flex gap-3 flex-col sm:flex-row">
        {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => {
          const info = DIFFICULTY_INFO[d]
          const row = scoreMap[d]
          return (
            <button
              key={d}
              onClick={() => onSelect(d)}
              className="flex-1 rounded-xl border border-border bg-card hover:border-primary hover:bg-primary/5 transition-colors p-4 text-left space-y-1"
            >
              <div className="font-semibold text-base">{info.label}</div>
              <div className="text-xs text-muted-foreground">{info.desc}</div>
              {row && (
                <div className="text-xs text-primary font-medium pt-1">
                  Best: {row.best_score}/{TOTAL_QUESTIONS} · {row.rounds_played} round{row.rounds_played !== 1 ? 's' : ''}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Results Card ─────────────────────────────────────────────────────────────

interface ResultsCardProps {
  score: number
  onPlayAgain: () => void
  onChangeDifficulty: () => void
}

function ResultsCard({ score, onPlayAgain, onChangeDifficulty }: ResultsCardProps) {
  const stars = starsFor(score)
  const starDisplay = '⭐'.repeat(stars) + '☆'.repeat(3 - stars)
  const message =
    score === TOTAL_QUESTIONS
      ? 'Perfect score!'
      : score >= 8
      ? 'Great job!'
      : score >= 4
      ? 'Keep practicing!'
      : 'Nice try — let\'s try again!'

  return (
    <div className="rounded-xl border bg-card p-8 flex flex-col items-center gap-4 text-center">
      <div className="text-4xl">{starDisplay}</div>
      <p className="text-4xl font-bold">
        {score}<span className="text-muted-foreground text-2xl">/{TOTAL_QUESTIONS}</span>
      </p>
      <p className="text-muted-foreground">{message}</p>
      <div className="flex gap-3 w-full max-w-xs pt-2">
        <button
          onClick={onChangeDifficulty}
          className="flex-1 rounded-xl border border-border bg-background hover:bg-muted transition-colors h-10 text-sm font-medium"
        >
          Change Difficulty
        </button>
        <button
          onClick={onPlayAgain}
          className="flex-1 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors h-10 text-sm font-semibold"
        >
          Play Again
        </button>
      </div>
    </div>
  )
}

// ─── Main Game Component ──────────────────────────────────────────────────────

export function ClockGameClient({ childId, scores }: Props) {
  const [phase, setPhase] = useState<GamePhase>('pick-difficulty')
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [correctTime, setCorrectTime] = useState<ClockTime>({ hour: 12, minute: 0 })
  const [options, setOptions] = useState<ClockTime[]>([])
  const [selectedOption, setSelectedOption] = useState<ClockTime | null>(null)
  const [showNext, setShowNext] = useState(false)
  const [score, setScore] = useState(0)
  const [finalScore, setFinalScore] = useState(0)
  const [saving, setSaving] = useState(false)

  const startGame = useCallback((d: Difficulty) => {
    setDifficulty(d)
    setQuestionIndex(0)
    setScore(0)
    setSelectedOption(null)
    setShowNext(false)
    const time = generateCorrectTime(d)
    setCorrectTime(time)
    setOptions(buildOptions(time, d))
    setPhase('playing')
  }, [])

  const handleAnswer = useCallback(
    (chosen: ClockTime) => {
      if (selectedOption !== null) return // already answered
      setSelectedOption(chosen)
      const isCorrect = timesEqual(chosen, correctTime)
      const newScore = isCorrect ? score + 1 : score

      setTimeout(() => {
        setShowNext(true)
      }, 1000)

      if (questionIndex + 1 >= TOTAL_QUESTIONS) {
        // Last question — after delay show results
        setTimeout(async () => {
          setFinalScore(newScore)
          setPhase('results')
          setSaving(true)
          try {
            await fetch('/api/learn-clock/score', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                childId,
                difficulty,
                score: newScore,
                total: TOTAL_QUESTIONS,
              }),
            })
          } finally {
            setSaving(false)
          }
        }, 2000)
        if (isCorrect) setScore(newScore)
      } else {
        if (isCorrect) setScore(newScore)
      }
    },
    [selectedOption, correctTime, score, questionIndex, childId, difficulty]
  )

  const nextQuestion = useCallback(() => {
    const nextIndex = questionIndex + 1
    setQuestionIndex(nextIndex)
    setSelectedOption(null)
    setShowNext(false)
    const time = generateCorrectTime(difficulty)
    setCorrectTime(time)
    setOptions(buildOptions(time, difficulty))
  }, [questionIndex, difficulty])

  // ── Render: pick difficulty ──
  if (phase === 'pick-difficulty') {
    return <DifficultyPicker onSelect={startGame} scores={scores} />
  }

  // ── Render: results ──
  if (phase === 'results') {
    return (
      <div className="space-y-4">
        {saving && (
          <p className="text-xs text-muted-foreground text-center">Saving score…</p>
        )}
        <ResultsCard
          score={finalScore}
          onPlayAgain={() => startGame(difficulty)}
          onChangeDifficulty={() => setPhase('pick-difficulty')}
        />
      </div>
    )
  }

  // ── Render: playing ──
  const isCorrectSelected = selectedOption !== null && timesEqual(selectedOption, correctTime)

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Question {questionIndex + 1} / {TOTAL_QUESTIONS}</span>
        <span>{score} correct</span>
      </div>

      {/* Clock */}
      <div className="rounded-xl border bg-card p-6 flex flex-col items-center gap-2">
        <AnalogClock time={correctTime} difficulty={difficulty} />
      </div>

      {/* Answer buttons — 2x2 grid */}
      <div className="grid grid-cols-2 gap-3">
        {options.map((opt, i) => {
          const isSelected = selectedOption !== null && timesEqual(opt, selectedOption)
          const isRight = timesEqual(opt, correctTime)

          let buttonClass =
            'h-14 text-lg font-semibold rounded-xl border transition-colors '

          if (selectedOption === null) {
            buttonClass += 'bg-background border-border hover:bg-muted hover:border-primary'
          } else if (isRight) {
            buttonClass += 'bg-green-100 border-green-500 text-green-800'
          } else if (isSelected && !isRight) {
            buttonClass += 'bg-red-100 border-red-500 text-red-800'
          } else {
            buttonClass += 'bg-background border-border opacity-60'
          }

          return (
            <button
              key={i}
              onClick={() => handleAnswer(opt)}
              disabled={selectedOption !== null}
              className={buttonClass}
            >
              {formatTime(opt)}
            </button>
          )
        })}
      </div>

      {/* Feedback message */}
      {selectedOption !== null && (
        <p className={`text-center text-sm font-medium ${isCorrectSelected ? 'text-green-600' : 'text-red-600'}`}>
          {isCorrectSelected ? '✓ Correct!' : `✗ The answer was ${formatTime(correctTime)}`}
        </p>
      )}

      {/* Next button */}
      {showNext && questionIndex + 1 < TOTAL_QUESTIONS && (
        <div className="flex justify-center">
          <button
            onClick={nextQuestion}
            className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors h-10 px-8 text-sm font-semibold"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
