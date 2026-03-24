// scripts/question-schema.test.ts
import { describe, it, expect } from 'vitest'
import { validateQuestion, validateQuestionBatch, ValidationError } from './question-schema'

const validQuestion = {
  grade: 3,
  subject: 'math',
  topic: 'fractions',
  subtopic: 'identifying fractions',
  sol_standard: '3.2',
  difficulty: 1,
  question_text: 'Which fraction shows 1 out of 4 equal parts?',
  simplified_text: 'A shape has 4 equal parts. 1 part is shaded. What fraction is shaded?',
  answer_type: 'multiple_choice',
  choices: [
    { id: 'a', text: '1/4', is_correct: true },
    { id: 'b', text: '1/3', is_correct: false },
    { id: 'c', text: '2/4', is_correct: false },
    { id: 'd', text: '3/4', is_correct: false },
  ],
  hint_1: 'Count the total equal parts.',
  hint_2: 'The bottom number is the total, the top is the shaded part.',
  hint_3: '1 shaded out of 4 total = 1/4.',
  calculator_allowed: false,
  source: 'ai_generated',
}

describe('validateQuestion', () => {
  it('accepts a valid question', () => {
    expect(() => validateQuestion(validQuestion)).not.toThrow()
  })

  it('rejects missing required fields', () => {
    const bad = { ...validQuestion, question_text: undefined }
    expect(() => validateQuestion(bad)).toThrow(ValidationError)
  })

  it('rejects choices count !== 4', () => {
    const bad = { ...validQuestion, choices: validQuestion.choices.slice(0, 3) }
    expect(() => validateQuestion(bad)).toThrow(ValidationError)
  })

  it('rejects zero correct answers', () => {
    const bad = { ...validQuestion, choices: validQuestion.choices.map((c) => ({ ...c, is_correct: false })) }
    expect(() => validateQuestion(bad)).toThrow(ValidationError)
  })

  it('rejects more than one correct answer', () => {
    const bad = { ...validQuestion, choices: validQuestion.choices.map((c) => ({ ...c, is_correct: true })) }
    expect(() => validateQuestion(bad)).toThrow(ValidationError)
  })

  it('rejects invalid difficulty', () => {
    const bad = { ...validQuestion, difficulty: 4 }
    expect(() => validateQuestion(bad)).toThrow(ValidationError)
  })

  it('rejects missing simplified_text', () => {
    const bad = { ...validQuestion, simplified_text: undefined }
    expect(() => validateQuestion(bad)).toThrow(ValidationError)
  })
})

describe('validateQuestionBatch', () => {
  it('returns all valid questions', () => {
    expect(validateQuestionBatch([validQuestion])).toHaveLength(1)
  })

  it('wraps index in error message for invalid question', () => {
    const bad = { ...validQuestion, difficulty: 5 }
    expect(() => validateQuestionBatch([validQuestion, bad])).toThrow('Question 2:')
  })

  it('throws ValidationError for null element', () => {
    expect(() => validateQuestionBatch([null])).toThrow(ValidationError)
  })
})
