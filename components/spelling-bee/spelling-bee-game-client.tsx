'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createTTSEngine } from '@/lib/tts/factory'
import { TTSEngine } from '@/lib/tts/types'
import { EtymologyBadge } from './etymology-badge'

interface Word {
  id: string
  word: string
  definition: string
  exampleSentence: string
  originLanguage: string
  etymologyNote: string | null
}

interface AnswerResult {
  isCorrect: boolean
  correctWord: string
  definition: string
  etymologyNote: string | null
  originLanguage: string
}

interface StoredResult extends AnswerResult {
  answerGiven: string
}

interface ParentSettings {
  ttsProvider?: string
  ttsApiKey?: string
}

interface Props {
  sessionId: string
  words: Word[]
  childId: string
  parentSettings: ParentSettings | null
}

type GamePhase = 'question' | 'feedback' | 'summary'

export function SpellingBeeGameClient({ sessionId, words, childId: _childId, parentSettings }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [phase, setPhase] = useState<GamePhase>('question')
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState<AnswerResult | null>(null)
  const [results, setResults] = useState<StoredResult[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [ttsEngine, setTtsEngine] = useState<TTSEngine | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const provider = (parentSettings?.ttsProvider ?? 'web_speech') as 'web_speech' | 'openai' | 'elevenlabs'
    createTTSEngine({ provider }).then(setTtsEngine)
  }, [parentSettings?.ttsProvider])

  useEffect(() => {
    if (phase === 'question') {
      inputRef.current?.focus()
    }
  }, [phase, currentIndex])

  const speakWord = useCallback(async () => {
    if (!ttsEngine || speaking) return
    const word = words[currentIndex]
    if (!word) return
    setSpeaking(true)
    try {
      await ttsEngine.speak(word.word, { rate: 0.85 })
    } finally {
      setSpeaking(false)
    }
  }, [ttsEngine, speaking, words, currentIndex])

  async function submitAnswer() {
    if (submitting || !answer.trim()) return
    const word = words[currentIndex]
    if (!word) return

    const trimmed = answer.trim()
    setSubmitting(true)
    try {
      const res = await fetch('/api/spelling/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, wordId: word.id, answerGiven: trimmed }),
      })
      const data = await res.json() as AnswerResult
      setResult(data)
      setResults((prev) => [...prev, { ...data, answerGiven: trimmed }])
      setPhase('feedback')
    } finally {
      setSubmitting(false)
    }
  }

  function advance() {
    const nextIndex = currentIndex + 1
    if (nextIndex >= words.length) {
      setPhase('summary')
    } else {
      setCurrentIndex(nextIndex)
      setAnswer('')
      setResult(null)
      setPhase('question')
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      submitAnswer()
    }
  }

  function handleFeedbackKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      advance()
    }
  }

  if (phase === 'summary') {
    const score = results.filter((r) => r.isCorrect).length
    const missed = results.filter((r) => !r.isCorrect)

    const encouragement =
      score === 10
        ? '🏆 Perfect score! You are a spelling champion!'
        : score >= 8
        ? '🌟 Excellent work! Almost perfect!'
        : score >= 6
        ? '👍 Good job! Keep practicing!'
        : '💪 Keep going — practice makes perfect!'

    return (
      <div className="space-y-6">
        <div className="rounded-xl border bg-card p-6 text-center space-y-2">
          <div className="text-4xl font-bold">{score}/10</div>
          <p className="text-muted-foreground text-sm">{encouragement}</p>
        </div>

        {missed.length > 0 && (
          <div className="rounded-xl border p-5 space-y-3">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Words to review</h2>
            <ul className="space-y-2">
              {missed.map((r, i) => (
                <li key={i} className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-destructive line-through">{r.answerGiven}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-semibold">{r.correctWord}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <a
          href="/spelling-bee"
          className="inline-flex w-full items-center justify-center rounded-xl bg-primary text-primary-foreground h-11 font-semibold transition-colors hover:bg-primary/80"
        >
          Play Again
        </a>
      </div>
    )
  }

  const currentWord = words[currentIndex]

  if (phase === 'feedback' && result) {
    return (
      <div className="space-y-5" onKeyDown={handleFeedbackKeyDown} tabIndex={-1}>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Word {currentIndex + 1} of {words.length}</span>
        </div>

        <div className={`rounded-xl border p-5 space-y-4 ${result.isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{result.isCorrect ? '✓' : '✗'}</span>
            <span className="text-xl font-bold">{result.correctWord}</span>
          </div>

          {!result.isCorrect && (
            <p className="text-sm text-muted-foreground">
              You typed: <span className="font-medium text-destructive">{answer}</span>
            </p>
          )}

          <div className="space-y-1.5 pt-1">
            <p className="text-sm"><span className="font-medium">Definition: </span>{currentWord.definition}</p>
            <p className="text-sm text-muted-foreground italic">&ldquo;{currentWord.exampleSentence}&rdquo;</p>
          </div>

          <EtymologyBadge
            originLanguage={result.originLanguage}
            etymologyNote={result.etymologyNote}
          />
        </div>

        <button
          type="button"
          onClick={advance}
          className="inline-flex w-full items-center justify-center rounded-xl bg-primary text-primary-foreground h-11 font-semibold transition-colors hover:bg-primary/80"
        >
          {currentIndex + 1 < words.length ? 'Next Word →' : 'See Results'}
        </button>
        <p className="text-center text-xs text-muted-foreground">Press Enter to continue</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Word {currentIndex + 1} of {words.length}</span>
        <div className="flex gap-1">
          {words.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-6 rounded-full transition-colors ${
                i < currentIndex
                  ? 'bg-primary'
                  : i === currentIndex
                  ? 'bg-primary/50'
                  : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 space-y-4 text-center">
        <p className="text-sm text-muted-foreground">Listen carefully, then type the word</p>
        <button
          type="button"
          onClick={speakWord}
          disabled={speaking || !ttsEngine}
          className="inline-flex items-center gap-2 rounded-xl border border-primary bg-primary/5 text-primary px-6 h-14 text-base font-semibold transition-colors hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="text-xl">{speaking ? '🔊' : '🔉'}</span>
          {speaking ? 'Speaking...' : 'Hear Word'}
        </button>
      </div>

      <div className="space-y-3">
        <input
          ref={inputRef}
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type the spelling here…"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          className="w-full rounded-xl border border-input bg-background px-4 h-12 text-base focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="button"
          onClick={submitAnswer}
          disabled={submitting || !answer.trim()}
          className="inline-flex w-full items-center justify-center rounded-xl bg-primary text-primary-foreground h-11 font-semibold transition-colors hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Checking…' : 'Check Spelling'}
        </button>
        <p className="text-center text-xs text-muted-foreground">Press Enter to check</p>
      </div>
    </div>
  )
}
