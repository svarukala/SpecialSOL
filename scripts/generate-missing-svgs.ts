#!/usr/bin/env npx ts-node
/**
 * For each DOE question flagged by audit-doe-questions.ts, generates a
 * geometrically accurate SVG using Claude and patches it back to Supabase.
 *
 * Usage:
 *   npx ts-node scripts/generate-missing-svgs.ts             # dry run (logs prompts + responses, no DB writes)
 *   npx ts-node scripts/generate-missing-svgs.ts --write     # generate + patch to DB
 *   npx ts-node scripts/generate-missing-svgs.ts --write --id <uuid>  # single question
 */

import Anthropic from '@anthropic-ai/sdk'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://cpcsxocziapgqpbtfytr.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? ''

const HEADERS = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
}

const VISUAL_QUESTION_PATTERNS = [
  /graph below/i, /shown below/i, /table below/i, /chart below/i,
  /diagram below/i, /figure below/i, /picture below/i, /plot below/i,
  /use the (graph|chart|table|diagram|figure)/i,
  /according to the (graph|chart|table|diagram|figure)/i,
  /based on the (graph|chart|table|diagram|figure)/i,
  /which (graph|chart|table|diagram|figure|plot)/i,
  /the (bar graph|line graph|pie chart|circle graph|box.and.whisker|number line|coordinate)/i,
]

const VISUAL_CHOICE_PATTERNS = [
  /^(box.and.whisker plot|graph|chart|figure|diagram|plot|table)\s+[A-Z]$/i,
  /^[A-Z]$/,
]

type Choice = { id: string; text: string; is_correct: boolean }

type Question = {
  id: string
  grade: number
  subject: string
  question_text: string
  choices: Choice[]
  image_svg: string | null
  needs_image: boolean
  source_test: string | null
}

type IssueType = 'MISSING_IMAGE' | 'THIN_SVG' | 'LABEL_MISMATCH' | 'PURE_VISUAL_CHOICES'

function detectIssues(q: Question): IssueType[] {
  const issues: IssueType[] = []
  const text = q.question_text ?? ''
  const rawChoices = typeof q.choices === 'string' ? JSON.parse(q.choices as unknown as string) : (q.choices ?? [])
  const choiceTexts: string[] = Array.isArray(rawChoices) ? rawChoices.map((c: Choice) => c.text ?? '') : []

  const referencesVisual =
    VISUAL_QUESTION_PATTERNS.some((p) => p.test(text)) ||
    choiceTexts.some((t) => VISUAL_CHOICE_PATTERNS.some((p) => p.test(t.trim())))

  if (!q.needs_image && !q.image_svg && referencesVisual) issues.push('MISSING_IMAGE')
  if (!q.needs_image && q.image_svg && q.image_svg.length < 800 && referencesVisual) issues.push('THIN_SVG')

  if (q.image_svg) {
    const svgLabels = Array.from(q.image_svg.matchAll(/>([A-Z])</g)).map((m) => m[1])
    const choiceIds: string[] = Array.isArray(rawChoices) ? rawChoices.map((c: Choice) => c.id.toUpperCase()) : []
    const uniqueSvgLabels = [...new Set(svgLabels)]
    const mismatched = uniqueSvgLabels.filter((l) => !choiceIds.includes(l) && l.length === 1)
    if (mismatched.length > 0) issues.push('LABEL_MISMATCH')
  }

  const allChoicesPureVisual =
    choiceTexts.length > 0 &&
    choiceTexts.every((t) => VISUAL_CHOICE_PATTERNS.some((p) => p.test(t.trim())))
  if (allChoicesPureVisual && !q.image_svg) issues.push('PURE_VISUAL_CHOICES')

  return issues
}

