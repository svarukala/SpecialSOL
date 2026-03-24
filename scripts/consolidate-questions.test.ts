// scripts/consolidate-questions.test.ts
import { describe, it, expect } from 'vitest'
import { deduplicateQuestions } from './consolidate-questions'

const base = {
  grade: 3, subject: 'math', topic: 'fractions', subtopic: 'x',
  sol_standard: '3.2', difficulty: 1,
  question_text: 'What is 1/4?', simplified_text: 'What is 1 out of 4?',
  answer_type: 'multiple_choice',
  choices: [{ id: 'a', text: '0.25', is_correct: true }, { id: 'b', text: '0.5', is_correct: false }, { id: 'c', text: '0.75', is_correct: false }, { id: 'd', text: '1', is_correct: false }],
  hint_1: 'h1', hint_2: 'h2', hint_3: 'h3', calculator_allowed: false, source: 'ai_generated',
}

describe('deduplicateQuestions', () => {
  it('keeps unique questions', () => {
    const q2 = { ...base, sol_standard: '3.3', question_text: 'What is 2+2?' }
    expect(deduplicateQuestions([base, q2])).toHaveLength(2)
  })

  it('removes exact duplicate (same sol_standard + question_text)', () => {
    expect(deduplicateQuestions([base, { ...base }])).toHaveLength(1)
  })

  it('removes duplicate regardless of whitespace case differences', () => {
    const dup = { ...base, question_text: 'what is 1/4? ' }
    expect(deduplicateQuestions([base, dup])).toHaveLength(1)
  })
})
