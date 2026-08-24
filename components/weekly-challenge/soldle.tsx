'use client'

import { useState } from 'react'
import type { SoldleContent } from '@/lib/weekly-challenge/puzzle-types'

interface Props {
  childId: string
  puzzleId: string
  title: string
  content: SoldleContent
  alreadySolved: boolean
}

interface GuessRecord {
  guess: number
  feedback: 'correct' | 'too_low' | 'too_high'
}

export function Soldle({ childId, puzzleId, title, content, alreadySolved }: Props) {
  const [guessValue, setGuessValue] = useState('')
  const [history, setHistory] = useState<GuessRecord[]>([])
  const [submitting, setSubmitting] = useState(false)

  const solved = alreadySolved || history.some((h) => h.feedback === 'correct')
  const outOfGuesses = history.length >= content.maxGuesses && !solved
  const canGuess = !solved && !outOfGuesses && guessValue !== '' && !submitting

  async function handleGuess() {
    const guess = Number(guessValue)
    if (Number.isNaN(guess)) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/weekly-challenge/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId, puzzleId, soldleGuess: guess }),
      })
      const body = await res.json()
      if (res.ok) {
        setHistory((prev) => [...prev, { guess, feedback: body.feedback }])
        setGuessValue('')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5 rounded-xl border border-border p-5">
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{content.clue}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Guess a number between {content.min} and {content.max}. {content.maxGuesses - history.length} guesses left.
        </p>
      </div>

      <ul className="space-y-1">
        {history.map((h, i) => (
          <li key={i} className="text-sm">
            {h.guess} —{' '}
            {h.feedback === 'correct' ? '🎉 Correct!' : h.feedback === 'too_low' ? '⬆️ Too low' : '⬇️ Too high'}
          </li>
        ))}
      </ul>

      {solved ? (
        <p className="text-lg font-bold text-primary">🎉 Solved!</p>
      ) : outOfGuesses ? (
        <p className="text-sm text-muted-foreground">Out of guesses for this week — see you next Monday!</p>
      ) : (
        <div className="flex gap-2">
          <input
            type="number"
            value={guessValue}
            onChange={(e) => setGuessValue(e.target.value)}
            className="rounded-lg border border-border px-3 py-1.5 text-sm w-32"
            placeholder="Your guess"
          />
          <button
            type="button"
            onClick={handleGuess}
            disabled={!canGuess}
            className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {submitting ? 'Checking...' : 'Guess'}
          </button>
        </div>
      )}
    </div>
  )
}
