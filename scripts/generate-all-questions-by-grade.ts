// scripts/generate-all-questions-by-grade.ts
// Generates questions for ALL topics for specified grades and inserts into questions_pending.
//
// Usage:
//   npx tsx scripts/generate-all-questions-by-grade.ts --grades=6,7,8 [--dry-run] [--subject=math|reading] [--tier=standard|foundational]
//
// Generates 6 questions per topic. For grades 6–8 (9 math + 6 reading = 15 topics × 3 grades = 45 batches = 270 questions).
// Each batch makes one API call to Claude. Rate: ~1 call/5s = ~4 minutes total.
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

const PAUSE_MS = 2000 // pause between API calls to avoid rate limits

function getArg(flag: string): string | undefined {
  return process.argv.find(a => a.startsWith(`--${flag}=`))?.split('=')[1]
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const gradesArg = getArg('grades')
  if (!gradesArg) { console.error('Usage: --grades=6,7,8'); process.exit(1) }
  const grades = gradesArg.split(',').map(Number)

  const subjectFilter = getArg('subject') as 'math' | 'reading' | undefined
  const tier = (getArg('tier') ?? 'standard') as 'foundational' | 'standard'

  if (dryRun) console.log('[dry-run] No questions will be inserted.\n')
  console.log(`Generating ${tier} questions for grade(s): ${grades.join(', ')}${subjectFilter ? ` (${subjectFilter} only)` : ''}\n`)

  let totalGenerated = 0, totalFailed = 0

  for (const grade of grades) {
    const curriculum = SOL_CURRICULUM[grade]
    if (!curriculum) {
      console.error(`No curriculum found for grade ${grade}`)
      continue
    }

    const subjects: Array<'math' | 'reading'> = subjectFilter ? [subjectFilter] : ['math', 'reading']

    for (const subject of subjects) {
      const topics = curriculum[subject]
      console.log(`\nGrade ${grade} ${subject} — ${topics.length} topics`)

      for (let i = 0; i < topics.length; i++) {
        const topic = topics[i]
        process.stdout.write(`  [${i + 1}/${topics.length}] "${topic.name}" (${topic.solStandard})... `)

        if (dryRun) {
          console.log('skipped (dry-run)')
          continue
        }

        try {
          const questions = await generateTopic(grade, subject, topic, tier)

          const rows = questions.map(q => ({
            grade:              q.grade,
            subject:            q.subject,
            topic:              q.topic,
            subtopic:           q.subtopic,
            sol_standard:       q.sol_standard,
            difficulty:         q.difficulty,
            question_text:      q.question_text,
            simplified_text:    q.simplified_text ?? q.question_text,
            image_svg:          q.image_svg ?? null,
            answer_type:        q.answer_type,
            choices:            q.choices,
            hint_1:             q.hint_1,
            hint_2:             q.hint_2,
            hint_3:             q.hint_3,
            calculator_allowed: q.calculator_allowed,
            source:             'ai_generated',
            status:             'pending',
            tier,
          }))

          const { error } = await supabase.from('questions_pending').insert(rows)
          if (error) {
            console.log(`✗ insert failed: ${error.message}`)
            totalFailed++
          } else {
            console.log(`✓ ${questions.length} questions`)
            totalGenerated += questions.length
          }
        } catch (err) {
          console.log(`✗ generation failed: ${(err as Error).message}`)
          totalFailed++
        }

        // Pause to avoid rate limits
        await new Promise(r => setTimeout(r, PAUSE_MS))
      }
    }
  }

  console.log(`\n─────────────────────────────────────────`)
  console.log(`Generated: ${totalGenerated} questions  Failed batches: ${totalFailed}`)
  console.log(`\nReview at /admin/generate, then run:`)
  console.log(`  npx tsx scripts/approve-pending-by-grade.ts --grades=${grades.join(',')}`)
}

main().catch(e => { console.error(e); process.exit(1) })
