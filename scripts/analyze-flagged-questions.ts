/**
 * analyze-flagged-questions.ts
 *
 * Pulls every feedback entry in category 'question_error' or 'child_confused',
 * fetches the associated question content, and prints a structured report.
 *
 * Run against prod:
 *   NEXT_PUBLIC_SUPABASE_URL=https://cpcsxocziapgqpbtfytr.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=<key> \
 *   npx tsx scripts/analyze-flagged-questions.ts
 *
 * Or with .env.prod values loaded automatically:
 *   npx dotenv -e .env.prod -- npx tsx scripts/analyze-flagged-questions.ts
 */

import { createClient } from '@supabase/supabase-js'

const FLAGGED_CATEGORIES = ['question_error', 'child_confused'] as const

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const db = createClient(url, key, { auth: { persistSession: false } })

interface FeedbackRow {
  id: string
  category: string
  message: string | null
  status: string
  created_at: string
  question_id: string | null
  session_id: string | null
}

interface QuestionRow {
  id: string
  grade: number
  subject: string
  topic: string
  difficulty: number
  question_text: string
  simplified_text: string | null
  answer_type: string
  choices: unknown
  hint_1: string | null
  hint_2: string | null
  hint_3: string | null
  source: string
}

interface FeedbackCount {
  question_id: string
  question_error: number
  child_confused: number
  total: number
  messages: string[]
  latestAt: string
}

