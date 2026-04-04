// scripts/import-sol-questions.ts
// Reads extracted+aligned JSON from data/sol-extracted/ and imports questions
// into the questions_pending table for admin review.
//
// Usage:
//   npx tsx scripts/import-sol-questions.ts [--grades=3,4,5] [--subject=math|reading] [--year=2014] [--dry-run]
//
// Only green, yellow, and regraded questions are imported. Red are skipped.
// Deduplication: fuzzy match on question_text against existing questions.
//
// Local dev: connects to Supabase via docker exec (bypasses unreliable port forwarding on Windows).
// Remote:    set DATABASE_URL in .env.local and it uses a direct Postgres connection.

import { Pool } from 'pg'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function getArg(flag: string) {
  return process.argv.find(a => a.startsWith(`--${flag}=`))?.split('=')[1]
}

function normalizeForDedup(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim().slice(0, 200)
}

/** Escape a value for inline SQL using dollar-quoting (safe for any text content). */
function sqlLiteral(v: unknown): string {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  if (typeof v === 'number') return String(v)
  // Dollar-quote with a unique tag to handle any content including $$ sequences
  const s = String(v)
  return `$SOLIMPORT$${s}$SOLIMPORT$`
}

// ── DB abstraction (local = docker exec, remote = pg pool) ───────────────────

const DOCKER_CONTAINER = 'supabase_db_SPL-SOL'
const isLocal = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').includes('127.0.0.1')

