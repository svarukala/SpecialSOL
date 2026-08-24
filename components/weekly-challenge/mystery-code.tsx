'use client'

import { useState } from 'react'
import type { MysteryCodeContent } from '@/lib/weekly-challenge/puzzle-types'

interface Props {
  childId: string
  puzzleId: string
  title: string
  content: MysteryCodeContent
  alreadySolved: boolean
}

export function MysteryCode({ childId, puzzleId, title, content, alreadySolved }: Props) {
  const [answers, setAnswers] = useState<(number | null)[]>(content.questions.map(() => null))
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ solved: boolean; revealedCode: string } | null>(null)

  const solved = alreadySolved || result?.solved
  const canSubmit = !solved && answers.every((a) => a !== null) && !submitting

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const res = await fetch('/api/weekly-challenge/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId, puzzleId, mysteryAnswerIndexes: answers }),
      })
      const body = await res.json()
      if (res.ok) {
        setResult({ solved: body.solved, revealedCode: body.revealedCode })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5 rounded-xl border p-5">
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">
          Answer all {content.questions.length} questions to reveal the {content.codeLabel}.
        </p>
      </div>

      {solved ? (
        <p className="text-lg font-bold text-primary">
          🎉 Solved! The code was {result?.revealedCode}.
        </p>
      ) : (
        <>
          {content.questions.map((q, qi) => (
            <div key={qi} className="space-y-2">
              <p className="text-sm font-medium">{q.prompt}</p>
              <div className="flex flex-wrap gap-2">
                {q.choices.map((choice, ci) => (
                  <button
                    key={ci}
                    type="button"
                    onClick={() =>
                      setAnswers((prev) => prev.map((a, i) => (i === qi ? ci : a)))
                    }
                    className={`rounded-lg border px-3 py-1.5 text-sm ${
                      answers[qi] === ci ? 'border-primary bg-primary/10' : 'border-muted'
                    }`}
                  >
                    {choice}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {result && !result.solved && (
            <p className="text-sm text-muted-foreground">
              Partial code: {result.revealedCode} — try again!
            </p>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {submitting ? 'Checking...' : 'Submit answers'}
          </button>
        </>
      )}
    </div>
  )
}