async function main() {
  console.log('Fetching flagged feedback from', url, '\n')

  const statusFilter = process.argv.includes('--all') ? [] : ['new']
  let query = db
    .from('feedback')
    .select('id, category, message, status, created_at, question_id, session_id')
    .in('category', FLAGGED_CATEGORIES)
    .order('created_at', { ascending: false })
  if (statusFilter.length) query = query.in('status', statusFilter)
  const { data: feedback, error: fbErr } = await query

  if (fbErr) { console.error('Feedback fetch failed:', fbErr.message); process.exit(1) }
  if (!feedback?.length) { console.log('No flagged feedback found.'); return }

  console.log(`Found ${feedback.length} flagged feedback entries.\n`)

  // Aggregate by question_id
  const byQuestion = new Map<string, FeedbackCount>()
  const noQuestionRows: FeedbackRow[] = []

  for (const f of feedback as FeedbackRow[]) {
    if (!f.question_id) { noQuestionRows.push(f); continue }
    const existing = byQuestion.get(f.question_id)
    if (existing) {
      existing.total++
      if (f.category === 'question_error') existing.question_error++
      if (f.category === 'child_confused') existing.child_confused++
      if (f.message) existing.messages.push(f.message)
      if (f.created_at > existing.latestAt) existing.latestAt = f.created_at
    } else {
      byQuestion.set(f.question_id, {
        question_id: f.question_id,
        question_error: f.category === 'question_error' ? 1 : 0,
        child_confused: f.category === 'child_confused' ? 1 : 0,
        total: 1,
        messages: f.message ? [f.message] : [],
        latestAt: f.created_at,
      })
    }
  }

  // Sort: most-flagged first
  const sorted = [...byQuestion.values()].sort((a, b) => b.total - a.total)

  // Fetch all distinct questions in one shot
  const questionIds = sorted.map(r => r.question_id)
  const { data: questions, error: qErr } = await db
    .from('questions')
    .select('id, grade, subject, topic, difficulty, question_text, simplified_text, answer_type, choices, hint_1, hint_2, hint_3, source')
    .in('id', questionIds)

  if (qErr) { console.error('Questions fetch failed:', qErr.message); process.exit(1) }

  const qMap = new Map((questions as QuestionRow[]).map(q => [q.id, q]))

  // ── REPORT ─────────────────────────────────────────────────────────────────

  console.log('═'.repeat(80))
  console.log('FLAGGED QUESTIONS REPORT')
  console.log('═'.repeat(80))
  console.log()

  for (const agg of sorted) {
    const q = qMap.get(agg.question_id)
    console.log(`▶ ${agg.total}x flagged  [error:${agg.question_error} confused:${agg.child_confused}]  last: ${agg.latestAt.slice(0,10)}`)
    console.log(`  ID: ${agg.question_id}`)

    if (!q) {
      console.log('  ⚠  Question not found (may have been deleted)')
      console.log()
      continue
    }

    console.log(`  Grade ${q.grade} · ${q.subject} · ${q.topic} · difficulty ${q.difficulty} · source: ${q.source}`)
    console.log()
    console.log(`  QUESTION: ${q.question_text}`)
    if (q.simplified_text) console.log(`  SIMPLIFIED: ${q.simplified_text}`)
    console.log()
    console.log(`  ANSWER TYPE: ${q.answer_type}`)

    const choices = q.choices as Array<{ id: string; text: string; is_correct: boolean }>
    if (Array.isArray(choices)) {
      const correct = choices.filter(c => c.is_correct)
      const wrong = choices.filter(c => !c.is_correct)
      console.log(`  CORRECT: ${correct.map(c => c.text).join(' | ')}`)
      console.log(`  DISTRACTORS: ${wrong.map(c => c.text).join(' | ')}`)
    }

    console.log()
    if (q.hint_1) console.log(`  HINT 1: ${q.hint_1}`)
    if (q.hint_2) console.log(`  HINT 2: ${q.hint_2}`)
    if (q.hint_3) console.log(`  HINT 3: ${q.hint_3}`)

    if (agg.messages.length > 0) {
      console.log()
      console.log('  STUDENT MESSAGES:')
      for (const m of agg.messages) console.log(`    • ${m}`)
    }

    // ── quick heuristic checks ──────────────────────────────────────────────
    const issues: string[] = []

    if (Array.isArray(choices)) {
      const correctCount = choices.filter(c => c.is_correct).length
      if (correctCount === 0) issues.push('NO correct answer marked')
      if (correctCount > 1) issues.push(`${correctCount} answers marked correct`)
      if (choices.length < 2) issues.push('fewer than 2 choices')

      // Duplicate choice text
      const texts = choices.map(c => c.text.trim().toLowerCase())
      const dupes = texts.filter((t, i) => texts.indexOf(t) !== i)
      if (dupes.length) issues.push(`duplicate choice text: "${dupes[0]}"`)
    }

    // Question text oddities
    if (!q.question_text.trim()) issues.push('empty question text')
    if (q.question_text.length < 10) issues.push('suspiciously short question text')

    if (issues.length) {
      console.log()
      console.log(`  ⚠  DETECTED ISSUES:`)
      for (const issue of issues) console.log(`     - ${issue}`)
    } else {
      console.log()
      console.log('  ✓  No obvious structural issues detected — may be content/wording problem')
    }

    console.log()
    console.log('─'.repeat(80))
    console.log()
  }

  if (noQuestionRows.length) {
    console.log(`${noQuestionRows.length} feedback entries had no question_id (session-level or parent feedback) — skipped.`)
    console.log()
  }

  // ── SUMMARY TABLE ──────────────────────────────────────────────────────────
  console.log('SUMMARY (sorted by flag count)')
  console.log(`${'Flags'.padEnd(6)} ${'Grade'.padEnd(6)} ${'Subject'.padEnd(8)} ${'Difficulty'.padEnd(11)} ${'Question (truncated)'}`)
  console.log('-'.repeat(80))
  for (const agg of sorted) {
    const q = qMap.get(agg.question_id)
    const grade = q ? String(q.grade) : '?'
    const subj = q ? q.subject : '?'
    const diff = q ? String(q.difficulty) : '?'
    const text = q ? q.question_text.slice(0, 50).replace(/\n/g, ' ') : '(deleted)'
    console.log(`${String(agg.total).padEnd(6)} ${grade.padEnd(6)} ${subj.padEnd(8)} ${diff.padEnd(11)} ${text}…`)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
