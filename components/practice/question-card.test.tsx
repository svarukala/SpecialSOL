import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { QuestionCard } from './question-card'

vi.mock('@/lib/accommodations/context', () => ({
  useAccommodations: () => ({
    state: {
      tts_enabled: false,
      tts_speed: 1,
      high_contrast: false,
      large_text: 0,
      dyslexia_font: false,
      reduce_distractions: false,
      extended_time: false,
      hints_enabled: true,
      positive_reinforcement: true,
      bionic_reading: false,
    },
    update: vi.fn(),
  }),
}))

vi.mock('@/lib/svg/sanitize', () => ({
  sanitizeSvg: (svg: string) => svg,
}))

vi.mock('@/components/accommodations/tts-button', () => ({
  TTSButton: () => null,
}))

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
    expect(screen.queryByTestId('svg-container')).toBeNull()
  })

  it('renders SVG container when image_svg is a non-empty string', () => {
    const q = { ...mockQuestion, image_svg: '<svg><circle r="10"/></svg>' }
    render(<QuestionCard question={q} simplified={false} />)
    expect(screen.getByTestId('svg-container')).toBeInTheDocument()
  })

  it('renders a user highlight as a mark element', () => {
    render(
      <QuestionCard
        question={mockQuestion}
        simplified={false}
        userHighlights={[{ start: 8, end: 9 }]}
      />
    )
    const mark = document.querySelector('mark.bg-yellow-200')
    expect(mark).not.toBeNull()
  })

  it('renders multiple user highlights', () => {
    render(
      <QuestionCard
        question={mockQuestion}
        simplified={false}
        userHighlights={[{ start: 0, end: 4 }, { start: 8, end: 9 }]}
      />
    )
    const marks = document.querySelectorAll('mark.bg-yellow-200')
    expect(marks).toHaveLength(2)
  })

  it('does not render user highlight marks when userHighlights is empty', () => {
    render(<QuestionCard question={mockQuestion} simplified={false} userHighlights={[]} />)
    expect(document.querySelector('mark.bg-yellow-200')).toBeNull()
  })
})
