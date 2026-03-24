'use client'
import { useState } from 'react'
import { AnswerValue } from '@/lib/practice/question-types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Props {
  submittedAnswer: AnswerValue | null
  isCorrect: boolean | null
  onSubmit: (text: string) => void
  disabled: boolean
}

export function ShortAnswerPicker({ submittedAnswer, isCorrect, onSubmit, disabled }: Props) {
  const [draft, setDraft] = useState('')
  const submitted = isCorrect !== null
  const display = submitted ? (submittedAnswer as string) : draft

  return (
    <div className="space-y-3">
      <Input
        value={display}
        onChange={(e) => !submitted && setDraft(e.target.value)}
        disabled={disabled || submitted}
        placeholder="Type your answer…"
        className={submitted && isCorrect ? 'border-green-500' : submitted ? 'border-yellow-500' : ''}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && draft.trim() && !submitted) onSubmit(draft)
        }}
      />
      {!submitted && (
        <Button onClick={() => onSubmit(draft)} disabled={!draft.trim()} className="w-full">
          Check Answer
        </Button>
      )}
    </div>
  )
}
