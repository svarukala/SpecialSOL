/**
 * Quick check: how many Grade 5 science questions are in questions vs questions_pending
 * Run: npx tsx scripts/check-science-questions.ts
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error('Missing env vars'); process.exit(1) }
const db = createClient(url, key, { auth: { persistSession: false } })

async function main() {
  const [
    { count: published },
    { count: pending },
    { count: approved },
    { count: rejected },
  ] = await Promise.all([
    db.from('questions').select('*', { count: 'exact', head: true }).eq('grade', 5).eq('subject', 'science'),
    db.from('questions_pending').select('*', { count: 'exact', head: true }).eq('grade', 5).eq('subject', 'science').eq('status', 'pending'),
    db.from('questions_pending').select('*', { count: 'exact', head: true }).eq('grade', 5).eq('subject', 'science').eq('status', 'approved'),
    db.from('questions_pending').select('*', { count: 'exact', head: true }).eq('grade', 5).eq('subject', 'science').eq('status', 'rejected'),
  ])

  console.log('Grade 5 Science Question Counts')
  console.log('─'.repeat(40))
  console.log(`  questions table (live):      ${published ?? 0}`)
  console.log(`  questions_pending / pending: ${pending ?? 0}`)
  console.log(`  questions_pending / approved:${approved ?? 0}`)
  console.log(`  questions_pending / rejected:${rejected ?? 0}`)

  if ((published ?? 0) === 0) {
    console.log('\n⚠  No science questions in the live questions table.')
    console.log('   Run approve-pending-by-grade.ts or insert-pending.ts to publish.')
  } else {
    console.log('\n✓  Science questions are live.')
  }
}

main().catch(e => { console.error(e); process.exit(1) })
