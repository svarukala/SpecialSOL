'use client'
import { useState } from 'react'
import { asMatching, AnswerValue, Question } from '@/lib/practice/question-types'
import { Button } from '@/components/ui/button'

interface Props {
  question: Question
  submittedAnswer: AnswerValue | null
  isCorrect: boolean | null
  onSubmit: (pairs: Record<string, string>) => void
  disabled: boolean
}

export function MatchingPicker({ question, submittedAnswer, isCorrect, onSubmit, disabled }: Props) {
  const { left, right, correct_pairs } = asMatching(question)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [activeLeft, setActiveLeft] = useState<string | null>(null)
  const submitted = isCorrect !== null
  const display = submitted ? (submittedAnswer as Record<string, string>) : draft
  const allPaired = left.every((l) => display[l.id])

  function handleLeft(id: string) {
    if (disabled || submitted) return
    setActiveLeft((prev) => prev === id ? null : id)
  }

  function handleRight(rightId: string) {
    if (!activeLeft || disabled || submitted) return
    setDraft((prev) => ({ ...prev, [activeLeft]: rightId }))
    setActiveLeft(null)
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground font-medium">Tap a left item, then tap its match on the right</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          {left.map((item) => {
            const paired = display[item.id]
            const isActive = activeLeft === item.id
            const correct = submitted && correct_pairs[item.id] === paired

            let cls = 'border-border hover:border-primary/50'
            if (submitted && paired && correct)   cls = 'border-green-500 bg-green-500/10'
            else if (submitted && paired)         cls = 'border-red-500 bg-red-500/10'
            else if (isActive)                    cls = 'border-primary bg-primary/20 ring-2 ring-primary/30'
            else if (paired)                      cls = 'border-primary bg-primary/10'

            return (
              <button
                key={item.id}
                onClick={() => handleLeft(item.id)}
                className={`w-full text-left p-3 rounded-lg border-2 text-sm font-medium transition-colors ${cls}`}
              >
                {item.text}
              </button>
            )
          })}
        </div>

        <div className="space-y-2">
          {right.map((item) => {
            const matchedLeft = Object.entries(display).find(([, r]) => r === item.id)?.[0]
            const correct = submitted && matchedLeft && correct_pairs[matchedLeft] === item.id

            let cls = 'border-border'
            if (submitted && matchedLeft && correct)  cls = 'border-green-500 bg-green-500/10'
            else if (submitted && matchedLeft)        cls = 'border-red-500 bg-red-500/10'
            else if (matchedLeft)                     cls = 'border-primary bg-primary/10'
            else if (activeLeft)                      cls = 'border-border hover:border-primary/50 hover:bg-muted'

            return (
              <button
                key={item.id}
                onClick={() => handleRight(item.id)}
                disabled={disabled || (!activeLeft && !submitted)}
                className={`w-full text-left p-3 rounded-lg border-2 text-sm font-medium transition-colors ${cls}`}
              >
                {item.text}
              </button>
            )
          })}
        </div>
      </div>

      {!submitted && (
        <Button onClick={() => onSubmit(draft)} disabled={!allPaired} className="w-full">
          Check Matches
        </Button>
      )}
    </div>
  )
}
