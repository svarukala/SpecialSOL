/**
 * insert-pending.ts
 *
 * Reads a JSON file of pre-generated questions and inserts them into
 * questions_pending for admin review. No Anthropic API key required —
 * use this when generating questions directly via Claude Code in the terminal.
 *
 * Usage:
 *   npx tsx scripts/insert-pending.ts --file tmp/questions.json [--dry-run]
 *
 * JSON format: see tmp/questions-template.json for a complete example.
 *
 * Each question object must have:
 *   grade, subject, topic, tier, difficulty, answer_type,
 *   question_text, simplified_text, choices,
 *   hint_1, hint_2, hint_3
 *
 * Optional fields (null if omitted):
 *   subtopic, sol_standard, reading_passage, calculator_allowed, image_svg
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const db = createClient(url, key, { auth: { persistSession: false } })

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(`--${flag}`)
  return idx !== -1 ? process.argv[idx + 1] : undefined
}

type AnswerType = 'multiple_choice' | 'multiple_select' | 'fill_in_blank'

interface QuestionRow {
  grade: number
  subject: string
  topic: string
  subtopic?: string | null
  sol_standard?: string | null
  tier: 'standard' | 'foundational'
  difficulty: 1 | 2 | 3
  answer_type: AnswerType
  question_text: string
  simplified_text: string
  choices: unknown
  reading_passage?: string | null
  calculator_allowed?: boolean
  image_svg?: string | null
  hint_1: string
  hint_2: string
  hint_3: string
}

function validate(q: QuestionRow, idx: number): string[] {
  const errors: string[] = []
  if (!q.grade || typeof q.grade !== 'number') errors.push('grade must be a number')
  if (!q.subject) errors.push('subject is required')
  if (!q.topic) errors.push('topic is required')
  if (!['standard', 'foundational'].includes(q.tier)) errors.push('tier must be standard or foundational')
  if (![1, 2, 3].includes(q.difficulty)) errors.push('difficulty must be 1, 2, or 3')
  if (!['multiple_choice', 'multiple_select', 'fill_in_blank'].includes(q.answer_type)) errors.push('invalid answer_type')
  if (!q.question_text) errors.push('question_text is required')
  if (typeof q.simplified_text !== 'string') errors.push('simplified_text must be a string (use "" if none)')
  if (!q.choices) errors.push('choices is required')
  if (!q.hint_1 || !q.hint_2 || !q.hint_3) errors.push('all three hints are required')
  return errors.map(e => `  [${idx}] ${e}`)
}

async function main() {
  const filePath = getArg('file')
  const dryRun = process.argv.includes('--dry-run')

  if (!filePath) {
    console.error('Usage: npx tsx scripts/insert-pending.ts --file tmp/questions.json [--dry-run]')
    process.exit(1)
  }

  const raw = readFileSync(resolve(filePath), 'utf-8')
  const questions: QuestionRow[] = JSON.parse(raw)

  if (!Array.isArray(questions)) {
    console.error('JSON file must contain an array of question objects')
    process.exit(1)
  }

  console.log(`Loaded ${questions.length} question(s) from ${filePath}\n`)

  // Validate all before inserting anything
  const allErrors = questions.flatMap((q, i) => validate(q, i))
  if (allErrors.length) {
    console.error('Validation errors:\n' + allErrors.join('\n'))
    process.exit(1)
  }

  if (dryRun) {
    console.log('[dry-run] Validation passed. No rows written.\n')
    questions.forEach((q, i) => {
      console.log(`  [${i}] Grade ${q.grade} ${q.subject} / ${q.topic} (${q.tier}, diff:${q.difficulty}) — ${q.answer_type}`)
      console.log(`       ${q.question_text.slice(0, 80)}${q.question_text.length > 80 ? '…' : ''}`)
    })
    return
  }

  const rows = questions.map(q => ({
    grade:              q.grade,
    subject:            q.subject,
    topic:              q.topic,
    subtopic:           q.subtopic ?? null,
    sol_standard:       q.sol_standard ?? null,
    tier:               q.tier,
    difficulty:         q.difficulty,
    answer_type:        q.answer_type,
    question_text:      q.question_text,
    simplified_text:    q.simplified_text,
    choices:            q.choices,
    reading_passage:    q.reading_passage ?? null,
    calculator_allowed: q.calculator_allowed ?? false,
    image_svg:          q.image_svg ?? null,
    hint_1:             q.hint_1,
    hint_2:             q.hint_2,
    hint_3:             q.hint_3,
    status:             'pending',
    source:             'ai_generated',
  }))

  const { error } = await db.from('questions_pending').insert(rows)
  if (error) {
    console.error('Insert failed:', error.message)
    process.exit(1)
  }

  console.log(`✓ ${rows.length} question(s) inserted into questions_pending`)
  console.log('\nReview and approve at /admin/generate')
}

main().catch(err => { console.error(err); process.exit(1) })
