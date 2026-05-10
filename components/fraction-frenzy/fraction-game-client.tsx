'use client'

import { useState, useCallback, useRef, type ReactElement } from 'react'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type Level = 'name' | 'compare' | 'equivalent'

interface ScoreRow {
  level: string
  best_score: number
  rounds_played: number
}

interface Props {
  childId: string
  scores: ScoreRow[]
}

interface Fraction {
  n: number
  d: number
}

type ShapeKind = 'circle' | 'rect'

interface NameQuestion {
  kind: 'name'
  fraction: Fraction
  shape: ShapeKind
  options: Fraction[]
  correctIndex: number
}

interface CompareQuestion {
  kind: 'compare'
  fractionA: Fraction
  fractionB: Fraction
  correctIndex: 0 | 1 // index into [fractionA, fractionB]
}

interface EquivQuestion {
  kind: 'equivalent'
  fraction: Fraction
  shape: ShapeKind
  options: Fraction[]
  correctIndex: number
}

type Question = NameQuestion | CompareQuestion | EquivQuestion

// ─────────────────────────────────────────────
// SVG Fraction Visuals
// ─────────────────────────────────────────────

function CircleFraction({ n, d, size = 160 }: { n: number; d: number; size?: number }) {
  const cx = 100
  const cy = 100
  const r = 80

  const slices: ReactElement[] = []

  for (let i = 0; i < d; i++) {
    const startDeg = i * (360 / d)
    const endDeg = (i + 1) * (360 / d)
    const startRad = (startDeg * Math.PI) / 180 - Math.PI / 2
    const endRad = (endDeg * Math.PI) / 180 - Math.PI / 2
    const sliceAngle = 360 / d
    const largeArc = sliceAngle > 180 ? 1 : 0

    const x1 = cx + r * Math.cos(startRad)
    const y1 = cy + r * Math.sin(startRad)
    const x2 = cx + r * Math.cos(endRad)
    const y2 = cy + r * Math.sin(endRad)

    const shaded = i < n
    const fill = shaded ? 'hsl(221 83% 53%)' : '#e5e7eb'

    if (d === 1) {
      slices.push(
        <circle key={i} cx={cx} cy={cy} r={r} fill={fill} stroke="#9ca3af" strokeWidth="1.5" />
      )
    } else {
      const path = `M ${cx} ${cy} L ${x1.toFixed(3)} ${y1.toFixed(3)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(3)} ${y2.toFixed(3)} Z`
      slices.push(
        <path key={i} d={path} fill={fill} stroke="#9ca3af" strokeWidth="1.5" />
      )
    }
  }

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      aria-label={`${n}/${d} shaded circle`}
    >
      {slices}
    </svg>
  )
}

function RectFraction({ n, d, width = 240, height = 96 }: { n: number; d: number; width?: number; height?: number }) {
  const sectionWidth = 200 / d
  const rects: ReactElement[] = []

  for (let i = 0; i < d; i++) {
    const shaded = i < n
    const fill = shaded ? 'hsl(221 83% 53%)' : '#e5e7eb'
    rects.push(
      <rect
        key={i}
        x={i * sectionWidth}
        y={0}
        width={sectionWidth}
        height={80}
        fill={fill}
        stroke="#9ca3af"
        strokeWidth="1.5"
      />
    )
  }

  return (
    <svg
      viewBox="0 0 200 80"
      width={width}
      height={height}
      aria-label={`${n}/${d} shaded rectangle`}
    >
      {rects}
    </svg>
  )
}

function FractionSVG({ n, d, shape, size }: { n: number; d: number; shape: ShapeKind; size?: number }) {
  if (shape === 'circle') return <CircleFraction n={n} d={d} size={size ?? 160} />
  return <RectFraction n={n} d={d} width={size ? size * 1.5 : 240} height={size ? size * 0.6 : 96} />
}

function FractionText({ n, d, large }: { n: number; d: number; large?: boolean }) {
  const cls = large ? 'text-5xl font-bold' : 'text-2xl font-semibold'
  return (
    <span className={`inline-flex flex-col items-center leading-none ${cls}`}>
      <span>{n}</span>
      <span className="border-t-2 border-current w-full mt-0.5 mb-0.5" />
      <span>{d}</span>
    </span>
  )
}

