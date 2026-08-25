'use client'

import { useState } from 'react'
import type { MysteryCodeContent } from '@/lib/weekly-challenge/puzzle-types'
import type { BadgeAward } from '@/lib/weekly-challenge/badges'
import { BadgeReveal } from './badge-reveal'

interface Props {
  childId: string
  puzzleId: string
  title: string
  content: MysteryCodeContent
  alreadySolved: boolean
  alreadyRedeemed: boolean
}

export function MysteryCode({ childId, puzzleId, title, content, alreadySolved, alreadyRedeemed }: Props) {
  const [answers, setAnswers] = useState<(number | null)[]>(content.questions.map(() => null))
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ solved: boolean; revealedCode: string } | null>(null)
  const [redeemCode, setRedeemCode] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const [redeemError, setRedeemError] = useState<string | null>(null)
  const [redeemed, setRedeemed] = useState(alreadyRedeemed)
  const [badgeQueue, setBadgeQueue] = useState<BadgeAward[]>([])

  const solved = alreadySolved || result?.solved
  const canSubmit = !solved && answers.every((a) => a !== null) && !submitting
  // Every revealsDigit is already present in `content` before solving (pre-existing
  // behavior), so recomputing the full code for a returning, already-solved child
  // is not a new information leak.
  const fullCode = content.questions.map((q) => q.revealsDigit).join('')
  const displayCode = result?.revealedCode ?? (alreadySolved ? fullCode : undefined)

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
        if (body.newBadges?.length) setBadgeQueue((prev) => [...prev, ...body.newBadges])
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRedeem() {
    setRedeeming(true)
    setRedeemError(null)
    try {
      const res = await fetch('/api/weekly-challenge/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId, puzzleId, code: redeemCode }),
      })
      const body = await res.json()
      if (res.ok) {
        setRedeemed(true)
        setBadgeQueue((prev) => [...prev, body.badge])
      } else {
        setRedeemError("That's not quite right — check the code above.")
      }
    } finally {
      setRedeeming(false)
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
        <div className="space-y-4">
          <p className="text-lg font-bold text-primary">
            🎉 Solved! The code was {displayCode}.
          </p>
          {!redeemed && (
            <div className="space-y-2">
              <label className="text-sm font-medium block">Enter your code to claim the badge</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={redeemCode}
                  onChange={(e) => setRedeemCode(e.target.value)}
                  className="rounded-lg border px-3 py-1.5 text-sm w-32"
                  placeholder="Code"
                />
                <button
                  type="button"
                  onClick={handleRedeem}
                  disabled={redeeming || !redeemCode}
                  className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  {redeeming ? 'Checking...' : 'Redeem'}
                </button>
              </div>
              {redeemError && <p className="text-sm text-red-600">{redeemError}</p>}
            </div>
          )}
          {redeemed && <p className="text-sm text-muted-foreground">🏅 Badge claimed!</p>}
        </div>
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

      {badgeQueue.length > 0 && (
        <BadgeReveal
          badge={badgeQueue[0]}
          onDismiss={() => setBadgeQueue((prev) => prev.slice(1))}
        />
      )}
    </div>
  )
}
