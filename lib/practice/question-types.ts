// ── Answer types ───────────────────────────────────────────────────────────

export type AnswerType =
  | 'multiple_choice'
  | 'true_false'
  | 'multiple_select'
  | 'short_answer'
  | 'ordering'
  | 'matching'
  | 'fill_in_blank'

// ── choices shapes (vary by answer_type) ───────────────────────────────────

/** Used by multiple_choice, true_false, multiple_select */
export interface ChoiceOption {
  id: string
  text: string
  is_correct: boolean
}

/** Used by ordering — correct_position is 1-indexed */
export interface OrderingOption {
  id: string
  text: string
  correct_position: number
}

/** Used by short_answer */
export interface ShortAnswerChoices {
  accepted: string[]       // all accepted spellings / phrasings
  case_sensitive: boolean
}

/** Used by matching */
export interface MatchingChoices {
  left:  { id: string; text: string }[]
  right: { id: string; text: string }[]
  correct_pairs: Record<string, string>  // left_id → right_id
}

/** Used by fill_in_blank — blanks are in the same order as ___ in the template */
export interface FillInBlankChoices {
  template: string                              // sentence with ___ markers
  blanks: { id: string; accepted: string[] }[]  // matched by position to ___
}

// ── answer value ───────────────────────────────────────────────────────────

export type AnswerValue =
  | string                      // multiple_choice, true_false, short_answer
  | string[]                    // multiple_select, ordering (ordered ids)
  | Record<string, string>      // matching (left_id→right_id), fill_in_blank (blank_id→text)

// ── question ───────────────────────────────────────────────────────────────

export interface Question {
  id: string
  question_text: string
  simplified_text: string | null
  answer_type: AnswerType
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  choices: any  // typed per answer_type — use typed accessors below
  hint_1: string | null
  hint_2: string | null
  hint_3: string | null
  calculator_allowed: boolean
  image_svg: string | null
  difficulty?: 1 | 2 | 3
  source?: 'doe_released' | 'ai_generated'
  source_year?: number
  reading_passage?: string | null
}

// ── typed choices accessors ────────────────────────────────────────────────

export const asChoiceOptions   = (q: Question): ChoiceOption[]    => q.choices
export const asOrderingOptions = (q: Question): OrderingOption[]  => q.choices
export const asShortAnswer     = (q: Question): ShortAnswerChoices => q.choices
export const asMatching        = (q: Question): MatchingChoices    => q.choices
export const asFillInBlank     = (q: Question): FillInBlankChoices => q.choices

// ── whether to shuffle choices at session start ────────────────────────────

/** Returns true for types whose choices array should be randomly shuffled. */
export function isShuffleable(t: AnswerType): boolean {
  return ['multiple_choice', 'true_false', 'multiple_select', 'ordering'].includes(t)
}

// ── answer correctness ─────────────────────────────────────────────────────

export function checkAnswer(q: Question, answer: AnswerValue): boolean {
  switch (q.answer_type) {
    case 'multiple_choice':
    case 'true_false':
      return asChoiceOptions(q).find((c) => c.id === answer)?.is_correct ?? false

    case 'multiple_select': {
      const correctIds = asChoiceOptions(q).filter((c) => c.is_correct).map((c) => c.id).sort()
      const givenIds   = [...(answer as string[])].sort()
      return JSON.stringify(correctIds) === JSON.stringify(givenIds)
    }

    case 'short_answer': {
      const { accepted, case_sensitive } = asShortAnswer(q)
      const given = (answer as string).trim()
      return accepted.some((a) =>
        case_sensitive ? a === given : a.toLowerCase() === given.toLowerCase()
      )
    }

    case 'ordering': {
      const correct = [...asOrderingOptions(q)]
        .sort((a, b) => a.correct_position - b.correct_position)
        .map((o) => o.id)
      return JSON.stringify(correct) === JSON.stringify(answer as string[])
    }

    case 'matching': {
      const { correct_pairs } = asMatching(q)
      const given = answer as Record<string, string>
      return Object.entries(correct_pairs).every(([l, r]) => given[l] === r)
    }

    case 'fill_in_blank': {
      const { blanks } = asFillInBlank(q)
      const given = answer as Record<string, string>
      return blanks.every(({ id, accepted }) => {
        const userAnswer = (given[id] ?? '').trim().toLowerCase()
        return accepted.some((a) => a.toLowerCase() === userAnswer)
      })
    }

    default:
      return false
  }
}
