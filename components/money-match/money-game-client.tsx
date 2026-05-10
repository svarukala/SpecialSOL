'use client'

import { useState, useCallback } from 'react'

// ─── Types ──────────────────────────────────────────────────────────────────

type GameMode = 'identify' | 'count' | 'change'
type Phase = 'menu' | 'playing' | 'results'

interface ScoreRow {
  mode: string
  best_score: number
  rounds_played: number
}

interface Props {
  childId: string
  scores: ScoreRow[]
}

interface Question {
  prompt: string
  coins: CoinType[]
  options: string[]
  correctIndex: number
}

type CoinType = 'penny' | 'nickel' | 'dime' | 'quarter'

// ─── Coin data ───────────────────────────────────────────────────────────────

const COIN_DATA: Record<CoinType, { value: number; label: string; fill: string; r: number }> = {
  penny:   { value: 1,  label: '1¢',  fill: '#b5651d', r: 28 },
  nickel:  { value: 5,  label: '5¢',  fill: '#A8A9AD', r: 24 },
  dime:    { value: 10, label: '10¢', fill: '#A8A9AD', r: 20 },
  quarter: { value: 25, label: '25¢', fill: '#A8A9AD', r: 28 },
}

const COIN_TYPES: CoinType[] = ['penny', 'nickel', 'dime', 'quarter']

// ─── SVG Coin ────────────────────────────────────────────────────────────────

