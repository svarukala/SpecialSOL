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
  simplified_text: string | null
  answer_type: string
  // Shape varies by type: ChoiceOption[] for MC/MS/TF; FillInBlankChoices object for fill_in_blank
  choices: unknown
  hint_1: string
  hint_2: string
  hint_3: string
  calculator_allowed: boolean
  source: string
  tier?: 'foundational' | 'standard'
  image_svg?: string | null
  reading_passage?: string | null
}

export function validateQuestion(q: Partial<GeneratedQuestion>): GeneratedQuestion {
  const required = [
    'grade', 'subject', 'topic', 'subtopic', 'sol_standard', 'difficulty',
    'question_text', 'answer_type', 'choices',
    'hint_1', 'hint_2', 'hint_3', 'calculator_allowed', 'source',
  ] as const

  for (const field of required) {
    if (q[field] === undefined || q[field] === null) {
      throw new ValidationError(`Missing required field: ${field}`)
    }
  }

  // simplified_text is optional — foundational questions intentionally omit it
  if (q.simplified_text === undefined) {
    (q as Record<string, unknown>).simplified_text = null
  }

  // image_svg is optional — normalize missing to null
  if (q.image_svg === undefined) {
    (q as Record<string, unknown>).image_svg = null
  }

  if (![1, 2, 3].includes(q.difficulty!)) {
    throw new ValidationError(`difficulty must be 1, 2, or 3 — got ${q.difficulty}`)
  }

  if (q.answer_type === 'fill_in_blank') {
    const fib = q.choices as { template?: string; blanks?: unknown[] } | null
    if (!fib || typeof fib !== 'object' || Array.isArray(fib)) {
      throw new ValidationError(`fill_in_blank choices must be an object {template, blanks}`)
    }
    if (typeof fib.template !== 'string' || !fib.template.includes('___')) {
      throw new ValidationError(`fill_in_blank choices.template must be a string containing ___`)
    }
    if (!Array.isArray(fib.blanks) || fib.blanks.length === 0) {
      throw new ValidationError(`fill_in_blank choices.blanks must be a non-empty array`)
    }
  } else {
    const choices = q.choices as { id: string; text: string; is_correct: boolean }[] | null
    if (!Array.isArray(choices) || choices.length < 4) {
      throw new ValidationError(`choices must be an array of at least 4 items — got ${(choices as unknown[])?.length}`)
    }
    const correctCount = choices.filter((c) => c.is_correct).length
    if (q.answer_type === 'multiple_select') {
      if (correctCount < 2) {
        throw new ValidationError(`multiple_select must have at least 2 correct choices — got ${correctCount}`)
      }
    } else {
      if (correctCount !== 1) {
        throw new ValidationError(`exactly 1 choice must have is_correct: true — got ${correctCount}`)
      }
    }
  }

  // normalize missing reading_passage to null
  if (q.reading_passage === undefined) {
    (q as Record<string, unknown>).reading_passage = null
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
