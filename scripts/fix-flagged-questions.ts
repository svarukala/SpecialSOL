/**
 * fix-flagged-questions.ts
 *
 * Applies targeted fixes to questions identified by analyze-flagged-questions.ts.
 *
 * Run:
 *   npx dotenv -e .env.prod -- npx tsx scripts/fix-flagged-questions.ts
 *
 * What it does:
 *   1. Sets needs_image = true on questions that reference a visual (table, graph,
 *      figure, spinner, clock, etc.) but have no image_svg — they are unanswerable.
 *   2. Sets needs_image = true on DOE reading questions that reference a passage
 *      not stored in the DB (paragraph 7, "this story", "the article", etc.).
 *   3. Sets needs_image = true on fill_in_blank questions with empty question text.
 *   4. Fixes the Grade 3 poetry question whose question_text is missing the poem
 *      (poem is present in simplified_text but not shown in standard mode).
 *
 * All "needs_image" questions are already excluded from practice sessions by the
 * .eq('needs_image', false) filter in lib/supabase/queries.ts.
 */

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const db = createClient(url, key, { auth: { persistSession: false } })

// ── 1. Image-dependent questions (no image_svg) ───────────────────────────────
// Choices reference "Shape C", "Figure A", "[Tree diagram A]",
// "Box-and-whisker plot B", "Model G", etc. — unanswerable without a visual.
const NEEDS_IMAGE_VISUAL: string[] = [
  'a9e238d0-5dde-4831-82c9-9a786237206a', // paint cans table — 10x flagged
  '4d20471b-f6b6-4d0f-ae2f-9d6f7f1fb0c2', // rectangular solid Shape A/B/C/D
  '9c2c39a6-fd28-402b-a5b2-b4fd4f82015c', // flowers and vases combinations (also dupe distractors)
  '9d648976-31d3-43b9-9ca9-8dcd4244af3b', // ice-cream sundae tree diagrams A/B/C/D
  '9e2e3353-9f12-470a-95ac-903e113a4a9d', // figure pairs shaded fractions A/B/C/D
  '073eb91b-73ef-4fd9-a34e-281185bb4a3f', // Connie's baskets (number shown in image only)
  '68f33966-e06f-4217-8b9c-338685cbe1bc', // cube stack shown in image
  'bc95c6dd-0c39-478d-bc94-8843d03801b0', // mean lunches sold — table/chart in image
  '6c95f6ef-e46d-4356-968e-35fd79a38700', // number line arrow for -5 (K/L/M/N labels)
  'a149782f-0dba-4a5c-b449-b8cb68481f03', // translation slide Figure A/B/C/D
  '816c4daa-d8f3-4663-b42f-862528947253', // box-and-whisker plot A/B/C/D
  '6481bbc0-cb73-40ab-9a46-027ee529c0d5', // fossil hunt bar graph
  '39ebf1af-f442-4300-a0e2-2f911cacce55', // shape with one square corner (F/G/H/J)
  '689e3535-66e0-4507-965a-507b7e9a0a42', // clock face image
  '01a3450d-6d6f-4ece-ac81-ec1b73c06298', // grid with labeled points
  'de057f67-613b-4832-b890-a85cf31fd938', // decimal model 0.34 (Model F/G/H/J)
  '729f58f2-f886-4e8c-a7a2-b03680e17d67', // nursery class ages bar graph
  '8cb8fa6a-cc58-4db2-9566-11639233cba4', // wrapping paper rolls in basket
  '3e06ec3f-d604-42b9-820c-a7225a34760a', // favorite color bar graph
  'b035a7c1-759e-47ab-a95f-9ea26bad6a10', // parking lot cost table
  'f8d1a41a-d481-4bfd-8acc-f0a7cb32871b', // toolbox price table
  '730f4e92-f886-4e8c-a7a2-b03680e17d67', // circle with 0.7 shaded (model below = 1)
  '36df90bb-785f-406c-ab4c-e886cab6db9f', // spinner probability (choices reference image)
  'b1bb8782-3838-4112-8be9-5ad141ade6b4', // 25% shaded figures
]

