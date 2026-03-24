'use client'
import { useState } from 'react'
import { asOrderingOptions, AnswerValue, Question } from '@/lib/practice/question-types'
import { Button } from '@/components/ui/button'

interface Props {
  question: Question
  submittedAnswer: AnswerValue | null
  isCorrect: boolean | null
  onSubmit: (ids: string[]) => void
  disabled: boolean
}

export function OrderingPicker({ question, submittedAnswer, isCorrect, onSubmit, disabled }: Props) {
  const options = asOrderingOptions(question)
  const [draft, setDraft] = useState<string[]>([])
  const submitted = isCorrect !== null
  const display = submitted ? (submittedAnswer as string[]) : draft
  const correctSequence = [...options]
    .sort((a, b) => a.correct_position - b.correct_position)
    .map((o) => o.id)

  function handleTap(id: string) {
    if (disabled || submitted) return
    setDraft((prev) => prev.includes(id) ? prev.filter((o) => o !== id) : [...prev, id])
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground font-medium">Tap items in the correct order (1st → last)</p>
      <div className="grid gap-3">
        {options.map((option) => {
          const rank = display.indexOf(option.id) + 1
          const isThisCorrect = submitted && rank > 0 && correctSequence[rank - 1] === option.id

          let cls = 'border-border hover:border-primary/50 hover:bg-muted'
          if (submitted && rank > 0 && isThisCorrect)  cls = 'border-green-500 bg-green-500/10'
          else if (submitted && rank > 0)               cls = 'border-red-500 bg-red-500/10'
          else if (rank > 0)                            cls = 'border-primary bg-primary/10'

          return (
            <button
              key={option.id}
              onClick={() => handleTap(option.id)}
              disabled={disabled}
              className={`w-full text-left p-4 rounded-lg border-2 transition-colors font-medium flex items-center gap-3 ${cls}`}
            >
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${rank > 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {rank > 0 ? rank : '?'}
              </span>
              {option.text}
            </button>
          )
        })}
      </div>
      {!submitted && (
        <Button
          onClick={() => onSubmit(draft)}
          disabled={draft.length < options.length}
          className="w-full"
        >
          Check Order
        </Button>
      )}
    </div>
  )
}
