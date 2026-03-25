// scripts/consolidate-questions.ts
import { readFileSync, readdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { validateQuestionBatch, type GeneratedQuestion } from '@/lib/generation/question-schema'

const GENERATED_DIR = join(process.cwd(), 'supabase/seed/generated')
const OUTPUT_FILE = join(process.cwd(), 'supabase/seed/questions.json')

export function deduplicateQuestions(questions: GeneratedQuestion[]): GeneratedQuestion[] {
  const seen = new Set<string>()
  return questions.filter((q) => {
    const key = `${q.sol_standard}::${q.question_text.trim().toLowerCase()}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function main() {
  // Load existing questions.json
  const existing: GeneratedQuestion[] = JSON.parse(readFileSync(OUTPUT_FILE, 'utf-8'))

  // Load all generated files
  const generatedFiles = readdirSync(GENERATED_DIR).filter((f) => f.endsWith('.json') && f !== '.gitkeep')
  const generated: GeneratedQuestion[] = []
  for (const file of generatedFiles) {
    const raw = JSON.parse(readFileSync(join(GENERATED_DIR, file), 'utf-8'))
    try {
      generated.push(...validateQuestionBatch(raw))
    } catch (e) {
      console.error(`Validation failed in ${file}: ${(e as Error).message}`)
      process.exit(1)
    }
  }

  const merged = deduplicateQuestions([...existing, ...generated])
  writeFileSync(OUTPUT_FILE, JSON.stringify(merged, null, 2))

  // Print summary
  const byGradeSubject: Record<string, number> = {}
  for (const q of merged) {
    const key = `Grade ${q.grade} ${q.subject}`
    byGradeSubject[key] = (byGradeSubject[key] ?? 0) + 1
  }
  console.log(`\nConsolidated ${merged.length} questions (${existing.length} existing + ${generated.length} new − duplicates):`)
  for (const [key, count] of Object.entries(byGradeSubject).sort()) {
    console.log(`  ${key}: ${count}`)
  }
}

// Only run main() when invoked directly, not when imported by tests
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
if (process.argv[1] === __filename) main()
