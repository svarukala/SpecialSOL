'use client'
import { useState } from 'react'
import { asFillInBlank, AnswerValue, Question } from '@/lib/practice/question-types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Props {
  question: Question
  submittedAnswer: AnswerValue | null
  isCorrect: boolean | null
  onSubmit: (blanks: Record<string, string>) => void
  disabled: boolean
}

export function FillInBlankPicker({ question, submittedAnswer, isCorrect, onSubmit, disabled }: Props) {
  const { template, blanks: blankDefs } = asFillInBlank(question)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const parts = template.split('___')
  const submitted = isCorrect !== null
  const display = submitted ? (submittedAnswer as Record<string, string>) : draft
  const allFilled = blankDefs.every((b) => (display[b.id] ?? '').trim())

  return (
    <div className="space-y-4">
      <p className="text-base leading-loose">
        {parts.map((part, idx) => (
          <span key={idx}>
            {part}
            {idx < blankDefs.length && (
              <Input
                value={display[blankDefs[idx].id] ?? ''}
                onChange={(e) => !submitted && setDraft((prev) => ({ ...prev, [blankDefs[idx].id]: e.target.value }))}
                disabled={disabled || submitted}
                placeholder="…"
                className={[
                  'inline-block w-32 h-8 mx-1 text-center align-middle',
                  submitted && isCorrect  ? 'border-green-500' : '',
                  submitted && !isCorrect ? 'border-yellow-500' : '',
                ].join(' ')}
              />
            )}
          </span>
        ))}
      </p>
      {!submitted && (
        <Button onClick={() => onSubmit(draft)} disabled={!allFilled} className="w-full">
          Check Answer
        </Button>
      )}
    </div>
  )
}
