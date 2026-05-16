import { createClient } from '@supabase/supabase-js'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function main() {
  // ── Visual/image-dependent questions — hide with needs_image=true ─────────
  // All reference visuals ("grid above", "this table", "this graph") that were
  // not ingested alongside the question text.
  const imageIds = [
    'ce88e311-3c82-4d40-aa89-a95638f7f095', // coordinate grid line segment
    'fb2f991f-3205-46b0-aee0-11adedfed848', // dance class table → graph
    'b1506326-3b98-4250-99b8-94787ab77b0a', // farm animals pictograph → bar graph
    '36ee1abb-f838-41f0-9eef-c792ca183733', // pet ownership table → bar graph
    'b5e1eb10-dd6c-4a20-b472-81a4ad953463', // congruent shapes card
    '43318d42-424f-42cf-a6a0-e9cff08269d8', // popcorn theater graph
  ]

  const { error: e1 } = await db
    .from('questions')
    .update({ needs_image: true })
    .in('id', imageIds)
  if (e1) { console.error('needs_image update failed:', e1.message); process.exit(1) }
  console.log(`✓ ${imageIds.length} image-dependent questions hidden (needs_image=true)`)

  // ── d06fbe20 — apple bags decimal: duplicate correct answer as distractor ──
  // CORRECT: "7.2 pounds"  DISTRACTORS: "7.2 pounds" | "6.12 pounds" | "7.02 pounds"
  // Replace the duplicate distractor with "5.4 pounds" (2.4 + 3 — addition error)
  const q2Id = 'd06fbe20-e83e-478e-a603-47b1bf091e8a'
  const { data: q2 } = await db.from('questions').select('choices').eq('id', q2Id).single()
  if (!q2) { console.error('Q2 not found'); process.exit(1) }

  let duplicateFixed = false
  const fixedChoices = (q2.choices as Array<{ id: string; text: string; is_correct: boolean }>)
    .map(c => {
      if (!c.is_correct && c.text === '7.2 pounds' && !duplicateFixed) {
        duplicateFixed = true
        return { ...c, text: '5.4 pounds' }
      }
      return c
    })

  const { error: e2 } = await db.from('questions').update({ choices: fixedChoices }).eq('id', q2Id)
  if (e2) { console.error('Q2 update failed:', e2.message); process.exit(1) }
  console.log('✓ Q2 fixed: replaced duplicate distractor "7.2 pounds" → "5.4 pounds"')

  // ── d92c1eb1 — long division notation stored as question text ─────────────
  // "3)4.155" is unreadable without rendering context; rewrite as plain text.
  const q3Id = 'd92c1eb1-8b94-4524-aa5d-a4869624570d'
  const { error: e3 } = await db
    .from('questions')
    .update({
      question_text: 'What is 4.155 ÷ 3?',
      simplified_text: 'Divide 4.155 by 3. What is the answer?',
    })
    .eq('id', q3Id)
  if (e3) { console.error('Q3 update failed:', e3.message); process.exit(1) }
  console.log('✓ Q3 fixed: rewrote "3)4.155" → "What is 4.155 ÷ 3?"')

  // ── Mark all feedback entries resolved ────────────────────────────────────
  const allIds = [...imageIds, q2Id, q3Id]
  const { error: e4 } = await db
    .from('feedback')
    .update({ status: 'resolved' })
    .in('question_id', allIds)
    .in('category', ['question_error', 'child_confused'])
  if (e4) { console.error('Feedback resolve failed:', e4.message); process.exit(1) }
  console.log('✓ All 11 feedback entries marked resolved')
}

main().catch(err => { console.error(err); process.exit(1) })
