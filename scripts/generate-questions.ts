// scripts/generate-questions.ts
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { config } from 'dotenv'
import { getTopicsForGradeSubject, type SolTopic } from '@/lib/curriculum/sol-curriculum'
import { generateTopic } from '@/lib/generation/generate-topic'

config({ path: '.env.local', override: true })

const OUT_DIR = join(process.cwd(), 'supabase/seed/generated')

function topicSlug(name: string): string {
  return name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
}

async function generateAndSave(grade: number, subject: 'math' | 'reading', topic: SolTopic) {
  console.log(`Generating: Grade ${grade} ${subject} — ${topic.name} (${topic.solStandard})...`)
  try {
    const validated = await generateTopic(grade, subject, topic)
    const slug = topicSlug(topic.name)
    const outPath = join(OUT_DIR, `grade${grade}-${subject}-${slug}.json`)
    writeFileSync(outPath, JSON.stringify(validated, null, 2))
    console.log(`  ✓ ${validated.length} questions → ${outPath}`)
  } catch (e) {
    console.error(`  ✗ ${topic.name}: ${(e as Error).message}`)
  }
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })

  const args = process.argv.slice(2)
  const gradeArg = args.find((a) => a.startsWith('--grade='))?.split('=')[1]
    ?? args[args.indexOf('--grade') + 1]
  const subjectArg = args.find((a) => a.startsWith('--subject='))?.split('=')[1]
    ?? args[args.indexOf('--subject') + 1]
  const topicArg = args.find((a) => a.startsWith('--topic='))?.split('=')[1]
    ?? (args.indexOf('--topic') >= 0 ? args[args.indexOf('--topic') + 1] : undefined)
  const allFlag = args.includes('--all')

  const gradesToRun: number[] = allFlag
    ? [3, 4, 5]
    : gradeArg ? [parseInt(gradeArg)] : []

  const subjectsToRun: ('math' | 'reading')[] = allFlag
    ? ['math', 'reading']
    : subjectArg ? [subjectArg as 'math' | 'reading'] : []

  if (gradesToRun.length === 0 || subjectsToRun.length === 0) {
    console.error('Usage: npx tsx scripts/generate-questions.ts --grade 3 --subject math [--topic "fractions"]')
    console.error('       npx tsx scripts/generate-questions.ts --all')
    process.exit(1)
  }

  for (const grade of gradesToRun) {
    for (const subject of subjectsToRun) {
      const topics = getTopicsForGradeSubject(grade, subject)
      for (const topic of topics) {
        if (topicArg && topic.name !== topicArg) continue
        await generateAndSave(grade, subject, topic)
        // Respectful pause between API calls
        await new Promise((r) => setTimeout(r, 1000))
      }
    }
  }

  console.log('\nDone. Review files in supabase/seed/generated/ before running consolidate:questions.')
}

main().catch((e) => { console.error(e); process.exit(1) })
