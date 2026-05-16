/**
 * find-visual-reference-questions.ts
 *
 * Finds DOE-released questions whose text references a visual (grid, table,
 * graph, figure, diagram, picture, map, model, chart) but are not yet marked
 * needs_image=true. Prints a report and a dry-run count.
 *
 * Run:
 *   set -a && source .env.prod && npx tsx scripts/find-visual-reference-questions.ts
 *
 * Add --fix to apply needs_image=true and mark any open feedback resolved.
 */

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const db = createClient(url, key, { auth: { persistSession: false } })
const DRY_RUN = !process.argv.includes('--fix')

// Patterns where a visual is unambiguously required — spatial/external reference
const DEFINITE_PATTERNS = [
  'above',              // "the grid above", "pictured above", "the table above"
  'shown below',        // "the figure shown below"
  'shown above',
  'in the figure',
  'in the picture',
  'the picture shows',
  'these pictures',
  'coordinate grid',
  'coordinate plane',
  'in the diagram',
  'the diagram shows',
  'in the map',
  'use the map',
  'number line',
  'spinner',
]

// Patterns that reference a table/graph/chart/model — only flag when the data
// is NOT already embedded in the question text (see isInlineData below)
const CONDITIONAL_PATTERNS = [
  'in the table',
  'use the table',
  'this table',
  'the table shows',
  'in the graph',
  'use the graph',
  'this graph',
  'the graph shows',
  'in the chart',
  'use the chart',
  'this chart',
  'the chart shows',
  'in the model',
  'this model',
  'this diagram',
  'this picture',
  'this map',
]

/**
 * Returns true when the question text contains the referenced data inline,
 * making the visual unnecessary:
 *   - "Read this chart..." followed by embedded content (arrows, bullets, cause/effect)
 *   - Pipe-separated table data (e.g. "Nina | 19 Carlos | 18")
 *   - Inline structured data ("Level 1: X Level 2: Y")
 *   - "This model represents [value]" with pure arithmetic (model not needed)
 */
function isInlineData(text: string): boolean {
  const lower = text.toLowerCase()

  // "Read this chart/table/graph" — content follows inline
  if (/read this (chart|table|graph|diagram)/.test(lower)) return true

  // Pipe-separated table data
  if (text.includes('|')) return true

  // Inline structured list ("Level 1:", "Row 1:", "Week 1:", "Jar A: 121", etc.)
  if (/\b(level|row|week|day|month|year)\s+\w+\s*:\s*\d+/i.test(text)) return true
  // Label: number pattern ("Jar A: 121", "Graph B: 45", "Nina: 19")
  if (/[A-Z][a-z]*\s+[A-Z]\s*:\s*\d+/.test(text)) return true

  // Arrow/bullet flow content after "chart" or "table" reference
  if (/→|↓|↑|➜/.test(text)) return true

  // "This model represents [value]" + arithmetic question — the visual adds nothing
  if (/this model represents\s+([\d\/\.]|one whole|one half|one third|one)/i.test(text) && /\d+\.\d+\s*[+\-×÷−]\s*\d+/.test(text)) return true

  return false
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (pass --fix to apply)' : 'APPLYING FIXES'}\n`)

  const { data: questions, error } = await db
    .from('questions')
    .select('id, grade, subject, topic, question_text, simplified_text')
    .eq('source', 'doe_released')
    .or('needs_image.is.null,needs_image.eq.false')

  if (error) { console.error('Fetch failed:', error.message); process.exit(1) }
  if (!questions?.length) { console.log('No DOE questions found.'); return }

  console.log(`Scanning ${questions.length} DOE questions for visual references...\n`)

  const flagged: Array<{ id: string; grade: number; subject: string; topic: string; matchedOn: string; text: string }> = []

  for (const q of questions as Array<{ id: string; grade: number; subject: string; topic: string; question_text: string; simplified_text: string | null }>) {
    const haystack = (q.question_text + ' ' + (q.simplified_text ?? '')).toLowerCase()

    const definiteMatch = DEFINITE_PATTERNS.find(p => haystack.includes(p))
    if (definiteMatch) {
      flagged.push({ id: q.id, grade: q.grade, subject: q.subject, topic: q.topic, matchedOn: definiteMatch, text: q.question_text })
      continue
    }

    const conditionalMatch = CONDITIONAL_PATTERNS.find(p => haystack.includes(p))
    if (conditionalMatch && !isInlineData(q.question_text)) {
      flagged.push({ id: q.id, grade: q.grade, subject: q.subject, topic: q.topic, matchedOn: conditionalMatch, text: q.question_text })
    }
  }

  if (!flagged.length) {
    console.log('No visual-reference questions found — nothing to do.')
    return
  }

  console.log(`Found ${flagged.length} visual-reference questions:\n`)
  console.log('─'.repeat(80))
  for (const q of flagged) {
    console.log(`  ID:      ${q.id}`)
    console.log(`  Grade ${q.grade} · ${q.subject} · ${q.topic}`)
    console.log(`  Matched: "${q.matchedOn}"`)
    console.log(`  Text:    ${q.text.slice(0, 120).replace(/\n/g, ' ')}`)
    console.log()
  }
  console.log('─'.repeat(80))
  console.log()

  if (DRY_RUN) {
    console.log(`DRY RUN — would hide ${flagged.length} questions. Re-run with --fix to apply.`)
    return
  }

  const ids = flagged.map(q => q.id)
  const { error: updateErr } = await db
    .from('questions')
    .update({ needs_image: true })
    .in('id', ids)
  if (updateErr) { console.error('Update failed:', updateErr.message); process.exit(1) }
  console.log(`✓ ${ids.length} questions hidden (needs_image=true)`)

  const { error: fbErr } = await db
    .from('feedback')
    .update({ status: 'resolved' })
    .in('question_id', ids)
    .in('status', ['new'])
  if (fbErr) { console.error('Feedback resolve failed:', fbErr.message); process.exit(1) }
  console.log(`✓ Open feedback for these questions marked resolved`)
}

main().catch(err => { console.error(err); process.exit(1) })
