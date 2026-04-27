/**
 * Approves all pending foundational questions and pushes them to prod.
 * Run after generate-all-questions-by-grade.ts completes.
 *
 * Usage: npx tsx scripts/publish-and-push-foundational.ts
 */
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local', override: true })

const LOCAL_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const LOCAL_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const PROD_URL = 'https://cpcsxocziapgqpbtfytr.supabase.co'
const PROD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwY3N4b2N6aWFwZ3FwYnRmeXRyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDMyMTI2NywiZXhwIjoyMDg5ODk3MjY3fQ.DnJQTrQ_zmUj6rHeQD5vntfEybG9PLGPcD3d4kbqAQE'

const BATCH_SIZE = 100

const local = createClient(LOCAL_URL, LOCAL_KEY)

async function approvePending(): Promise<any[]> {
  console.log('\n── Step 1: Approving pending foundational questions ──')

  const { data: pending, error } = await local
    .from('questions_pending')
    .select('*')
    .eq('status', 'pending')
    .eq('tier', 'foundational')

  if (error) throw new Error(`Fetch pending failed: ${error.message}`)
  if (!pending?.length) { console.log('No pending foundational questions found.'); return [] }

  console.log(`Found ${pending.length} pending questions.`)

  const approved: any[] = []
  let skipped = 0

  for (const q of pending) {
    // Duplicate check
    const { data: existing } = await local
      .from('questions')
      .select('id')
      .eq('sol_standard', q.sol_standard)
      .eq('question_text', q.question_text)
      .maybeSingle()

    if (existing) { skipped++; continue }

    const row = {
      grade: q.grade, subject: q.subject, topic: q.topic, subtopic: q.subtopic,
      sol_standard: q.sol_standard, difficulty: q.difficulty,
      question_text: q.question_text, simplified_text: q.simplified_text,
      image_svg: q.image_svg ?? null, answer_type: q.answer_type,
      choices: q.choices, hint_1: q.hint_1, hint_2: q.hint_2, hint_3: q.hint_3,
      calculator_allowed: q.calculator_allowed, source: 'ai_generated',
      tier: 'foundational',
      source_year: q.source_year ?? null, source_test: q.source_test ?? null,
      reading_passage: q.reading_passage ?? null,
      standards_rewritten: q.standards_rewritten ?? false,
    }

    const { data: inserted, error: insertErr } = await local
      .from('questions')
      .insert(row)
      .select('id')
      .single()

    if (insertErr) { console.error(`  Failed: ${insertErr.message}`); continue }

    // Mark pending as approved
    await local.from('questions_pending').update({ status: 'approved' }).eq('id', q.id)
    approved.push({ ...row, id: inserted.id })
  }

  console.log(`  Approved: ${approved.length}  Skipped (duplicates): ${skipped}`)
  return approved
}

async function pushToProd(questions: any[]) {
  if (!questions.length) { console.log('\nNo new questions to push to prod.'); return }

  console.log(`\n── Step 2: Pushing ${questions.length} questions to prod ──`)

  let pushed = 0
  for (let i = 0; i < questions.length; i += BATCH_SIZE) {
    const batch = questions.slice(i, i + BATCH_SIZE)
    const res = await fetch(`${PROD_URL}/rest/v1/questions`, {
      method: 'POST',
      headers: {
        apikey: PROD_KEY,
        Authorization: `Bearer ${PROD_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(batch),
    })
    if (!res.ok) throw new Error(`Prod push failed: ${res.status} ${await res.text()}`)
    pushed += batch.length
    process.stdout.write(`\r  ${pushed}/${questions.length}`)
  }
  console.log('\n  Done!')
}

async function getProdCount() {
  const res = await fetch(`${PROD_URL}/rest/v1/questions?tier=eq.foundational&select=id`, {
    headers: { apikey: PROD_KEY, Authorization: `Bearer ${PROD_KEY}`, Prefer: 'count=exact', Range: '0-0' },
  })
  return res.headers.get('content-range')?.split('/')[1] ?? '?'
}

async function main() {
  const newQuestions = await approvePending()
  await pushToProd(newQuestions)

  const prodCount = await getProdCount()
  console.log(`\n✓ Prod now has ${prodCount} foundational questions.`)
}

main().catch(err => { console.error(err); process.exit(1) })