// ─────────────────────────────────────────────
// Question Generators
// ─────────────────────────────────────────────

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomShape(): ShapeKind {
  return Math.random() < 0.5 ? 'circle' : 'rect'
}

function fractionEq(a: Fraction, b: Fraction) {
  return a.n * b.d === b.n * a.d
}

function fractionVal(f: Fraction) {
  return f.n / f.d
}

function shuffleArray<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

function generateNameQuestion(): NameQuestion {
  const denominators = [2, 3, 4]
  const d = denominators[randomInt(0, denominators.length - 1)]
  const n = randomInt(1, d - 1)
  const correct: Fraction = { n, d }

  // Generate 3 wrong options
  const wrongSet: Fraction[] = []
  const candidates: Fraction[] = []

  // Same denominator, different numerators
  for (let wn = 1; wn < d; wn++) {
    if (wn !== n) candidates.push({ n: wn, d })
  }
  // Different denominators, same numerator
  for (const wd of denominators) {
    if (wd !== d) {
      for (let wn = 1; wn < wd; wn++) {
        if (!fractionEq({ n: wn, d: wd }, correct)) {
          candidates.push({ n: wn, d: wd })
        }
      }
    }
  }

  const shuffledCandidates = shuffleArray(candidates)
  for (const c of shuffledCandidates) {
    if (wrongSet.length >= 3) break
    // Avoid duplicates
    if (!wrongSet.some((w) => fractionEq(w, c))) wrongSet.push(c)
  }

  // Pad if needed
  while (wrongSet.length < 3) {
    wrongSet.push({ n: 1, d: wrongSet.length + 5 })
  }

  const allOptions = shuffleArray([correct, ...wrongSet.slice(0, 3)])
  const correctIndex = allOptions.findIndex((o) => fractionEq(o, correct))

  return { kind: 'name', fraction: correct, shape: randomShape(), options: allOptions, correctIndex }
}

const COMPARE_POOL: Fraction[] = [
  { n: 1, d: 2 }, { n: 1, d: 3 }, { n: 1, d: 4 },
  { n: 2, d: 3 }, { n: 3, d: 4 }, { n: 2, d: 4 },
  { n: 1, d: 6 }, { n: 5, d: 6 }, { n: 3, d: 8 }, { n: 5, d: 8 },
]

function generateCompareQuestion(): CompareQuestion {
  // Pick pairs where difference is meaningful (> 0.1)
  let attempts = 0
  while (attempts < 100) {
    attempts++
    const a = COMPARE_POOL[randomInt(0, COMPARE_POOL.length - 1)]
    const b = COMPARE_POOL[randomInt(0, COMPARE_POOL.length - 1)]
    if (fractionEq(a, b)) continue
    const diff = Math.abs(fractionVal(a) - fractionVal(b))
    if (diff < 0.1) continue

    const correctIndex: 0 | 1 = fractionVal(a) > fractionVal(b) ? 0 : 1
    return { kind: 'compare', fractionA: a, fractionB: b, correctIndex }
  }
  // Fallback
  return { kind: 'compare', fractionA: { n: 3, d: 4 }, fractionB: { n: 1, d: 4 }, correctIndex: 0 }
}

const EQUIV_PAIRS: Array<[Fraction, Fraction[]]> = [
  [{ n: 1, d: 2 }, [{ n: 2, d: 4 }, { n: 3, d: 6 }]],
  [{ n: 1, d: 3 }, [{ n: 2, d: 6 }]],
  [{ n: 2, d: 4 }, [{ n: 1, d: 2 }, { n: 3, d: 6 }]],
  [{ n: 2, d: 3 }, [{ n: 4, d: 6 }]],
  [{ n: 3, d: 4 }, [{ n: 6, d: 8 }]],
]

const WRONG_POOL: Fraction[] = [
  { n: 1, d: 3 }, { n: 1, d: 4 }, { n: 2, d: 5 }, { n: 3, d: 5 },
  { n: 1, d: 6 }, { n: 5, d: 6 }, { n: 3, d: 8 }, { n: 5, d: 8 },
  { n: 2, d: 7 }, { n: 3, d: 7 },
]

