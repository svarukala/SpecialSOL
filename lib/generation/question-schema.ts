// lib/generation/question-schema.ts

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export interface GeneratedQuestion {
  grade: number
  subject: string
  topic: string
  subtopic: string
  sol_standard: string
  difficulty: number
  question_text: string
  simplified_text: string
  answer_type: string
  choices: { id: string; text: string; is_correct: boolean }[]
  hint_1: string
  hint_2: string
  hint_3: string
  calculator_allowed: boolean
  source: string
}

export function validateQuestion(q: Partial<GeneratedQuestion>): GeneratedQuestion {
  const required = [
    'grade', 'subject', 'topic', 'subtopic', 'sol_standard', 'difficulty',
    'question_text', 'simplified_text', 'answer_type', 'choices',
    'hint_1', 'hint_2', 'hint_3', 'calculator_allowed', 'source',
  ] as const

  for (const field of required) {
    if (q[field] === undefined || q[field] === null) {
      throw new ValidationError(`Missing required field: ${field}`)
    }
  }

  if (![1, 2, 3].includes(q.difficulty!)) {
    throw new ValidationError(`difficulty must be 1, 2, or 3 — got ${q.difficulty}`)
  }

  if (!Array.isArray(q.choices) || q.choices.length !== 4) {
    throw new ValidationError(`choices must be an array of exactly 4 items — got ${q.choices?.length}`)
  }

  const correctCount = q.choices.filter((c) => c.is_correct).length
  if (correctCount !== 1) {
    throw new ValidationError(`exactly 1 choice must have is_correct: true — got ${correctCount}`)
  }

  return q as GeneratedQuestion
}

export function validateQuestionBatch(questions: unknown[]): GeneratedQuestion[] {
  return questions.map((q, i) => {
    try {
      if (q === null || typeof q !== 'object' || Array.isArray(q)) {
        throw new ValidationError(`expected an object`)
      }
      return validateQuestion(q as Partial<GeneratedQuestion>)
    } catch (e) {
      throw new ValidationError(`Question ${i + 1}: ${(e as Error).message}`)
    }
  })
}
