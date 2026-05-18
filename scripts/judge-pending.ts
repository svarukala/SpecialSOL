/**
 * judge-pending.ts
 *
 * Formats questions from a JSON file into a structured review for the
 * LLM-as-judge step. No API key required — pipe the output to Claude Code
 * in the terminal and it judges inline.
 *
 * Usage:
 *   npx tsx scripts/judge-pending.ts --file tmp/questions.json
 *
 * Workflow:
 *   1. Generate questions → tmp/questions.json   (Claude Code, no API)
 *   2. npx tsx scripts/judge-pending.ts --file tmp/questions.json
 *   3. Claude reviews output, edits tmp/questions.json as needed
 *   4. npx tsx scripts/insert-pending.ts --file tmp/questions.json
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

const JUDGE_CRITERIA = `
JUDGE CRITERIA — flag any question that fails one or more of these:

CORRECTNESS
  [ ] Exactly one correct answer for multiple_choice; 2+ for multiple_select
  [ ] No ambiguous or partially-correct distractors
  [ ] Answer is factually accurate per current SOL standards

DISTRACTORS
  [ ] No "obviously wrong" distractors (e.g. comically off-topic)
  [ ] No distractors that are correct or defensibly correct
  [ ] Distractors represent plausible misconceptions, not random noise
  [ ] For multiple_select: not too many correct answers (≤ half of choices)

SCOPE & GRADE LEVEL
  [ ] Concept is in scope for the stated grade and SOL standard
  [ ] No vocabulary or prerequisite knowledge beyond grade level
  [ ] Difficulty rating (1/2/3) matches actual cognitive demand

QUESTION CLARITY
  [ ] Question is unambiguous — one clear interpretation
  [ ] No visual-reference dependency (e.g. "in the diagram", "shown above")
  [ ] Stem does not give away the answer
  [ ] Reading passage is null for science (not required)

HINTS
  [ ] hint_1 nudges without giving away the answer
  [ ] hint_2 narrows to the concept
  [ ] hint_3 is close to the answer but still requires student reasoning
  [ ] Hints escalate in specificity (1 → 2 → 3)

SIMPLIFIED TEXT
  [ ] Simplified text is shorter and uses simpler vocabulary
  [ ] Preserves the same question intent
  [ ] Not empty for standard tier (may be "" for foundational)

JUDGE OUTPUT FORMAT — for each flagged question use:
  ✗ [index] ISSUE: <short description>
     FIX: <exact edit to apply>

  If no issues: ✓ [index] OK
`

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(`--${flag}`)
  return idx !== -1 ? process.argv[idx + 1] : undefined
}

function formatChoices(choices: unknown, answerType: string): string {
  if (answerType === 'fill_in_blank') {
    const fib = choices as { template: string; blanks: { id: string; accepted: string[] }[] }
    return `  Template: ${fib.template}\n` +
      fib.blanks.map(b => `  Blank ${b.id}: ${b.accepted.join(' / ')}`).join('\n')
  }
  const arr = choices as Array<{ id: string; text: string; is_correct: boolean }>
  return arr.map(c => `  ${c.is_correct ? '✓' : '✗'} ${c.id}) ${c.text}`).join('\n')
}

async function main() {
  const filePath = getArg('file')
  if (!filePath) {
    console.error('Usage: npx tsx scripts/judge-pending.ts --file tmp/questions.json')
    process.exit(1)
  }

  const raw = readFileSync(resolve(filePath), 'utf-8')
  const questions = JSON.parse(raw) as Array<Record<string, unknown>>

  console.log('═'.repeat(72))
  console.log('LLM JUDGE REVIEW')
  console.log(`File: ${filePath}   Questions: ${questions.length}`)
  console.log('═'.repeat(72))
  console.log(JUDGE_CRITERIA)
  console.log('─'.repeat(72))
  console.log('QUESTIONS TO REVIEW\n')

  questions.forEach((q, i) => {
    console.log(`[${i}] Grade ${q.grade} ${q.subject} / ${q.topic}`)
    console.log(`    SOL: ${q.sol_standard ?? 'n/a'}  |  Tier: ${q.tier}  |  Difficulty: ${q.difficulty}  |  Type: ${q.answer_type}`)
    console.log()
    console.log(`  Q: ${q.question_text}`)
    console.log()
    console.log(`  Simplified: ${q.simplified_text || '(empty)'}`)
    console.log()
    console.log('  Choices:')
    console.log(formatChoices(q.choices, q.answer_type as string))
    console.log()
    if (q.reading_passage) {
      console.log(`  Passage: ${String(q.reading_passage).slice(0, 120)}…`)
      console.log()
    }
    console.log(`  Hint 1: ${q.hint_1}`)
    console.log(`  Hint 2: ${q.hint_2}`)
    console.log(`  Hint 3: ${q.hint_3}`)
    console.log()
    console.log('─'.repeat(72))
  })

  console.log('\nReview each question against the criteria above.')
  console.log('Output your verdict for every question using the format shown.')
  console.log('Then apply any fixes directly to the JSON file before inserting.\n')
}

main().catch(err => { console.error(err); process.exit(1) })