function generateEquivQuestion(): EquivQuestion {
  const pair = EQUIV_PAIRS[randomInt(0, EQUIV_PAIRS.length - 1)]
  const shown = pair[0]
  const equivList = pair[1]
  const correct = equivList[randomInt(0, equivList.length - 1)]

  // 3 wrong options that are NOT equivalent
  const wrongCandidates = shuffleArray(
    WRONG_POOL.filter((w) => !fractionEq(w, shown) && !fractionEq(w, correct))
  )
  const wrongs = wrongCandidates.slice(0, 3)
  while (wrongs.length < 3) wrongs.push({ n: wrongs.length + 2, d: 9 })

  const allOptions = shuffleArray([correct, ...wrongs])
  const correctIndex = allOptions.findIndex((o) => fractionEq(o, correct))

  return { kind: 'equivalent', fraction: shown, shape: randomShape(), options: allOptions, correctIndex }
}

function generateQuestion(level: Level): Question {
  if (level === 'name') return generateNameQuestion()
  if (level === 'compare') return generateCompareQuestion()
  return generateEquivQuestion()
}

function generateRound(level: Level, count = 10): Question[] {
  return Array.from({ length: count }, () => generateQuestion(level))
}

// ─────────────────────────────────────────────
// Stars helper
// ─────────────────────────────────────────────
function starsForScore(score: number, total: number): number {
  const pct = score / total
  if (pct >= 0.9) return 3
  if (pct >= 0.6) return 2
  return 1
}

// ─────────────────────────────────────────────
// Level Picker
// ─────────────────────────────────────────────

const LEVEL_META: Record<Level, { emoji: string; name: string; description: string }> = {
  name: { emoji: '🍕', name: 'Name It', description: 'Identify the fraction shown by a shape' },
  compare: { emoji: '⚖️', name: 'Compare', description: 'Pick the larger of two fractions' },
  equivalent: { emoji: '🔁', name: 'Equivalent', description: 'Find an equal fraction' },
}

