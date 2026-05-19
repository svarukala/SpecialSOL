import { createClient } from '@supabase/supabase-js'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// ── Judge-identified fixes ────────────────────────────────────────────────────
// For each question: match by fragment of question_text, then apply choice fixes.
// Choice fixes replace the text+correctness of a specific choice id.

interface ChoiceFix {
  id: string        // choice id: 'a' | 'b' | 'c' | 'd'
  text: string      // new text
  is_correct: boolean
}

interface Fix {
  textFragment: string   // unique substring of question_text for matching
  fixes: ChoiceFix[]
  reason: string
}

const FIXES: Fix[] = [
  {
    // [3] hypothesis multiple_select: choice d is defensibly correct
    // 3-of-4 correct (a, b, d) — replace d with wrong option
    textFragment: 'characteristics of a good sci',
    fixes: [
      { id: 'd', text: 'It must be proven correct before the experiment begins.', is_correct: false },
    ],
    reason: 'choice d ("It makes a prediction") is defensibly correct — replaced with definitively wrong option',
  },
  {
    // [4] lab safety multiple_select: 3-of-4 correct (a, b, d)
    textFragment: 'Which actions help keep students safe during a science lab',
    fixes: [
      { id: 'd', text: 'Wearing open-toed sandals for comfort during the experiment.', is_correct: false },
    ],
    reason: '3-of-4 correct — changed d to wrong option',
  },
  {
    // [9] guitar string multiple_select: 3-of-4 correct (a, b, d thermal energy)
    textFragment: 'strums a guitar string',
    fixes: [
      { id: 'd', text: 'Chemical energy stored in the wood of the guitar.', is_correct: false },
    ],
    reason: '3-of-4 correct — changed d (thermal energy) to wrong option',
  },
  {
    // [10] renewable energy multiple_select: 3-of-4 correct (a, b, d)
    textFragment: 'Which are examples of renewable energy sources',
    fixes: [
      { id: 'd', text: 'Petroleum refined from crude oil.', is_correct: false },
    ],
    reason: '3-of-4 correct — changed d (hydroelectric) to nonrenewable option',
  },
  {
    // [13] friction MC: distractor c is obviously wrong ("carpet < ice friction")
    textFragment: 'A hockey puck slides across smooth ice much farther than a rubber ball rolls',
    fixes: [
      { id: 'c', text: 'The rubber ball is lighter than the puck, so gravity slows it down more quickly.', is_correct: false },
    ],
    reason: 'distractor c ("carpet < ice friction") was obviously false — replaced with plausible wrong answer',
  },
  {
    // [14] mass/acceleration MC: distractor d is self-contradictory
    textFragment: 'A soccer ball and a bowling ball are each pushed with the same force',
    fixes: [
      { id: 'd', text: 'The soccer ball accelerates less because it has less weight pushing it forward.', is_correct: false },
    ],
    reason: 'distractor d ("lighter = harder to move") was self-contradictory — replaced with plausible wrong answer',
  },
  {
    // [15] kinetic energy multiple_select: 3-of-4 correct (a, b, d river)
    textFragment: 'Which objects have kinetic energy',
    fixes: [
      { id: 'd', text: 'A parked car sitting still in a driveway.', is_correct: false },
    ],
    reason: '3-of-4 correct — changed d (flowing river) to stationary object',
  },
  {
    // [16] collision multiple_select: 3-of-4 correct (a, b, d)
    textFragment: 'When a moving billiard ball strikes a stationary billiard ball',
    fixes: [
      { id: 'd', text: 'The two balls always stick together after the collision.', is_correct: false },
    ],
    reason: '3-of-4 correct — changed d to wrong option',
  },
  {
    // [22] electromagnetism multiple_select: 3-of-4 correct (a, b, d)
    textFragment: 'Which statements correctly describe how electricity and magnetism are related',
    fixes: [
      { id: 'd', text: 'Cutting the wire of an electromagnet will keep it permanently magnetized.', is_correct: false },
    ],
    reason: '3-of-4 correct — changed d to wrong option',
  },
  {
    // [34] atoms multiple_select: 3-of-4 correct (a, b, d)
    textFragment: 'Which statements are true about atoms and matter',
    fixes: [
      { id: 'd', text: 'Atoms are large enough to see clearly with a powerful magnifying glass.', is_correct: false },
    ],
    reason: '3-of-4 correct — changed d to wrong option',
  },
  {
    // [39] Earth\'s layers multiple_select: 3-of-4 correct (a, b, d)
    textFragment: "Select ALL that apply. Which statements correctly describe Earth's layers",
    fixes: [
      { id: 'd', text: "The outer core is solid and generates Earth's magnetic field through friction between rock layers.", is_correct: false },
    ],
    reason: '3-of-4 correct — changed d to wrong option',
  },
  {
    // [40] fossil conditions multiple_select: 3-of-4 correct (a, b, d)
    textFragment: 'Which conditions help preserve an organism as a fossil',
    fixes: [
      { id: 'd', text: 'Being exposed to sunlight and wind to dry out quickly.', is_correct: false },
    ],
    reason: '3-of-4 correct — changed d to wrong option',
  },
  {
    // [45] renewable energy (earth resources) multiple_select: 3-of-4 correct (a, b, d)
    // change b from "Wind turning turbines" to nonrenewable
    textFragment: 'Which energy sources are renewable',
    fixes: [
      { id: 'b', text: 'Oil extracted from the ground and refined into gasoline.', is_correct: false },
    ],
    reason: '3-of-4 correct — changed b to nonrenewable option',
  },
  {
    // [46] conservation actions multiple_select: 3-of-4 correct (a, b, d)
    textFragment: 'Which actions are examples of conservation of natural resources',
    fixes: [
      { id: 'd', text: 'Cutting down old trees to make room for faster-growing ones.', is_correct: false },
    ],
    reason: '3-of-4 correct — changed d to wrong option',
  },
]

async function main() {
  const { data: records, error } = await db
    .from('questions_pending')
    .select('id, question_text, choices')
    .eq('grade', 5)
    .eq('subject', 'science')
    .eq('status', 'pending')

  if (error) { console.error('Fetch error:', error.message); process.exit(1) }
  if (!records?.length) { console.log('No pending records'); return }

  let matched = 0
  let failed = 0

  for (const fix of FIXES) {
    const record = records.find(r => r.question_text.includes(fix.textFragment))
    if (!record) {
      console.error(`✗ No match for: "${fix.textFragment.slice(0, 60)}..."`)
      failed++
      continue
    }

    const choices = record.choices as Array<{ id: string; text: string; is_correct: boolean }>
    const updated = choices.map(c => {
      const f = fix.fixes.find(fx => fx.id === c.id)
      return f ? { ...c, text: f.text, is_correct: f.is_correct } : c
    })

    const correctCount = updated.filter(c => c.is_correct).length
    if (correctCount > updated.length / 2) {
      console.warn(`⚠ After fix, ${correctCount}/${updated.length} correct for "${record.question_text.slice(0, 60)}..."`)
    }

    const { error: updErr } = await db
      .from('questions_pending')
      .update({ choices: updated })
      .eq('id', record.id)

    if (updErr) {
      console.error(`✗ Update failed for ${record.id}:`, updErr.message)
      failed++
    } else {
      console.log(`✓ Fixed: ${record.question_text.slice(0, 60)}...`)
      console.log(`  Reason: ${fix.reason}`)
      matched++
    }
  }

  console.log(`\n${matched} fixed, ${failed} failed`)
}

main().catch(err => { console.error(err); process.exit(1) })
