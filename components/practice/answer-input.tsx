'use client'
import type { Question, AnswerValue } from '@/lib/practice/question-types'
import { AnswerPicker } from './answer-picker'
import { MultiSelectPicker } from './multi-select-picker'
import { ShortAnswerPicker } from './short-answer-picker'
import { OrderingPicker } from './ordering-picker'
import { MatchingPicker } from './matching-picker'
import { FillInBlankPicker } from './fill-in-blank-picker'

interface Props {
  question: Question
  submittedAnswer: AnswerValue | null
  isCorrect: boolean | null
  /** Called immediately for single-choice; called on "Check" button for complex types. */
  onSubmit: (answer: AnswerValue) => void
  disabled: boolean
}

export function AnswerInput({ question, submittedAnswer, isCorrect, onSubmit, disabled }: Props) {
  const { answer_type } = question

  if (answer_type === 'multiple_choice' || answer_type === 'true_false') {
    return (
      <AnswerPicker
        choices={question.choices}
        selectedId={submittedAnswer as string | null}
        isCorrect={isCorrect}
        onSelect={onSubmit}
        disabled={disabled}
      />
    )
  }

  if (answer_type === 'multiple_select') {
    return <MultiSelectPicker question={question} submittedAnswer={submittedAnswer} isCorrect={isCorrect} onSubmit={onSubmit} disabled={disabled} />
  }

  if (answer_type === 'short_answer') {
    return <ShortAnswerPicker submittedAnswer={submittedAnswer} isCorrect={isCorrect} onSubmit={onSubmit} disabled={disabled} />
  }

  if (answer_type === 'ordering') {
    return <OrderingPicker question={question} submittedAnswer={submittedAnswer} isCorrect={isCorrect} onSubmit={onSubmit} disabled={disabled} />
  }

  if (answer_type === 'matching') {
    return <MatchingPicker question={question} submittedAnswer={submittedAnswer} isCorrect={isCorrect} onSubmit={onSubmit} disabled={disabled} />
  }

  if (answer_type === 'fill_in_blank') {
    return <FillInBlankPicker question={question} submittedAnswer={submittedAnswer} isCorrect={isCorrect} onSubmit={onSubmit} disabled={disabled} />
  }

  return null
}