function CoinSvg({ coin, size = 60 }: { coin: CoinType; size?: number }) {
  const d = COIN_DATA[coin]
  const scale = size / 60
  const cx = 30
  const cy = 30
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" aria-label={coin}>
      <circle cx={cx} cy={cy} r={d.r} fill={d.fill} stroke="#888" strokeWidth="2" />
      <text
        x={cx}
        y={cy + 4}
        textAnchor="middle"
        fontSize={11 / scale}
        fontWeight="bold"
        fill="white"
        style={{ fontSize: 11 }}
      >
        {d.label}
      </text>
    </svg>
  )
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function formatCents(cents: number): string {
  if (cents < 100) return `${cents}¢`
  const dollars = Math.floor(cents / 100)
  const rem = cents % 100
  if (rem === 0) return `$${dollars}.00`
  return `$${dollars}.${rem.toString().padStart(2, '0')}`
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ─── Question generators ─────────────────────────────────────────────────────

function makeIdentifyQuestion(): Question {
  const coin = pickRandom(COIN_TYPES)
  const correct = COIN_DATA[coin].value
  const allValues = COIN_TYPES.map((c) => COIN_DATA[c].value)
  const wrongValues = allValues.filter((v) => v !== correct)
  const options = shuffle([correct, ...wrongValues]).map(formatCents)
  const correctIndex = options.indexOf(formatCents(correct))
  return {
    prompt: 'What coin is this?',
    coins: [coin],
    options,
    correctIndex,
  }
}

function makePlausibleWrongs(correct: number, allValues: number[]): number[] {
  const wrongs = new Set<number>()
  const deltas = [-allValues[0], -allValues[1], allValues[0], allValues[1], allValues[2], -allValues[2]]
  for (const d of shuffle(deltas)) {
    const candidate = correct + d
    if (candidate > 0 && candidate !== correct && !wrongs.has(candidate)) {
      wrongs.add(candidate)
      if (wrongs.size === 3) break
    }
  }
  // fallback: just add/subtract 1¢ increments
  let delta = 1
  while (wrongs.size < 3) {
    const c1 = correct + delta
    const c2 = correct - delta
    if (c1 > 0 && c1 !== correct && !wrongs.has(c1)) wrongs.add(c1)
    if (wrongs.size < 3 && c2 > 0 && c2 !== correct && !wrongs.has(c2)) wrongs.add(c2)
    delta++
  }
  return Array.from(wrongs).slice(0, 3)
}

function makeCountQuestion(): Question {
  const coinTypes = COIN_TYPES
  const count = Math.floor(Math.random() * 4) + 2 // 2–5
  const coins: CoinType[] = Array.from({ length: count }, () => pickRandom(coinTypes))
  const correct = coins.reduce((s, c) => s + COIN_DATA[c].value, 0)
  const coinValues = coinTypes.map((c) => COIN_DATA[c].value)
  const wrongs = makePlausibleWrongs(correct, coinValues)
  const options = shuffle([correct, ...wrongs]).map(formatCents)
  const correctIndex = options.indexOf(formatCents(correct))
  return {
    prompt: 'How much money is shown?',
    coins,
    options,
    correctIndex,
  }
}

function makeChangeQuestion(): Question {
  // cost from 25¢ to 95¢ in 5¢ increments
  const costs = Array.from({ length: 15 }, (_, i) => 25 + i * 5)
  const cost = pickRandom(costs)
  const correct = 100 - cost
  const wrongs = makePlausibleWrongs(correct, [5, 10, 25])
  const options = shuffle([correct, ...wrongs]).map(formatCents)
  const correctIndex = options.indexOf(formatCents(correct))
  return {
    prompt: `You paid $1.00. The item costs ${formatCents(cost)}. How much change do you get?`,
    coins: [],
    options,
    correctIndex,
  }
}

function generateQuestions(mode: GameMode, count = 10): Question[] {
  const gen = mode === 'identify' ? makeIdentifyQuestion
    : mode === 'count' ? makeCountQuestion
    : makeChangeQuestion
  return Array.from({ length: count }, gen)
}

// ─── Mode picker card ────────────────────────────────────────────────────────

const MODE_META: Record<GameMode, { emoji: string; title: string; desc: string }> = {
  identify: { emoji: '🪙', title: 'Identify', desc: 'Name each coin' },
  count:    { emoji: '🔢', title: 'Count It', desc: 'Add up coins shown' },
  change:   { emoji: '💵', title: 'Make Change', desc: 'Calculate change from $1' },
}

function ModePicker({
  scores,
  onSelect,
}: {
  scores: ScoreRow[]
  onSelect: (mode: GameMode) => void
}) {
  const scoreMap = Object.fromEntries(scores.map((s) => [s.mode, s]))

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-lg">Choose a Mode</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {(Object.keys(MODE_META) as GameMode[]).map((mode) => {
          const meta = MODE_META[mode]
          const row = scoreMap[mode]
          return (
            <button
              key={mode}
              onClick={() => onSelect(mode)}
              className="rounded-xl border bg-card p-5 text-left space-y-2 hover:border-primary hover:bg-primary/5 transition-colors"
            >
              <div className="text-3xl">{meta.emoji}</div>
              <div className="font-semibold">{meta.title}</div>
              <div className="text-sm text-muted-foreground">{meta.desc}</div>
              {row ? (
                <div className="text-xs text-muted-foreground pt-1 border-t">
                  Best: {row.best_score}/10 · {row.rounds_played} round{row.rounds_played !== 1 ? 's' : ''}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground pt-1 border-t">Not played yet</div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Game screen ─────────────────────────────────────────────────────────────

function GameScreen({
  mode,
  childId,
  onFinish,
}: {
  mode: GameMode
  childId: string
  onFinish: (score: number) => void
}) {
  const TOTAL = 10
  const [questions] = useState<Question[]>(() => generateQuestions(mode, TOTAL))
  const [currentIndex, setCurrentIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [phase, setPhase] = useState<'question' | 'feedback'>('question')
  const [saving, setSaving] = useState(false)
  const [savedScore, setSavedScore] = useState<number | null>(null)

  const question = questions[currentIndex]

  const handleAnswer = useCallback(
    (idx: number) => {
      if (phase !== 'question') return
      setSelected(idx)
      setPhase('feedback')
      const isCorrect = idx === question.correctIndex
      const newScore = isCorrect ? score + 1 : score

      setTimeout(async () => {
        if (currentIndex + 1 >= TOTAL) {
          // save score
          setSaving(true)
          try {
            await fetch('/api/money-match/score', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ childId, mode, score: newScore, total: TOTAL }),
            })
          } catch {
            // best-effort
          }
          setSaving(false)
          setSavedScore(newScore)
          onFinish(newScore)
        } else {
          setCurrentIndex((i) => i + 1)
          setSelected(null)
          setPhase('question')
          if (isCorrect) setScore(newScore)
        }
      }, 1100)

      if (isCorrect) setScore(newScore)
    },
    [phase, question, score, currentIndex, childId, mode, onFinish]
  )

  void saving
  void savedScore

  const progressPct = ((currentIndex + (phase === 'feedback' ? 1 : 0)) / TOTAL) * 100

  return (
    <div className="space-y-5">
      {/* Progress */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Question {currentIndex + 1} of {TOTAL}</span>
          <span>{score} correct</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Prompt card */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <p className="font-semibold text-base">{question.prompt}</p>

        {/* Coins display */}
        {question.coins.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            {question.coins.map((coin, i) => (
              <CoinSvg key={i} coin={coin} size={60} />
            ))}
          </div>
        )}
      </div>

      {/* Answer buttons — 2×2 grid */}
      <div className="grid grid-cols-2 gap-3">
        {question.options.map((opt, idx) => {
          let cls =
            'h-14 text-lg font-semibold rounded-xl border transition-colors '
          if (phase === 'feedback') {
            if (idx === question.correctIndex) {
              cls += 'border-green-400 bg-green-100 text-green-800'
            } else if (idx === selected && idx !== question.correctIndex) {
              cls += 'border-red-400 bg-red-100 text-red-800'
            } else {
              cls += 'border-border bg-muted/30 text-muted-foreground'
            }
          } else {
            cls +=
              'border-border bg-background hover:border-primary hover:bg-primary/5 cursor-pointer'
          }

          return (
            <button
              key={idx}
              className={cls}
              onClick={() => handleAnswer(idx)}
              disabled={phase === 'feedback'}
            >
              {opt}
              {phase === 'feedback' && idx === question.correctIndex && (
                <span className="ml-1.5">✓</span>
              )}
              {phase === 'feedback' &&
                idx === selected &&
                idx !== question.correctIndex && (
                  <span className="ml-1.5">✗</span>
                )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Results screen ──────────────────────────────────────────────────────────

function ResultsScreen({
  score,
  mode,
  onPlayAgain,
  onChangeMode,
}: {
  score: number
  mode: GameMode
  onPlayAgain: () => void
  onChangeMode: () => void
}) {
  const TOTAL = 10
  const stars = score >= 8 ? 3 : score >= 4 ? 2 : 1
  const starLabel = '⭐'.repeat(stars)
  const headline =
    stars === 3 ? 'Amazing!' : stars === 2 ? 'Good job!' : 'Keep practicing!'

  return (
    <div className="space-y-6 text-center">
      <div className="rounded-xl border bg-card p-8 space-y-4">
        <div className="text-5xl">{starLabel}</div>
        <h2 className="text-2xl font-bold">{headline}</h2>
        <p className="text-5xl font-bold">
          {score}
          <span className="text-muted-foreground text-3xl">/{TOTAL}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          Mode: {MODE_META[mode].emoji} {MODE_META[mode].title}
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onPlayAgain}
          className="flex-1 inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground h-11 text-sm font-semibold hover:bg-primary/80 transition-colors"
        >
          Play Again
        </button>
        <button
          onClick={onChangeMode}
          className="flex-1 inline-flex items-center justify-center rounded-xl border h-11 text-sm font-semibold hover:bg-muted transition-colors"
        >
          Change Mode
        </button>
      </div>
    </div>
  )
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function MoneyGameClient({ childId, scores }: Props) {
  const [phase, setPhase] = useState<Phase>('menu')
  const [mode, setMode] = useState<GameMode | null>(null)
  const [lastScore, setLastScore] = useState<number>(0)
  const [localScores, setLocalScores] = useState<ScoreRow[]>(scores)

  function handleSelectMode(m: GameMode) {
    setMode(m)
    setPhase('playing')
  }

  function handleFinish(score: number) {
    setLastScore(score)
    // optimistically update local scores
    setLocalScores((prev) => {
      const existing = prev.find((s) => s.mode === mode)
      if (!existing) {
        return [...prev, { mode: mode!, best_score: score, rounds_played: 1 }]
      }
      return prev.map((s) =>
        s.mode === mode
          ? {
              ...s,
              best_score: Math.max(s.best_score, score),
              rounds_played: s.rounds_played + 1,
            }
          : s
      )
    })
    setPhase('results')
  }

  function handlePlayAgain() {
    setPhase('playing')
  }

  function handleChangeMode() {
    setMode(null)
    setPhase('menu')
  }

  if (phase === 'menu') {
    return <ModePicker scores={localScores} onSelect={handleSelectMode} />
  }

  if (phase === 'playing' && mode) {
    return (
      <GameScreen
        key={`${mode}-${Date.now()}`}
        mode={mode}
        childId={childId}
        onFinish={handleFinish}
      />
    )
  }

  if (phase === 'results' && mode) {
    return (
      <ResultsScreen
        score={lastScore}
        mode={mode}
        onPlayAgain={handlePlayAgain}
        onChangeMode={handleChangeMode}
      />
    )
  }

  return null
}
