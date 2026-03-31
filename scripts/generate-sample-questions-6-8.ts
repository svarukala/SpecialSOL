// scripts/generate-sample-questions-6-8.ts
// Generates one topic of questions for each of grades 6, 7, 8 (math + reading)
// and inserts them into questions_pending for review/approval via the admin UI.
//
// Usage:
//   npx tsx scripts/generate-sample-questions-6-8.ts [--dry-run]
//
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { generateTopic } from '../lib/generation/generate-topic'
import { SOL_CURRICULUM } from '../lib/curriculum/sol-curriculum'

config({ path: process.env.ENV_FILE ?? '.env.local', override: true })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// One representative topic per grade per subject for the sample run
const SAMPLE_TOPICS: Array<{ grade: number; subject: 'math' | 'reading'; topicIndex: number }> = [
  { grade: 6, subject: 'math',    topicIndex: 0 }, // integers and absolute value
  { grade: 6, subject: 'reading', topicIndex: 0 }, // vocabulary and word analysis
  { grade: 7, subject: 'math',    topicIndex: 0 }, // rational numbers
  { grade: 7, subject: 'reading', topicIndex: 0 }, // vocabulary and figurative language
  { grade: 8, subject: 'math',    topicIndex: 0 }, // real numbers and irrational numbers
  { grade: 8, subject: 'reading', topicIndex: 0 }, // vocabulary and etymology
]

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  if (dryRun) console.log('[dry-run] No questions will be inserted.\n')

  for (const { grade, subject, topicIndex } of SAMPLE_TOPICS) {
    const topic = SOL_CURRICULUM[grade][subject][topicIndex]
    console.log(`\nGenerating Grade ${grade} ${subject} — "${topic.name}" (SOL ${topic.solStandard})...`)

    let questions
    try {
      questions = await generateTopic(grade, subject, topic, 'standard')
    } catch (err) {
      console.error(`  ✗ Generation failed: ${(err as Error).message}`)
      continue
    }

    console.log(`  Generated ${questions.length} questions`)

    if (dryRun) {
      questions.forEach((q, i) => console.log(`  [${i + 1}] ${q.question_text.slice(0, 80)}...`))
      continue
    }

    const rows = questions.map(q => ({
      grade:            q.grade,
      subject:          q.subject,
      topic:            q.topic,
      subtopic:         q.subtopic,
      sol_standard:     q.sol_standard,
      difficulty:       q.difficulty,
      question_text:    q.question_text,
      simplified_text:  q.simplified_text,
      image_svg:        q.image_svg ?? null,
      answer_type:      q.answer_type,
      choices:          q.choices,
      hint_1:           q.hint_1,
      hint_2:           q.hint_2,
      hint_3:           q.hint_3,
      calculator_allowed: q.calculator_allowed,
      source:           'ai_generated',
      status:           'pending',
    }))

    const { error } = await supabase.from('questions_pending').insert(rows)
    if (error) {
      console.error(`  ✗ Insert failed: ${error.message}`)
    } else {
      console.log(`  ✓ Inserted ${rows.length} questions into questions_pending`)
    }
  }

  console.log('\nDone. Review and approve questions at /admin/generate')
}

main().catch(e => { console.error(e); process.exit(1) })
