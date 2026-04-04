// scripts/import-sol-questions.ts
// Reads extracted+aligned JSON from data/sol-extracted/ and imports questions
// into the questions_pending table for admin review.
//
// Usage:
//   npx tsx scripts/import-sol-questions.ts [--grades=3,4,5] [--subject=math|reading] [--year=2014] [--dry-run]
//
// Only green and yellow questions are imported.
// Red questions are skipped (already logged to -rejected.json by the extractor).
//
// Deduplication: fuzzy match on question_text — if a normalized form of the
// question already exists in questions or questions_pending, it is skipped.

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load .env.local for local dev
dotenv.config({ path: '.env.local' })

// ── Types (mirror the extracted JSON) ───────────────────────────────────────

interface ExtractedChoice {
  id: string
  text: string
  is_correct: boolean
}

interface ExtractedQuestion {
  question_number: number
  question_text: string
  choices: ExtractedChoice[]
  has_diagram: boolean
  diagram_description: string | null
  calculator_allowed: boolean
  reading_passage_index: number | null
  tier: 'green' | 'yellow' | 'regraded' | 'red'
  matched_topic: string | null
  matched_standard: string | null
  alignment_reason: string
  rewritten_question_text: string | null
  correct_grade: number | null
}

interface ExtractedPassage {
  index: number
  title: string | null
  text: string
}

interface ExtractedFile {
  grade: number
  subject: 'math' | 'reading'
  year: number
  extractedAt: string
  passages: ExtractedPassage[]
  questions: ExtractedQuestion[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getArg(flag: string) {
  return process.argv.find(a => a.startsWith(`--${flag}=`))?.split('=')[1]
}

/** Normalize question text for deduplication: lowercase, collapse whitespace, strip punctuation. */
function normalizeForDedup(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200)  // only compare the first 200 chars to avoid false negatives from trailing edits
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const gradesArg = getArg('grades')
  const subjectFilter = getArg('subject') as 'math' | 'reading' | undefined
  const yearFilter = getArg('year') ? Number(getArg('year')) : undefined

  const grades = gradesArg ? gradesArg.split(',').map(Number) : [3, 4, 5, 6, 7, 8]
  const subjects: Array<'math' | 'reading'> = subjectFilter ? [subjectFilter] : ['math', 'reading']

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
    process.exit(1)
  }

  const db = createClient(supabaseUrl, serviceKey)

  // Build list of extracted JSON files to process
  const queue: string[] = []
  for (const grade of grades.sort()) {
    for (const subject of subjects) {
      const dir = path.join('data', 'sol-extracted', `grade-${grade}`, subject)
      if (!fs.existsSync(dir)) continue
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') && !f.endsWith('-rejected.json'))
      for (const file of files) {
        const year = parseInt(file.replace('.json', ''), 10)
        if (isNaN(year)) continue
        if (yearFilter && year !== yearFilter) continue
        queue.push(path.join(dir, file))
      }
    }
  }

  if (queue.length === 0) {
    console.log('No extracted JSON files found. Run extract-align-sol-questions.ts first.')
    return
  }

  console.log(`Found ${queue.length} extracted files to import\n`)
  if (dryRun) console.log('[dry-run] No database writes will occur.\n')

  // Pre-load existing question fingerprints for deduplication
  console.log('Loading existing question fingerprints for dedup...')
  const { data: existingQuestions } = await db
    .from('questions')
    .select('question_text')
    .in('subject', ['math', 'reading'])

  const { data: existingPending } = await db
    .from('questions_pending')
    .select('question_text')

  const existingFingerprints = new Set<string>()
  for (const q of existingQuestions ?? []) existingFingerprints.add(normalizeForDedup(q.question_text))
  for (const q of existingPending ?? []) existingFingerprints.add(normalizeForDedup(q.question_text))
  console.log(`  ${existingFingerprints.size} existing fingerprints loaded\n`)

  let totalGreen = 0, totalYellow = 0, totalRegraded = 0, totalRed = 0, totalDupes = 0, totalInserted = 0, totalFailed = 0

  for (const filePath of queue) {
    const raw = fs.readFileSync(filePath, 'utf-8')
    const extracted: ExtractedFile = JSON.parse(raw)
    const { grade, subject, year, passages, questions } = extracted

    const sourceTest = `${year} Grade ${grade} ${subject === 'math' ? 'Math' : 'Reading'}`
    console.log(`📦 ${sourceTest}`)
    console.log(`   ${questions.length} questions — green: ${questions.filter(q => q.tier === 'green').length}, yellow: ${questions.filter(q => q.tier === 'yellow').length}, red: ${questions.filter(q => q.tier === 'red').length}`)

    let fileInserted = 0, fileDupes = 0, fileSkippedRed = 0, fileRegraded = 0

    for (const q of questions) {
      if (q.tier === 'red') {
        fileSkippedRed++
        totalRed++
        continue
      }

      const questionText = q.tier === 'yellow' && q.rewritten_question_text
        ? q.rewritten_question_text
        : q.question_text

      const fingerprint = normalizeForDedup(questionText)
      if (existingFingerprints.has(fingerprint)) {
        fileDupes++
        totalDupes++
        continue
      }

      const passage = q.reading_passage_index !== null
        ? (passages[q.reading_passage_index]?.text ?? null)
        : null

      // For regraded questions, use the correct grade instead of the source test's grade
      const importGrade = q.tier === 'regraded' && q.correct_grade ? q.correct_grade : grade

      const row = {
        grade: importGrade,
        subject,
        topic: q.matched_topic,
        sol_standard: q.matched_standard,
        question_text: questionText,
        simplified_text: null,
        answer_type: 'multiple_choice',
        choices: q.choices,
        hint_1: null,
        hint_2: null,
        hint_3: null,
        calculator_allowed: q.calculator_allowed,
        image_svg: null,
        difficulty: null,
        source: 'doe_released' as const,
        source_year: year,
        source_test: sourceTest,
        reading_passage: passage,
        standards_rewritten: q.tier === 'yellow',
        status: 'pending' as const,
      }

      if (dryRun) {
        fileInserted++
        totalInserted++
        existingFingerprints.add(fingerprint)
        if (q.tier === 'green') totalGreen++
        else if (q.tier === 'yellow') totalYellow++
        else { totalRegraded++; fileRegraded++ }
        continue
      }

      const { error } = await db.from('questions_pending').insert(row)
      if (error) {
        console.log(`   ⚠️  Insert failed for Q${q.question_number}: ${error.message}`)
        totalFailed++
      } else {
        fileInserted++
        totalInserted++
        existingFingerprints.add(fingerprint)  // prevent duplicates within this run
        if (q.tier === 'green') totalGreen++
        else if (q.tier === 'yellow') totalYellow++
        else { totalRegraded++; fileRegraded++ }
      }
    }

    console.log(`   ✅ ${fileInserted} inserted  ⏭️  ${fileDupes} dupes  ❌ ${fileSkippedRed} red  🔄 ${fileRegraded} regraded\n`)
  }

  console.log('─'.repeat(50))
  console.log(`Total inserted:  ${totalInserted}  (🟢 ${totalGreen} green, 🟡 ${totalYellow} yellow — flagged for review, 🔄 ${totalRegraded} regraded to correct grade)`)
  console.log(`Total skipped:   ${totalRed} red (removed from SOL) + ${totalDupes} duplicates`)
  if (totalFailed > 0) console.log(`Total failed:    ${totalFailed} (check errors above)`)
  console.log('\nReview pending questions at /admin/questions')
}

main().catch((e) => { console.error(e); process.exit(1) })
