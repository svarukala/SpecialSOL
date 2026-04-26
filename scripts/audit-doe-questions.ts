#!/usr/bin/env npx ts-node
/**
 * Audits all DOE-released questions for common SVG/image issues.
 * Optionally auto-fixes confirmed missing-image cases (--fix flag).
 *
 * Usage:
 *   npx ts-node scripts/audit-doe-questions.ts          # dry run
 *   npx ts-node scripts/audit-doe-questions.ts --fix    # also patches needs_image=true
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://cpcsxocziapgqpbtfytr.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

const HEADERS = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
}

// Keywords that strongly indicate a visual is required
const VISUAL_QUESTION_PATTERNS = [
  /graph below/i, /shown below/i, /table below/i, /chart below/i,
  /diagram below/i, /figure below/i, /picture below/i, /plot below/i,
  /use the (graph|chart|table|diagram|figure)/i,
  /according to the (graph|chart|table|diagram|figure)/i,
  /based on the (graph|chart|table|diagram|figure)/i,
  /which (graph|chart|table|diagram|figure|plot)/i,
  /the (bar graph|line graph|pie chart|circle graph|box.and.whisker|number line|coordinate)/i,
]

// Choice text patterns that indicate pure visual-label choices (no real data)
const VISUAL_CHOICE_PATTERNS = [
  /^(box.and.whisker plot|graph|chart|figure|diagram|plot|table)\s+[A-Z]$/i,
  /^[A-Z]$/, // single letter only — means the label IS the figure
]

type Question = {
  id: string
  grade: number
  subject: string
  question_text: string
  choices: { id: string; text: string; is_correct: boolean }[]
  image_svg: string | null
  needs_image: boolean
  source_test: string | null
}

type Issue = {
  id: string
  grade: number
  subject: string
  source_test: string | null
  issues: string[]
  autoFixable: boolean
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

function auditQuestion(q: Question): string[] {
  // Already acknowledged as needing an image — skip to avoid noise
  if (q.needs_image) return []
  const issues: string[] = []
  const text = q.question_text ?? ''
  const rawChoices = typeof q.choices === 'string' ? JSON.parse(q.choices) : (q.choices ?? [])
  const choiceTexts = Array.isArray(rawChoices) ? rawChoices.map((c: { text?: string }) => c.text ?? '') : []

  const referencesVisual =
    VISUAL_QUESTION_PATTERNS.some((p) => p.test(text)) ||
    choiceTexts.some((t) => VISUAL_CHOICE_PATTERNS.some((p) => p.test(t.trim())))

  // 1. Needs image but none present and flag not set
  if (!q.needs_image && !q.image_svg && referencesVisual) {
    issues.push('MISSING_IMAGE: question references visuals but image_svg=null and needs_image=false')
  }

  // 2. SVG present but very short for a visual question
  if (!q.needs_image && q.image_svg && q.image_svg.length < 800 && referencesVisual) {
    issues.push(`THIN_SVG: image_svg only ${q.image_svg.length} chars — likely placeholder`)
  }

  // 3. SVG label mismatch — SVG uses A/B/C/D but choices reference other letters
  if (q.image_svg) {
    // Extract text labels from SVG (single capital letters or words like K,L,M,N)
    const svgLabels = Array.from(q.image_svg.matchAll(/>([A-Z])</g)).map((m) => m[1])
    const choiceIds = Array.isArray(rawChoices) ? rawChoices.map((c: { id: string }) => c.id.toUpperCase()) : []
    // Also accept single-letter choice texts (e.g. choice text "K", "L", "M", "N")
    const choiceTextLabels = Array.isArray(rawChoices)
      ? [...new Set(rawChoices.flatMap((c: { text?: string }) =>
          Array.from((c.text ?? '').matchAll(/\b([A-Z])\b/g)).map((m: RegExpMatchArray) => m[1])
        ))]
      : []
    // Extract letters from question text: standalone capitals ("vertex L", "circle O") and all-caps sequences ("Triangle CAT" → C,A,T; "∠WXY" → W,X,Y; "PQRS" → P,Q,R,S)
    const questionTextLabels = [
      ...Array.from(text.matchAll(/\b([A-Z])\b/g)).map((m) => m[1]),
      ...Array.from(text.matchAll(/\b([A-Z]{2,})\b/g)).flatMap((m) => m[1].split('')),
    ]
    // Also extract from choice texts (e.g. "XS", "XQ" → X, S, Q)
    const choiceAllCapsLabels = Array.isArray(rawChoices)
      ? rawChoices.flatMap((c: { text?: string }) =>
          Array.from((c.text ?? '').matchAll(/\b([A-Z]{2,})\b/g)).flatMap((m: RegExpMatchArray) => m[1].split(''))
        )
      : []
    const validLabels = new Set([...choiceIds, ...choiceTextLabels, ...questionTextLabels, ...choiceAllCapsLabels])
    const uniqueSvgLabels = [...new Set(svgLabels)]

    if (uniqueSvgLabels.length > 0) {
      const mismatched = uniqueSvgLabels.filter((l) => !validLabels.has(l) && l.length === 1)
      const matchedCount = uniqueSvgLabels.filter((l) => validLabels.has(l)).length
      // Only flag when the SVG has NO labels that match valid labels at all —
      // extra labels alongside correct ones (co-vertices, axis arrows) are expected in math SVGs
      if (mismatched.length > 0 && matchedCount === 0) {
        issues.push(
          `LABEL_MISMATCH: SVG contains labels [${uniqueSvgLabels.join(',')}] but choices are [${choiceIds.join(',')}]`
        )
      }
    }
  }

  // 4. Choices are pure visual labels with no data (e.g. "Box-and-whisker plot A")
  const allChoicesPureVisual =
    choiceTexts.length > 0 &&
    choiceTexts.every((t) => VISUAL_CHOICE_PATTERNS.some((p) => p.test(t.trim())))
  if (allChoicesPureVisual && !q.image_svg) {
    issues.push('PURE_VISUAL_CHOICES: all choices are visual labels but no SVG present')
  }

  return issues
}

async function patchNeedsImage(id: string): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/questions?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...HEADERS, Prefer: 'return=minimal' },
    body: JSON.stringify({ needs_image: true }),
  })
}

async function main() {
  const autoFix = process.argv.includes('--fix')

  console.log('Fetching all DOE questions...')
  const questions = await fetchAllDoeQuestions()
  console.log(`Loaded ${questions.length} DOE questions.\n`)

  const flagged: Issue[] = []
  const autoFixable: Issue[] = []

  for (const q of questions) {
    let issues: string[]
    try {
      issues = auditQuestion(q)
    } catch (e) {
      console.error(`Error auditing ${q.id}:`, e)
      continue
    }
    if (issues.length === 0) continue

    const isAutoFixable = issues.some((i) => i.startsWith('MISSING_IMAGE') || i.startsWith('PURE_VISUAL_CHOICES'))
    const entry: Issue = {
      id: q.id,
      grade: q.grade,
      subject: q.subject,
      source_test: q.source_test,
      issues,
      autoFixable: isAutoFixable,
    }
    flagged.push(entry)
    if (isAutoFixable) autoFixable.push(entry)
  }

  // Summary
  const byType: Record<string, number> = {}
  for (const f of flagged) {
    for (const issue of f.issues) {
      const type = issue.split(':')[0]
      byType[type] = (byType[type] ?? 0) + 1
    }
  }

  console.log('=== AUDIT SUMMARY ===')
  console.log(`Total flagged: ${flagged.length} / ${questions.length}`)
  console.log('By issue type:')
  for (const [type, count] of Object.entries(byType)) {
    console.log(`  ${type}: ${count}`)
  }
  console.log()

  // Detail
  console.log('=== FLAGGED QUESTIONS ===')
  for (const f of flagged) {
    console.log(`[${f.id}] Grade ${f.grade} ${f.subject} | ${f.source_test ?? 'unknown'}`)
    for (const issue of f.issues) {
      console.log(`  • ${issue}`)
    }
  }

  // Auto-fix
  if (autoFix && autoFixable.length > 0) {
    console.log(`\n=== AUTO-FIXING ${autoFixable.length} questions (needs_image=true) ===`)
    let fixed = 0
    for (const f of autoFixable) {
      await patchNeedsImage(f.id)
      fixed++
      process.stdout.write(`\r  Fixed ${fixed}/${autoFixable.length}`)
    }
    console.log('\nDone.')
  } else if (autoFix) {
    console.log('\nNo auto-fixable questions found.')
  } else if (autoFixable.length > 0) {
    console.log(`\n${autoFixable.length} questions can be auto-fixed (needs_image=true). Re-run with --fix to apply.`)
  }
}

main().catch(console.error)