function buildPrompt(q: Question): string {
  const rawChoices = typeof q.choices === 'string' ? JSON.parse(q.choices as unknown as string) : (q.choices ?? [])
  const correctChoice = (rawChoices as Choice[]).find((c) => c.is_correct)
  const choiceLines = (rawChoices as Choice[])
    .map((c: Choice) => `  ${c.id}${c.is_correct ? ' ✓ CORRECT' : ''}: ${c.text}`)
    .join('\n')

  return `You are generating an SVG image for an educational math question from a standardized test.

QUESTION (Grade ${q.grade}, ${q.source_test ?? 'unknown source'}):
${q.question_text}

ANSWER CHOICES:
${choiceLines}

CORRECT ANSWER: ${correctChoice?.id} — "${correctChoice?.text}"

YOUR TASK:
Generate a clean, accurate SVG that visually represents the data or diagram this question refers to.

CRITICAL RULES:
1. The SVG must make the CORRECT answer unambiguously correct when read from the image.
2. The SVG must make the other choices PLAUSIBLE but clearly wrong (good distractors).
3. Work backwards from the correct answer to determine the exact values/positions.
4. Use ONLY the choice labels that appear in the answer choices (${(rawChoices as Choice[]).map((c: Choice) => c.id.toUpperCase()).join(', ')}) — do NOT introduce other letters.
5. All geometry must be mathematically precise (e.g. bar heights must exactly correspond to axis values, points on number lines at exact positions).
6. Use a clear viewBox, readable font sizes (12–16px), and labeled axes where appropriate.
7. Keep the SVG clean and simple — this is for elementary/middle school students.
8. Do NOT include any text outside the SVG tags. Output ONLY the raw SVG markup starting with <svg and ending with </svg>.`
}

async function generateSVG(client: Anthropic, q: Question): Promise<string | null> {
  const prompt = buildPrompt(q)

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = message.content[0]
  if (content.type !== 'text') return null

  const text = content.text.trim()
  // Extract SVG if wrapped in markdown code blocks
  const svgMatch = text.match(/```(?:svg|xml)?\s*(<svg[\s\S]*?<\/svg>)\s*```/i) ||
                   text.match(/(<svg[\s\S]*?<\/svg>)/i)
  if (!svgMatch) return null

  return svgMatch[1].trim()
}

async function patchQuestion(id: string, svg: string): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/questions?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...HEADERS, Prefer: 'return=minimal' },
    body: JSON.stringify({ image_svg: svg, needs_image: false }),
  })
}

async function fetchAllDoeQuestions(): Promise<Question[]> {
  const pageSize = 1000
  const all: Question[] = []
  let offset = 0
  while (true) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/questions?source=eq.doe_released&select=id,grade,subject,question_text,choices,image_svg,needs_image,source_test&limit=${pageSize}&offset=${offset}`,
      { headers: HEADERS }
    )
    const batch: Question[] = await res.json()
    if (!Array.isArray(batch) || batch.length === 0) break
    all.push(...batch)
    offset += pageSize
    if (batch.length < pageSize) break
  }
  return all
}

async function main() {
  const doWrite = process.argv.includes('--write')
  const singleId = process.argv.includes('--id')
    ? process.argv[process.argv.indexOf('--id') + 1]
    : null

  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

  console.log('Fetching DOE questions...')
  const all = await fetchAllDoeQuestions()
  console.log(`Loaded ${all.length} questions.\n`)

  // Filter to flagged questions only (skip already-fixed ones and MISSING_IMAGE
  // where we truly can't reconstruct — those stay needs_image=true)
  let targets = all.filter((q) => {
    if (q.needs_image) return false // already handled
    const issues = detectIssues(q)
    return issues.length > 0
  })

  if (singleId) {
    targets = targets.filter((q) => q.id === singleId)
    if (targets.length === 0) {
      // Maybe it's needs_image=true already — fetch directly
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/questions?id=eq.${singleId}&select=id,grade,subject,question_text,choices,image_svg,needs_image,source_test`,
        { headers: HEADERS }
      )
      const rows: Question[] = await res.json()
      targets = rows
    }
  }

  console.log(`Generating SVGs for ${targets.length} questions${doWrite ? '' : ' (DRY RUN — pass --write to save)'}...\n`)

  let succeeded = 0
  let failed = 0

  for (let i = 0; i < targets.length; i++) {
    const q = targets[i]
    const issues = detectIssues(q)
    process.stdout.write(`[${i + 1}/${targets.length}] ${q.id} (${issues.join(', ')})... `)

    try {
      const svg = await generateSVG(client, q)
      if (!svg || svg.length < 200) {
        console.log('SKIP — response too short or invalid')
        failed++
        continue
      }

      console.log(`OK (${svg.length} chars)`)

      if (doWrite) {
        await patchQuestion(q.id, svg)
      } else {
        // Dry run: show a snippet
        console.log(`  Preview: ${svg.substring(0, 120).replace(/\n/g, ' ')}...`)
      }
      succeeded++
    } catch (e) {
      console.log(`ERROR — ${(e as Error).message}`)
      failed++
    }

    // Small delay to avoid rate limits
    if (i < targets.length - 1) await new Promise((r) => setTimeout(r, 300))
  }

  console.log(`\nDone. Succeeded: ${succeeded}, Failed: ${failed}`)
  if (!doWrite) console.log('Re-run with --write to persist changes.')
}

main().catch(console.error)
