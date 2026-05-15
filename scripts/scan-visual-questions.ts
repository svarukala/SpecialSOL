import { createClient } from '@supabase/supabase-js'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// Phrases that indicate a question references an image not present in the DB.
// Each entry is [pattern, reason].
const VISUAL_PHRASES: [RegExp, string][] = [
  [/in which picture/i,               'references picture choices'],
  [/which picture (shows|has|is)/i,   'references picture choices'],
  [/the picture (below|above|shown)/i,'references a picture'],
  [/shown (on|in) the (picture|photo|image|figure|diagram)/i, 'references a figure'],
  [/shown (below|above)/i,            'references visual shown below/above'],
  [/the (figure|diagram) (below|above|shown)/i, 'references a figure/diagram'],
  [/on the thermometer/i,             'references thermometer image'],
  [/the thermometer (below|shown)/i,  'references thermometer image'],
  [/which graph/i,                    'references graph choices'],
  [/the graph (below|above|shown)/i,  'references a graph'],
  [/bar graph below/i,                'references a bar graph'],
  [/line graph below/i,               'references a line graph'],
  [/pie chart/i,                      'references a pie chart'],
  [/the (model|shape|figure) below/i, 'references a model/shape below'],
  [/model (is shaded|shown|below)/i,  'references a shaded model'],
  [/shaded (part|model|figure)/i,     'references shaded visual'],
  [/the (rectangle|triangle|circle|square|polygon) (below|shown)/i, 'references a shape image'],
  [/which (rectangle|triangle|circle|square)/i, 'references shape choices'],
  [/the spinner (below|shown|above)/i,'references a spinner image'],
  [/the ruler (below|shown)/i,        'references a ruler image'],
  [/number line (below|shown|above)/i,'references a number line image'],
  [/coordinate (grid|plane) (below|shown)/i, 'references a coordinate grid'],
  [/the map (below|shown|above)/i,    'references a map image'],
  [/each (bag|basket|box|group|row|column) (has|contains|holds|of)/i, 'count likely in missing image'],
  [/how many (bags|baskets|boxes|groups|rows|columns)/i, 'count reference likely in missing image'],
  [/in (basket|bag|box) [A-D]\b/i,    'references labeled image containers'],
  [/table [A-D]\b/i,                  'references labeled table choices'],
  [/graph [A-D]\b/i,                  'references labeled graph choices'],
  [/figure [A-D]\b/i,                 'references labeled figure choices'],
  [/which (table|chart|diagram) (below|shows|is correct)/i, 'references visual answer choices'],
  [/the (table|chart) below shows/i,  'references table/chart below'],
]

async function main() {
  // Fetch all DOE released questions that: have no SVG, are not already hidden
  const { data: questions, error } = await db
    .from('questions')
    .select('id, grade, subject, topic, difficulty, question_text, image_svg, needs_image')
    .eq('source', 'doe_released')
    .eq('needs_image', false)
    .is('image_svg', null)
    .order('grade')
    .order('subject')

  if (error) { console.error('Fetch failed:', error.message); process.exit(1) }
  if (!questions?.length) { console.log('No DOE released questions to scan.'); return }

  console.log(`Scanning ${questions.length} DOE released questions with no image...\n`)

  const hits: { id: string; grade: number; subject: string; topic: string; difficulty: number; reason: string; text: string }[] = []

  for (const q of questions) {
    const text = q.question_text ?? ''
    for (const [pattern, reason] of VISUAL_PHRASES) {
      if (pattern.test(text)) {
        hits.push({ id: q.id, grade: q.grade, subject: q.subject, topic: q.topic, difficulty: q.difficulty, reason, text })
        break // one match per question is enough
      }
    }
  }

  if (!hits.length) {
    console.log('✓ No visual-reference questions found.')
    return
  }

  console.log(`Found ${hits.length} questions that likely reference missing visuals:\n`)
  console.log('─'.repeat(90))

  for (const h of hits) {
    console.log(`[${h.id}]  Gr${h.grade} ${h.subject} · ${h.topic} · diff ${h.difficulty}`)
    console.log(`  Reason: ${h.reason}`)
    console.log(`  Text:   ${h.text.slice(0, 160).replace(/\n/g, ' ')}`)
    console.log()
  }

  console.log('─'.repeat(90))
  console.log(`\nTotal: ${hits.length} questions to hide.\n`)

  // Ask before applying — pass --fix to apply
  if (!process.argv.includes('--fix')) {
    console.log('Run with --fix to set needs_image=true on all of the above.')
    return
  }

  const ids = hits.map(h => h.id)
  const { error: updateErr } = await db
    .from('questions')
    .update({ needs_image: true })
    .in('id', ids)

  if (updateErr) { console.error('Update failed:', updateErr.message); process.exit(1) }
  console.log(`✓ Set needs_image=true on ${ids.length} questions.`)
}

main().catch(err => { console.error(err); process.exit(1) })
