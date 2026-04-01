// scripts/approve-pending-by-grade.ts
// Bulk-approves all pending questions for specified grades.
// Replicates the approve_pending_question RPC logic using the service role key.
//
// Usage:
//   npx tsx scripts/approve-pending-by-grade.ts --grades=6,7,8 [--dry-run]
//
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: process.env.ENV_FILE ?? '.env.local', override: true })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function getArg(flag: string): string | undefined {
  return process.argv.find(a => a.startsWith(`--${flag}=`))?.split('=')[1]
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const gradesArg = getArg('grades')
  if (!gradesArg) { console.error('Usage: --grades=6,7,8'); process.exit(1) }
  const grades = gradesArg.split(',').map(Number)

  if (dryRun) console.log('[dry-run] No changes will be written.\n')
  console.log(`Approving pending questions for grade(s): ${grades.join(', ')}\n`)

  // Fetch all pending questions for the target grades
  const { data: pending, error: fetchErr } = await supabase
    .from('questions_pending')
    .select('*')
    .eq('status', 'pending')
    .in('grade', grades)

  if (fetchErr) { console.error('Fetch error:', fetchErr.message); process.exit(1) }
  if (!pending || pending.length === 0) {
    console.log('No pending questions found for those grades.')
    return
  }

  console.log(`Found ${pending.length} pending questions.\n`)

  let approved = 0, skipped = 0, failed = 0

  for (const q of pending) {
    // Check for duplicate (same sol_standard + question_text already published)
    const { data: existing } = await supabase
      .from('questions')
      .select('id')
      .eq('sol_standard', q.sol_standard)
      .eq('question_text', q.question_text)
      .maybeSingle()

    if (existing) {
      console.log(`  skip (duplicate): ${q.id} — "${q.question_text.slice(0, 60)}..."`)
      skipped++
      continue
    }

    if (dryRun) {
      console.log(`  would approve: Grade ${q.grade} ${q.subject} — "${q.question_text.slice(0, 60)}..."`)
      approved++
      continue
    }

    // Insert into questions
    const { error: insertErr } = await supabase.from('questions').insert({
      grade:              q.grade,
      subject:            q.subject,
      topic:              q.topic,
      subtopic:           q.subtopic,
      sol_standard:       q.sol_standard,
      difficulty:         q.difficulty,
      question_text:      q.question_text,
      simplified_text:    q.simplified_text,
      image_svg:          q.image_svg ?? null,
      answer_type:        q.answer_type,
      choices:            q.choices,
      hint_1:             q.hint_1,
      hint_2:             q.hint_2,
      hint_3:             q.hint_3,
      calculator_allowed: q.calculator_allowed,
      source:             q.source,
      tier:               q.tier ?? 'standard',
    })

    if (insertErr) {
      console.error(`  ✗ insert failed (${q.id}): ${insertErr.message}`)
      failed++
      continue
    }

    // Mark as approved
    await supabase
      .from('questions_pending')
      .update({ status: 'approved', reviewed_at: new Date().toISOString() })
      .eq('id', q.id)

    console.log(`  ✓ Grade ${q.grade} ${q.subject} diff:${q.difficulty} — "${q.question_text.slice(0, 60)}..."`)
    approved++
  }

  console.log(`\n─────────────────────────────────────────`)
  console.log(`Approved: ${approved}  Skipped (duplicate): ${skipped}  Failed: ${failed}`)

  if (!dryRun) {
    // Print final counts per grade
    for (const grade of grades) {
      const { count: mathCount } = await supabase.from('questions').select('*', { count: 'exact', head: true }).eq('grade', grade).eq('subject', 'math')
      const { count: readingCount } = await supabase.from('questions').select('*', { count: 'exact', head: true }).eq('grade', grade).eq('subject', 'reading')
      console.log(`Grade ${grade}: ${mathCount} math, ${readingCount} reading questions published`)
    }
  }
}

main().catch(e => { console.error(e); process.exit(1) })
