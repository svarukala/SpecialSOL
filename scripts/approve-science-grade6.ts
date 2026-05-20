import { createClient } from '@supabase/supabase-js'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

async function main() {
  const { data: pending, error: fetchErr } = await db
    .from('questions_pending')
    .select('*')
    .eq('grade', 6)
    .eq('subject', 'science')
    .eq('status', 'pending')

  if (fetchErr) { console.error('Fetch failed:', fetchErr.message); process.exit(1) }
  if (!pending?.length) { console.log('No pending grade 6 science questions found.'); return }
  console.log(`Found ${pending.length} questions to publish...\n`)

  let published = 0
  let skipped = 0
  let failed = 0

  for (const q of pending) {
    const { data: existing } = await db
      .from('questions')
      .select('id')
      .eq('sol_standard', q.sol_standard)
      .eq('question_text', q.question_text)
      .maybeSingle()

    if (existing) {
      console.log(`  ~ skipped (already published): ${q.question_text.slice(0, 60)}...`)
      skipped++
      continue
    }

    const { error: insertErr } = await db.from('questions').insert({
      grade: q.grade,
      subject: q.subject,
      topic: q.topic,
      subtopic: q.subtopic,
      sol_standard: q.sol_standard,
      difficulty: q.difficulty,
      question_text: q.question_text,
      simplified_text: q.simplified_text,
      answer_type: q.answer_type,
      choices: q.choices,
      hint_1: q.hint_1,
      hint_2: q.hint_2,
      hint_3: q.hint_3,
      calculator_allowed: q.calculator_allowed,
      source: q.source,
    })

    if (insertErr) {
      console.error(`  ✗ insert failed (${q.topic}): ${insertErr.message}`)
      failed++
      continue
    }

    await db
      .from('questions_pending')
      .update({ status: 'approved' })
      .eq('id', q.id)

    console.log(`  ✓ ${q.sol_standard} | ${q.topic} | ${q.question_text.slice(0, 55)}...`)
    published++
  }

  console.log(`\n✓ Published: ${published}`)
  if (skipped) console.log(`~ Skipped (duplicates): ${skipped}`)
  if (failed) console.log(`✗ Failed: ${failed}`)
}

main().catch(err => { console.error(err); process.exit(1) })
