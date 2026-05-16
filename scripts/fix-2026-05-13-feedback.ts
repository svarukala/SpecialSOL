import { createClient } from '@supabase/supabase-js'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function main() {
  // ── Q1: c92f5c9c — Jake reading time ──────────────────────────────────────
  // 3:45 PM + 1h50m = 5:35 PM; + 25m break = 6:00 PM; + 35m = 6:35 PM
  // Marked correct is "6:15 PM" — WRONG. Correct is "6:35 PM" (a distractor).
  const q1Id = 'c92f5c9c-6ad2-481b-b56c-70ad92a5f55a'
  const { data: q1 } = await db.from('questions').select('choices').eq('id', q1Id).single()
  if (!q1) { console.error('Q1 not found'); process.exit(1) }

  const fixedChoices = (q1.choices as Array<{ id: string; text: string; is_correct: boolean }>)
    .map(c => {
      if (c.text === '6:15 PM') return { ...c, is_correct: false }
      if (c.text === '6:35 PM') return { ...c, is_correct: true }
      return c
    })

  const { error: e1 } = await db.from('questions').update({ choices: fixedChoices }).eq('id', q1Id)
  if (e1) { console.error('Q1 update failed:', e1.message); process.exit(1) }
  console.log('✓ Q1 fixed: swapped correct answer from 6:15 PM → 6:35 PM')

  // ── Q2: 40cf3fce — visual fractions (DOE released, no image) ─────────────
  // "This model is shaded…" requires a visual that isn't present. Hide it.
  const q2Id = '40cf3fce-c587-41c5-be47-10754ee188ce'
  const { error: e2 } = await db.from('questions').update({ needs_image: true }).eq('id', q2Id)
  if (e2) { console.error('Q2 update failed:', e2.message); process.exit(1) }
  console.log('✓ Q2 hidden: needs_image=true (visual fractions question with no image)')

  // ── Mark both feedback entries resolved ───────────────────────────────────
  const { error: e3 } = await db
    .from('feedback')
    .update({ status: 'resolved' })
    .in('question_id', [q1Id, q2Id])
    .in('category', ['question_error', 'child_confused'])
  if (e3) { console.error('Feedback update failed:', e3.message); process.exit(1) }
  console.log('✓ Both feedback entries marked resolved')
}

main().catch(err => { console.error(err); process.exit(1) })
