import { createClient } from '@supabase/supabase-js'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// All 5 are DOE released questions referencing images/visuals not in the DB.
// Children can't answer them — hide via needs_image=true.
const VISUAL_QUESTION_IDS = [
  'b0e2a30b-8360-4ca4-8c91-b893bb6ddb8a', // 30x flagged — "In which picture is there an even number of dinosaurs?"
  '68ec4662-b39a-4787-915f-91c5216732bf', // 2x flagged  — "Which is CLOSEST to the temperature shown on the thermometer?"
  '072eb91b-73ef-4fd9-a34e-281185bb4a3f', // 1x flagged  — "Connie put 4 apples in each basket. How many altogether?" (basket count was in original image)
  'a3b20ae7-db37-4215-a84f-0aac2d8604f1', // 1x flagged  — "This model is shaded to show one whole…" (fraction area model)
  '0a2b4400-4320-4009-bbf5-6fc300130773', // 1x flagged  — "Which graph below shows the correct number of pencils?" (graphs A/B/C/D)
]

async function main() {
  const { error: qErr } = await db
    .from('questions')
    .update({ needs_image: true })
    .in('id', VISUAL_QUESTION_IDS)

  if (qErr) { console.error('Question update failed:', qErr.message); process.exit(1) }
  console.log(`✓ Hidden ${VISUAL_QUESTION_IDS.length} visual questions (needs_image=true)`)

  const { error: fErr } = await db
    .from('feedback')
    .update({ status: 'resolved' })
    .in('question_id', VISUAL_QUESTION_IDS)
    .in('category', ['question_error', 'child_confused'])
    .eq('status', 'new')

  if (fErr) { console.error('Feedback update failed:', fErr.message); process.exit(1) }
  console.log('✓ All related feedback entries marked resolved')
}

main().catch(err => { console.error(err); process.exit(1) })