// ── 2. Reading questions whose passage is not stored in the DB ────────────────
// References "this story", "paragraph 7", "the article", "paragraph 2" —
// students have no text to read.
const NEEDS_IMAGE_PASSAGE: string[] = [
  '7155b733-9238-4406-82b4-c1d97c13baae', // "this story is historical fiction" (no passage)
  '6c9f2d17-372b-4eb1-936f-8e744c9828b6', // "purpose of paragraph 7" (no passage)
  'b07846d7-da19-4837-8ed1-372da94e470e', // "article's last paragraph" (no passage)
  'ccb372be-09cc-4ca7-8bcc-2fb6e5adc466', // "paragraph 2" / word current (no passage)
]

// ── 3. Fill-in-blank questions with effectively empty question text ────────────
// question_text = "Complete the sentence." — the actual sentence is missing.
const NEEDS_IMAGE_BROKEN_FILLIN: string[] = [
  'e5a081a8-2d1a-4ed9-b916-8a5eac0bde49', // Grade 4 reading: dictionary fill-in-blank
  '39b0e261-a7db-4e1d-a1a6-ce37ab8b8ec6', // Grade 4 reading: "resolution" fill-in-blank
]

const ALL_NEEDS_IMAGE = [
  ...NEEDS_IMAGE_VISUAL,
  ...NEEDS_IMAGE_PASSAGE,
  ...NEEDS_IMAGE_BROKEN_FILLIN,
]

// ── 4. Poetry question: poem text missing from question_text (standard mode) ──
// ID: 356736e8. simplified_text has the poem; question_text does not.
// Students in standard mode see "Which words rhyme in these lines?" with no lines.
const POETRY_FIX_ID = '356736e8-b441-46a2-a0ea-cdd1dbb30904'
const POETRY_FIXED_QUESTION_TEXT = `Read these lines from a poem.

"The cat sat on the mat,
And wore a funny hat."

Which words rhyme in these lines?`

async function main() {
  console.log('Connecting to', url)
  console.log()

  // ── Fix 1/2/3: set needs_image = true ────────────────────────────────────────
  console.log(`Setting needs_image = true on ${ALL_NEEDS_IMAGE.length} questions…`)
  const { error: niErr, count } = await db
    .from('questions')
    .update({ needs_image: true })
    .in('id', ALL_NEEDS_IMAGE)
    .select('id', { count: 'exact', head: true })

  if (niErr) {
    console.error('needs_image update failed:', niErr.message)
    process.exit(1)
  }
  console.log(`  ✓ Updated ${count ?? '?'} rows`)
  console.log()

  // Verify which ones were actually found
  const { data: found } = await db
    .from('questions')
    .select('id, grade, subject, topic, needs_image')
    .in('id', ALL_NEEDS_IMAGE)

  const foundIds = new Set((found ?? []).map(q => q.id))
  const notFound = ALL_NEEDS_IMAGE.filter(id => !foundIds.has(id))
  if (notFound.length) {
    console.log(`  ⚠ ${notFound.length} IDs not found in questions table (may already be deleted):`)
    for (const id of notFound) console.log(`    ${id}`)
    console.log()
  }

  // ── Fix 4: patch poetry question_text ────────────────────────────────────────
  console.log(`Patching poetry question text (${POETRY_FIX_ID})…`)
  const { error: poetryErr } = await db
    .from('questions')
    .update({ question_text: POETRY_FIXED_QUESTION_TEXT })
    .eq('id', POETRY_FIX_ID)

  if (poetryErr) {
    console.error('Poetry fix failed:', poetryErr.message)
    process.exit(1)
  }
  console.log('  ✓ Poetry question_text updated')
  console.log()

  // ── Summary ───────────────────────────────────────────────────────────────────
  console.log('Done. Summary of actions:')
  console.log(`  • ${NEEDS_IMAGE_VISUAL.length} visual questions hidden (needs_image = true)`)
  console.log(`  • ${NEEDS_IMAGE_PASSAGE.length} no-passage reading questions hidden`)
  console.log(`  • ${NEEDS_IMAGE_BROKEN_FILLIN.length} broken fill-in-blank questions hidden`)
  console.log(`  • 1 poetry question_text fixed (poem now visible in all language modes)`)
  console.log()
  console.log('These questions are now excluded from all practice sessions.')
  console.log('To restore a question: UPDATE questions SET needs_image = false WHERE id = \'<id>\';')
}

main().catch(err => { console.error(err); process.exit(1) })