function dockerQuery(sql: string): string {
  return execSync(
    `docker exec ${DOCKER_CONTAINER} psql -U postgres -d postgres -t -A -c "${sql.replace(/"/g, '\\"')}"`,
    { encoding: 'utf-8' }
  ).trim()
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const gradesArg = getArg('grades')
  const subjectFilter = getArg('subject') as 'math' | 'reading' | undefined
  const yearFilter = getArg('year') ? Number(getArg('year')) : undefined

  const grades = gradesArg ? gradesArg.split(',').map(Number) : [3, 4, 5, 6, 7, 8]
  const subjects: Array<'math' | 'reading'> = subjectFilter ? [subjectFilter] : ['math', 'reading']

  // Remote connection setup
  let pool: Pool | null = null
  if (!isLocal) {
    const pgUrl = process.env.DATABASE_URL ?? ''
    if (!pgUrl) {
      console.error('For remote: set DATABASE_URL in .env.local (Supabase Dashboard → Settings → Database → Connection string)')
      process.exit(1)
    }
    pool = new Pool({ connectionString: pgUrl })
  }

  // Build file queue
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

  // Load existing fingerprints for dedup
  console.log('Loading existing question fingerprints for dedup...')
  const existingFingerprints = new Set<string>()

  if (isLocal) {
    const out = dockerQuery(
      'SELECT question_text FROM questions UNION ALL SELECT question_text FROM questions_pending'
    )
    if (out) out.split('\n').forEach(line => existingFingerprints.add(normalizeForDedup(line)))
  } else {
    const { rows } = await pool!.query<{ question_text: string }>(
      `SELECT question_text FROM questions UNION ALL SELECT question_text FROM questions_pending`
    )
    rows.forEach(r => existingFingerprints.add(normalizeForDedup(r.question_text)))
  }
  console.log(`  ${existingFingerprints.size} existing fingerprints loaded\n`)

  let totalGreen = 0, totalYellow = 0, totalRegraded = 0, totalRed = 0, totalDupes = 0, totalInserted = 0, totalFailed = 0

  for (const filePath of queue) {
    const extracted: ExtractedFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    const { grade, subject, year, passages, questions } = extracted
    const sourceTest = `${year} Grade ${grade} ${subject === 'math' ? 'Math' : 'Reading'}`

    console.log(`📦 ${sourceTest}`)
    console.log(`   ${questions.length} questions — 🟢 ${questions.filter(q => q.tier === 'green').length}  🟡 ${questions.filter(q => q.tier === 'yellow').length}  🔄 ${questions.filter(q => q.tier === 'regraded').length}  🔴 ${questions.filter(q => q.tier === 'red').length}`)

    // Build INSERT statements for this file
    const inserts: string[] = []
    let fileInserted = 0, fileDupes = 0, fileSkippedRed = 0, fileRegraded = 0

    for (const q of questions) {
      if (q.tier === 'red') { fileSkippedRed++; totalRed++; continue }

      const questionText = q.tier === 'yellow' && q.rewritten_question_text
        ? q.rewritten_question_text : q.question_text

      const fingerprint = normalizeForDedup(questionText)
      if (existingFingerprints.has(fingerprint)) { fileDupes++; totalDupes++; continue }

      const importGrade = q.tier === 'regraded' && q.correct_grade ? q.correct_grade : grade
      const passage = q.reading_passage_index !== null ? (passages[q.reading_passage_index]?.text ?? null) : null

      if (!dryRun) {
        inserts.push(
          `INSERT INTO questions_pending
            (grade, subject, topic, sol_standard, question_text, simplified_text,
             answer_type, choices, hint_1, hint_2, hint_3, calculator_allowed,
             image_svg, difficulty, source, source_year, source_test,
             reading_passage, standards_rewritten, status)
           VALUES (
             ${sqlLiteral(importGrade)}, ${sqlLiteral(subject)}, ${sqlLiteral(q.matched_topic)},
             ${sqlLiteral(q.matched_standard)}, ${sqlLiteral(questionText)}, NULL,
             'multiple_choice', ${sqlLiteral(JSON.stringify(q.choices))}::jsonb,
             NULL, NULL, NULL, ${sqlLiteral(q.calculator_allowed)},
             NULL, NULL, 'doe_released', ${sqlLiteral(year)}, ${sqlLiteral(sourceTest)},
             ${sqlLiteral(passage)}, ${sqlLiteral(q.tier === 'yellow')}, 'pending'
           );`
        )
      }

      existingFingerprints.add(fingerprint)
      fileInserted++
      totalInserted++
      if (q.tier === 'green') totalGreen++
      else if (q.tier === 'yellow') totalYellow++
      else { totalRegraded++; fileRegraded++ }
    }

    // Execute inserts for this file
    if (!dryRun && inserts.length > 0) {
      const sqlPath = path.join('data', '_import_batch.sql')
      fs.mkdirSync('data', { recursive: true })
      fs.writeFileSync(sqlPath, inserts.join('\n'))

      try {
        if (isLocal) {
          // Copy SQL file into container and execute
          execSync(`docker cp "${sqlPath}" ${DOCKER_CONTAINER}:/tmp/import_batch.sql`, { stdio: 'pipe' })
          execSync(`docker exec ${DOCKER_CONTAINER} psql -U postgres -d postgres -f /tmp/import_batch.sql`, { stdio: 'pipe' })
        } else {
          await pool!.query(inserts.join('\n'))
        }
      } catch (e) {
        console.log(`   ⚠️  Batch insert failed: ${(e as Error).message}`)
        totalFailed += inserts.length
        totalInserted -= inserts.length
        // Revert tier counts for this file
        totalGreen -= questions.filter(q => q.tier === 'green' && !existingFingerprints.has(normalizeForDedup(q.question_text))).length
      }
    }

    console.log(`   ✅ ${fileInserted} inserted  ⏭️  ${fileDupes} dupes  ❌ ${fileSkippedRed} red  🔄 ${fileRegraded} regraded\n`)
  }

  // Cleanup temp file
  const tmpSql = path.join('data', '_import_batch.sql')
  if (fs.existsSync(tmpSql)) fs.unlinkSync(tmpSql)

  console.log('─'.repeat(50))
  console.log(`Total inserted:  ${totalInserted}  (🟢 ${totalGreen} green, 🟡 ${totalYellow} yellow, 🔄 ${totalRegraded} regraded)`)
  console.log(`Total skipped:   ${totalRed} red (removed from SOL) + ${totalDupes} duplicates`)
  if (totalFailed > 0) console.log(`Total failed:    ${totalFailed} (check errors above)`)
  console.log('\nReview pending questions at /admin/questions')

  if (pool) await pool.end()
}

main().catch((e) => { console.error(e); process.exit(1) })