function LevelPicker({
  scores,
  onSelect,
}: {
  scores: ScoreRow[]
  onSelect: (level: Level) => void
}) {
  const levels: Level[] = ['name', 'compare', 'equivalent']
  const scoreMap = Object.fromEntries(scores.map((s) => [s.level, s]))

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {levels.map((level) => {
        const meta = LEVEL_META[level]
        const row = scoreMap[level]
        return (
          <button
            key={level}
            onClick={() => onSelect(level)}
            className="rounded-xl border bg-card text-left p-5 space-y-2 hover:border-primary hover:bg-primary/5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <div className="text-3xl">{meta.emoji}</div>
            <div className="font-semibold text-base">{meta.name}</div>
            <div className="text-xs text-muted-foreground leading-snug">{meta.description}</div>
            {row ? (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5 font-medium">
                  Best: {row.best_score}/10
                </span>
                <span className="text-xs text-muted-foreground">{row.rounds_played} plays</span>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground pt-1">Not played yet</div>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────
// Results Screen
// ─────────────────────────────────────────────

function ResultsScreen({
  score,
  total,
  level,
  saved,
  onPlayAgain,
  onChangeLevel,
}: {
  score: number
  total: number
  level: Level
  saved: boolean
  onPlayAgain: () => void
  onChangeLevel: () => void
}) {
  const stars = starsForScore(score, total)
  const pct = Math.round((score / total) * 100)
  const meta = LEVEL_META[level]

  return (
    <div className="rounded-xl border bg-card p-8 space-y-6 text-center max-w-md mx-auto">
      <div className="text-5xl">{stars === 3 ? '🏆' : stars === 2 ? '🎉' : '💪'}</div>
      <h2 className="text-2xl font-bold">
        {score}/{total} correct — {pct}%
      </h2>
      <div className="flex justify-center gap-1 text-3xl">
        {Array.from({ length: 3 }, (_, i) => (
          <span key={i} className={i < stars ? 'opacity-100' : 'opacity-20'}>⭐</span>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        {stars === 3 ? 'Perfect! You nailed every fraction!' : stars === 2 ? 'Great job — keep practising!' : 'Nice try — fractions take practice!'}
      </p>
      {saved && (
        <p className="text-xs text-muted-foreground">Score saved ✓</p>
      )}
      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        <button
          onClick={onPlayAgain}
          className="inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground h-11 px-6 text-sm font-semibold hover:bg-primary/80 transition-colors"
        >
          {meta.emoji} Play Again ({meta.name})
        </button>
        <button
          onClick={onChangeLevel}
          className="inline-flex items-center justify-center rounded-xl border h-11 px-6 text-sm font-medium hover:bg-muted transition-colors"
        >
          Change Level
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Question Displays
// ─────────────────────────────────────────────

function NameQuestionView({
  question,
  answered,
  selectedIndex,
  onAnswer,
}: {
  question: NameQuestion
  answered: boolean
  selectedIndex: number | null
  onAnswer: (index: number) => void
}) {
  return (
    <div className="space-y-6">
      <p className="text-lg font-semibold text-center">What fraction is shaded?</p>
      <div className="flex justify-center">
        <FractionSVG n={question.fraction.n} d={question.fraction.d} shape={question.shape} size={180} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {question.options.map((opt, i) => {
          let variant = 'border-border bg-background hover:bg-muted'
          if (answered) {
            if (i === question.correctIndex) variant = 'border-green-500 bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-300'
            else if (i === selectedIndex) variant = 'border-red-400 bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300'
            else variant = 'border-border bg-background opacity-50'
          }
          return (
            <button
              key={i}
              disabled={answered}
              onClick={() => onAnswer(i)}
              className={`h-14 text-lg font-bold rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-default ${variant}`}
            >
              {opt.n}/{opt.d}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CompareQuestionView({
  question,
  answered,
  selectedIndex,
  onAnswer,
}: {
  question: CompareQuestion
  answered: boolean
  selectedIndex: number | null
  onAnswer: (index: number) => void
}) {
  const fractions = [question.fractionA, question.fractionB]

  return (
    <div className="space-y-6">
      <p className="text-lg font-semibold text-center">Which fraction is LARGER?</p>
      <div className="flex items-center justify-center gap-6">
        <FractionText n={question.fractionA.n} d={question.fractionA.d} large />
        <span className="text-3xl font-black text-muted-foreground">VS</span>
        <FractionText n={question.fractionB.n} d={question.fractionB.d} large />
      </div>
      <div className="flex gap-4 justify-center">
        {fractions.map((f, i) => {
          let variant = 'border-border bg-background hover:bg-muted'
          if (answered) {
            if (i === question.correctIndex) variant = 'border-green-500 bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-300'
            else if (i === selectedIndex) variant = 'border-red-400 bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300'
            else variant = 'border-border bg-background opacity-50'
          }
          return (
            <button
              key={i}
              disabled={answered}
              onClick={() => onAnswer(i)}
              className={`h-14 w-32 text-xl font-bold rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-default ${variant}`}
            >
              {f.n}/{f.d}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function EquivQuestionView({
  question,
  answered,
  selectedIndex,
  onAnswer,
}: {
  question: EquivQuestion
  answered: boolean
  selectedIndex: number | null
  onAnswer: (index: number) => void
}) {
  return (
    <div className="space-y-6">
      <p className="text-lg font-semibold text-center">
        Which fraction equals{' '}
        <span className="font-bold text-primary">
          {question.fraction.n}/{question.fraction.d}
        </span>
        ?
      </p>
      <div className="flex justify-center">
        <FractionSVG n={question.fraction.n} d={question.fraction.d} shape={question.shape} size={180} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {question.options.map((opt, i) => {
          let variant = 'border-border bg-background hover:bg-muted'
          if (answered) {
            if (i === question.correctIndex) variant = 'border-green-500 bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-300'
            else if (i === selectedIndex) variant = 'border-red-400 bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300'
            else variant = 'border-border bg-background opacity-50'
          }
          return (
            <button
              key={i}
              disabled={answered}
              onClick={() => onAnswer(i)}
              className={`h-14 text-lg font-bold rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-default ${variant}`}
            >
              {opt.n}/{opt.d}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Main Game Client
// ─────────────────────────────────────────────

type GamePhase = 'picking' | 'playing' | 'results'

export function FractionGameClient({ childId, scores }: Props) {
  const [phase, setPhase] = useState<GamePhase>('picking')
  const [level, setLevel] = useState<Level>('name')
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [saved, setSaved] = useState(false)
  const [liveScores, setLiveScores] = useState<ScoreRow[]>(scores)

  const TOTAL = 10

  // Keep a stable ref to childId + level for use inside setTimeout callbacks
  const roundRef = useRef({ childId, level })
  roundRef.current = { childId, level }

  const startLevel = useCallback((chosenLevel: Level) => {
    setLevel(chosenLevel)
    setQuestions(generateRound(chosenLevel, TOTAL))
    setCurrentIndex(0)
    setScore(0)
    setAnswered(false)
    setSelectedIndex(null)
    setSaved(false)
    setPhase('playing')
  }, [])

  const finishRound = useCallback(
    async (finalScore: number) => {
      const { childId: cid, level: lv } = roundRef.current
      setPhase('results')
      try {
        const res = await fetch('/api/fraction-frenzy/score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ childId: cid, level: lv, score: finalScore, total: TOTAL }),
        })
        if (res.ok) {
          setSaved(true)
          setLiveScores((prev) => {
            const existing = prev.find((s) => s.level === lv)
            if (existing) {
              return prev.map((s) =>
                s.level === lv
                  ? { ...s, best_score: Math.max(s.best_score, finalScore), rounds_played: s.rounds_played + 1 }
                  : s
              )
            }
            return [...prev, { level: lv, best_score: finalScore, rounds_played: 1 }]
          })
        }
      } catch {
        // non-critical
      }
    },
    [] // stable — reads from roundRef
  )

  const handleAnswer = useCallback(
    (index: number) => {
      if (answered) return
      setSelectedIndex(index)
      setAnswered(true)

      const q = questions[currentIndex]
      let isCorrect = false
      if (q.kind === 'name') isCorrect = index === q.correctIndex
      else if (q.kind === 'compare') isCorrect = index === q.correctIndex
      else isCorrect = index === q.correctIndex

      const newScore = isCorrect ? score + 1 : score

      // Advance after short delay
      setTimeout(() => {
        if (currentIndex + 1 >= TOTAL) {
          setScore(newScore)
          void finishRound(newScore)
        } else {
          setCurrentIndex((ci) => ci + 1)
          setAnswered(false)
          setSelectedIndex(null)
          if (isCorrect) setScore((s) => s + 1)
        }
      }, 700)
    },
    [answered, questions, currentIndex, score, finishRound]
  )

  // Phase: picking
  if (phase === 'picking') {
    return <LevelPicker scores={liveScores} onSelect={startLevel} />
  }

  // Phase: results
  if (phase === 'results') {
    return (
      <ResultsScreen
        score={score}
        total={TOTAL}
        level={level}
        saved={saved}
        onPlayAgain={() => startLevel(level)}
        onChangeLevel={() => setPhase('picking')}
      />
    )
  }

  // Phase: playing
  const q = questions[currentIndex]
  const progress = ((currentIndex) / TOTAL) * 100

  return (
    <div className="space-y-5">
      {/* Progress bar + counter */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{LEVEL_META[level].emoji} {LEVEL_META[level].name}</span>
          <span>{currentIndex + 1} / {TOTAL}</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-xs text-right text-muted-foreground">Score: {score}</div>
      </div>

      {/* Question card */}
      <div className="rounded-xl border bg-card p-6">
        {q.kind === 'name' && (
          <NameQuestionView
            question={q}
            answered={answered}
            selectedIndex={selectedIndex}
            onAnswer={handleAnswer}
          />
        )}
        {q.kind === 'compare' && (
          <CompareQuestionView
            question={q}
            answered={answered}
            selectedIndex={selectedIndex}
            onAnswer={handleAnswer}
          />
        )}
        {q.kind === 'equivalent' && (
          <EquivQuestionView
            question={q}
            answered={answered}
            selectedIndex={selectedIndex}
            onAnswer={handleAnswer}
          />
        )}
      </div>
    </div>
  )
}
