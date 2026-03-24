'use client'
import { useState } from 'react'
import { asChoiceOptions, AnswerValue, Question } from '@/lib/practice/question-types'
import { Button } from '@/components/ui/button'

interface Props {
  question: Question
  submittedAnswer: AnswerValue | null
  isCorrect: boolean | null
  onSubmit: (ids: string[]) => void
  disabled: boolean
}

export function MultiSelectPicker({ question, submittedAnswer, isCorrect, onSubmit, disabled }: Props) {
  const choices = asChoiceOptions(question)
  const [draft, setDraft] = useState<string[]>([])
  const submitted = isCorrect !== null
  // After submission, show what was actually submitted for result highlighting
  const display = submitted ? (submittedAnswer as string[]) : draft

  function toggle(id: string) {
    if (disabled || submitted) return
    setDraft((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id])
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground font-medium">Select all that apply</p>
      <div className="grid gap-3">
        {choices.map((choice) => {
          const isSelected = display.includes(choice.id)
          let cls = 'border-border hover:border-primary/50 hover:bg-muted'
          if (submitted && isSelected && choice.is_correct)    cls = 'border-green-500 bg-green-500/10'
          else if (submitted && isSelected && !choice.is_correct) cls = 'border-red-500 bg-red-500/10'
          else if (submitted && !isSelected && choice.is_correct) cls = 'border-green-500/50 bg-green-500/5'
          else if (isSelected) cls = 'border-primary bg-primary/10'

          return (
            <button
              key={choice.id}
              onClick={() => toggle(choice.id)}
              disabled={disabled && !isSelected}
              className={`w-full text-left p-4 rounded-lg border-2 transition-colors font-medium flex items-center gap-3 ${cls}`}
              aria-pressed={isSelected}
            >
              <span className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-primary bg-primary' : 'border-border'}`}>
                {isSelected && <span className="text-primary-foreground text-xs leading-none">✓</span>}
              </span>
              {choice.text}
            </button>
          )
        })}
      </div>
      {!submitted && (
        <Button onClick={() => onSubmit(draft)} disabled={draft.length === 0} className="w-full">
          Check Answer
        </Button>
      )}
    </div>
  )
}
