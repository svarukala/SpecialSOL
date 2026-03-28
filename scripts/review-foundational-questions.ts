// scripts/review-foundational-questions.ts
// Reviews all foundational questions against updated criteria using LLM-as-judge.
// Deletes questions that fail. Prints a final report.
//
// Usage:
//   npx tsx scripts/review-foundational-questions.ts [--dry-run]
//
import { config } from 'dotenv'
import { writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

config({ path: process.env.ENV_FILE ?? '.env.local', override: true })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const PAGE_SIZE = 50
// Small pause between judge calls to avoid rate-limiting
const PAUSE_MS = 300

interface QuestionRow {
  id: string
  subject: string
  topic: string
  difficulty: number
  question_text: string
}

interface JudgeResult {
  verdict: 'PASS' | 'FAIL'
  reason: string
}

function buildJudgePrompt(q: QuestionRow): string {
  return `You are a strict quality judge for foundational-tier elementary school practice questions.

Foundational tier is for children significantly behind grade level. Apply ALL criteria below.

CRITERIA — a question FAILS if ANY of these are true:
1. MULTI-STEP: Requires more than one mental operation to answer.
   - FAIL examples: "Each picture = 5 boxes, Monday has 4 pictures, how many boxes?" (multiply then nothing, but scale factor itself adds a step); "Read the table then compute a fraction"; "Round X then compare"
   - PASS example: "There are 8 apples. Sam eats 3. How many are left?" (one subtraction)
2. LARGE NUMBERS: Uses numbers over 20 in addition/subtraction context, or over 10 in multiplication context.
   - FAIL: "Sam has 486 apples. He gives away 253." (three-digit arithmetic)
   - FAIL: "What is 567 + 218?" (large numbers, also pure arithmetic with no story context)
   - PASS: "Sam has 8 apples. He eats 3. How many left?"
3. LONG SENTENCES: Any single sentence exceeds 10 words.
4. ABSTRACT / JARGON-HEAVY: Uses difficult vocabulary or abstract phrasing not accessible to a struggling reader.
   Examples of too-abstract: estimation strategies, multi-digit rounding, algebraic expressions, complex data interpretation.
5. COMPOUND CONCEPT: Tests more than one skill at once (e.g. "identify the pattern AND state the rule").
6. DIFFICULTY > 1: Is clearly medium or hard difficulty (multi-step, unfamiliar context, strong distractors required).

A question PASSES if:
- It tests exactly one simple skill
- Numbers are small and concrete
- Language is plain Grade 1–2 level
- A child who struggles with grade-level work could reasonably attempt it

Question details:
  Subject: ${q.subject}
  Topic: ${q.topic}
  Difficulty (as stored): ${q.difficulty}
  Question text: "${q.question_text}"

Reply in this exact format (two lines only):
VERDICT: PASS or FAIL
REASON: one sentence explaining why`
}

async function judgeQuestion(q: QuestionRow): Promise<JudgeResult> {
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 128,
    messages: [{ role: 'user', content: buildJudgePrompt(q) }],
  })

  const text = (message.content[0] as { type: string; text: string }).text.trim()
  const verdictMatch = text.match(/VERDICT:\s*(PASS|FAIL)/i)
  const reasonMatch = text.match(/REASON:\s*(.+)/i)

  return {
    verdict: verdictMatch?.[1]?.toUpperCase() === 'PASS' ? 'PASS' : 'FAIL',
    reason: reasonMatch?.[1]?.trim() ?? text,
  }
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')

  if (dryRun) console.log('[dry-run] No deletions will be made.\n')

  const passed: QuestionRow[] = []
  const failed: Array<QuestionRow & { reason: string }> = []
  const errors: Array<{ id: string; error: string }> = []

  let offset = 0

  while (true) {
    const { data, error } = await supabase
      .from('questions')
      .select('id, subject, topic, difficulty, question_text')
      .eq('tier', 'foundational')
      .range(offset, offset + PAGE_SIZE - 1)

    if (error) { console.error('Fetch error:', error.message); process.exit(1) }
    if (!data || data.length === 0) break

    for (const q of data as QuestionRow[]) {
      try {
        const result = await judgeQuestion(q)
        if (result.verdict === 'FAIL') {
          process.stdout.write('✗')
          failed.push({ ...q, reason: result.reason })
        } else {
          process.stdout.write('.')
          passed.push(q)
        }
      } catch (err) {
        process.stdout.write('!')
        errors.push({ id: q.id, error: (err as Error).message })
      }
      await new Promise((r) => setTimeout(r, PAUSE_MS))
    }
    process.stdout.write('\n')

    if (data.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  console.log(`\nReview complete: ${passed.length} pass  ${failed.length} fail  ${errors.length} errors`)

  // Save full results to file for reference
  const reportPath = 'C:/temp/foundational-review.json'
  writeFileSync(reportPath, JSON.stringify({ passed: passed.map(q => q.id), failed, errors }, null, 2))
  console.log(`Full results saved to ${reportPath}`)

  if (failed.length === 0) {
    console.log('No questions to delete.')
    return
  }

  if (dryRun) {
    console.log(`[dry-run] Would delete ${failed.length} question(s).`)
    return
  }

  const failedIds = failed.map((f) => f.id)

  // Remove session_answers referencing these questions first (FK constraint)
  for (let i = 0; i < failedIds.length; i += 50) {
    const batch = failedIds.slice(i, i + 50)
    const { error } = await supabase.from('session_answers').delete().in('question_id', batch)
    if (error) { console.error(`session_answers cleanup failed:`, error.message); process.exit(1) }
  }

  // Now delete the questions in batches of 50
  for (let i = 0; i < failedIds.length; i += 50) {
    const batch = failedIds.slice(i, i + 50)
    const { error: deleteError } = await supabase
      .from('questions')
      .delete()
      .in('id', batch)
    if (deleteError) {
      console.error(`Deletion batch ${i}–${i + 50} failed:`, deleteError.message)
      process.exit(1)
    }
  }
  console.log(`✓ Deleted ${failed.length} question(s).`)

  // Final counts
  const { count: mathCount } = await supabase.from('questions').select('*', { count: 'exact', head: true }).eq('tier', 'foundational').eq('subject', 'math')
  const { count: readingCount } = await supabase.from('questions').select('*', { count: 'exact', head: true }).eq('tier', 'foundational').eq('subject', 'reading')

  console.log('\n─────────────────────────────────────────')
  console.log('FINAL DATABASE STATE (foundational tier):')
  console.log(`  Math:    ${mathCount} questions remaining`)
  console.log(`  Reading: ${readingCount} questions remaining`)
  console.log(`  Total:   ${(mathCount ?? 0) + (readingCount ?? 0)} questions remaining`)
  console.log('─────────────────────────────────────────')
}

main().catch((e) => { console.error(e); process.exit(1) })
