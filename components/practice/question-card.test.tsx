import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { QuestionCard } from './question-card'

const mockQuestion = {
  id: 'q1',
  question_text: 'What is 2 + 2?',
  simplified_text: 'What is two plus two?',
  answer_type: 'multiple_choice' as const,
  choices: [
    { id: 'a', text: '3', is_correct: false },
    { id: 'b', text: '4', is_correct: true },
    { id: 'c', text: '5', is_correct: false },
    { id: 'd', text: '6', is_correct: false },
  ],
  hint_1: 'Count on your fingers',
  hint_2: null,
  hint_3: null,
  calculator_allowed: false,
  image_svg: null,
}

describe('QuestionCard', () => {
  it('renders question text', () => {
    render(<QuestionCard question={mockQuestion} simplified={false} />)
    expect(screen.getByText('What is 2 + 2?')).toBeInTheDocument()
  })

  it('renders simplified text when simplified=true', () => {
    render(<QuestionCard question={mockQuestion} simplified={true} />)
    expect(screen.getByText('What is two plus two?')).toBeInTheDocument()
  })

  it('falls back to original text when simplified_text is null', () => {
    const q = { ...mockQuestion, simplified_text: null }
    render(<QuestionCard question={q} simplified={true} />)
    expect(screen.getByText('What is 2 + 2?')).toBeInTheDocument()
  })

  it('does not render SVG container when image_svg is null', () => {
    render(<QuestionCard question={mockQuestion} simplified={false} />)
    expect(document.querySelector('.max-w-xs')).toBeNull()
  })

  it('renders SVG container when image_svg is a non-empty string', () => {
    const q = { ...mockQuestion, image_svg: '<svg><circle r="10"/></svg>' }
    render(<QuestionCard question={q} simplified={false} />)
    expect(document.querySelector('.max-w-xs')).toBeInTheDocument()
  })
})
