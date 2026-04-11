/**
 * recover-hidden-images.ts
 *
 * For questions hidden with needs_image=true (DOE source), we already have the
 * original VDOE released-test PDFs on disk. This script:
 *
 *   1. Loads each hidden DOE question from Supabase
 *   2. Parses source_test → locates the local PDF (data/sol-pdfs/...)
 *   3. Sends the PDF + question text to Claude (vision) to find & reproduce the diagram as SVG
 *   4. Judges the SVG: USEFUL / USELESS
 *   5. If useful: saves image_svg, clears needs_image=false
 *   6. If not useful: leaves hidden, records reason
 *
 * Usage:
 *   npx tsx scripts/recover-hidden-images.ts [--dry-run] [--limit=N]
 *   ENV_FILE=/tmp/prod.env npx tsx scripts/recover-hidden-images.ts
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import * as fs from 'fs'
import * as path from 'path'

config({ path: process.env.ENV_FILE ?? '.env.local', override: true })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── source_test → PDF path ─────────────────────────────────────────────────
// source_test examples: "2008 Grade 3 Math", "2010 Grade 5 Reading", "2011 Grade 4 Math Release"

interface ParsedSource {
  year: number
  grade: number
  subject: 'math' | 'reading'
}

function parseSourceTest(sourceTest: string): ParsedSource | null {
  const yearMatch = sourceTest.match(/\b(200[3-9]|201[0-5])\b/)
  const gradeMatch = sourceTest.match(/Grade\s+(\d)/i)
  const isMath = /math/i.test(sourceTest)
  const isReading = /reading/i.test(sourceTest)

  if (!yearMatch || !gradeMatch || (!isMath && !isReading)) return null

  return {
    year: parseInt(yearMatch[1]),
    grade: parseInt(gradeMatch[1]),
    subject: isMath ? 'math' : 'reading',
  }
}

function pdfPath(parsed: ParsedSource): string {
  return path.join('data', 'sol-pdfs', `grade-${parsed.grade}`, parsed.subject, `${parsed.year}.pdf`)
}

// ── Prompts ────────────────────────────────────────────────────────────────

function buildDiagramExtractionPrompt(questionText: string, choices: string): string {
  return `You are looking at a Virginia SOL released test PDF. Find the question that contains this text:

"${questionText}"

Answer choices:
${choices}

This question references a diagram, figure, chart, graph, or image that a student must see to answer it correctly.

Your task: Find that diagram in the PDF and reproduce it as a clean SVG.

SVG requirements:
- Start with <svg and end with </svg>
- Include a viewBox attribute (e.g. viewBox="0 0 400 300")
- No <style> blocks, no <script> tags, no on* event attributes
- No <use> or <foreignObject> elements
- 2–4 colors max, simple clean shapes
- Include labels only if they appear in the original diagram
- Do NOT include the question text, answer choices, or anything that gives away the answer
- Target 300–1200 bytes

If you cannot find this specific question in the PDF, or the diagram contains specific data values (like pictograph counts or coin amounts) that you cannot clearly read, respond with the single word NULL.

Respond with ONLY the SVG markup or the single word NULL. No explanation, no markdown fences.`
}

function buildSvgJudgePrompt(questionText: string, svg: string): string {
  return `You are a strict quality judge for educational SVG illustrations.

Question: "${questionText}"

SVG (${svg.length} bytes):
${svg}

Judge whether this SVG is USEFUL or USELESS for a child answering this question.

Mark USELESS if ANY of these are true:
1. Shapes are random/abstract with no clear relationship to the question
2. The SVG contains the answer or solution steps
3. The SVG is decorative noise that doesn't represent anything from the question
4. Too minimal to convey anything meaningful (e.g. just a blank rectangle)

Mark USEFUL only if the SVG clearly illustrates the scenario, object, or concept that helps a child understand what the question is asking about.

Reply with exactly one word only — no explanation, no punctuation: USEFUL or USELESS`
}

// ── SVG cleanup ────────────────────────────────────────────────────────────

function stripFences(text: string): string {
  return text.replace(/^```(?:svg|xml)?\s*/i, '').replace(/\s*```$/, '').trim()
}

// ── Main ───────────────────────────────────────────────────────────────────

interface HiddenQuestion {
  id: string
  grade: number
  subject: string
  question_text: string
  choices: { id: string; text: string }[]
  source_test: string | null
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const limitArg = args.find(a => a.startsWith('--limit='))
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : Infinity

  console.log(`recover-hidden-images${dryRun ? ' [dry-run]' : ''}\n`)

  // Fetch all hidden DOE questions
  const { data: hidden, error } = await supabase
    .from('questions')
    .select('id, grade, subject, question_text, choices, source_test')
    .eq('needs_image', true)
    .eq('source', 'doe_released')
    .order('grade', { ascending: true })

  if (error) { console.error(error); process.exit(1) }
  if (!hidden || hidden.length === 0) {
    console.log('No hidden DOE questions found.')
    return
  }

  const questions = (hidden as HiddenQuestion[]).slice(0, limit === Infinity ? hidden.length : limit)
  console.log(`Hidden DOE questions to process: ${questions.length}\n`)

  const stats = {
    recovered: 0,
    noPdf: 0,
    nullFromModel: 0,
    useless: 0,
    errors: 0,
  }
  const recoveredIds: string[] = []
  const skippedIds: { id: string; reason: string }[] = []
  const previews: { id: string; questionText: string; svg: string }[] = []

  // Cache PDFs in memory — multiple questions may share the same PDF
  const pdfCache = new Map<string, string>() // pdfPath → base64

  function loadPdf(filePath: string): string | null {
    if (pdfCache.has(filePath)) return pdfCache.get(filePath)!
    if (!fs.existsSync(filePath)) return null
    const b64 = fs.readFileSync(filePath).toString('base64')
    pdfCache.set(filePath, b64)
    return b64
  }

  for (const q of questions) {
    console.log(`\n[${q.id}] Grade ${q.grade} ${q.subject} — ${q.source_test ?? '(no source)'}`)

    try {
      // ── Step 1: Resolve PDF ─────────────────────────────────────────────
      if (!q.source_test) {
        console.log('  ⚠ No source_test — skipping')
        stats.noPdf++
        skippedIds.push({ id: q.id, reason: 'no source_test' })
        continue
      }

      const parsed = parseSourceTest(q.source_test)
      if (!parsed) {
        console.log(`  ⚠ Cannot parse source_test "${q.source_test}" — skipping`)
        stats.noPdf++
        skippedIds.push({ id: q.id, reason: `unparseable source_test: ${q.source_test}` })
        continue
      }

      const pdf = pdfPath(parsed)
      const pdfBase64 = loadPdf(pdf)
      if (!pdfBase64) {
        console.log(`  ⚠ PDF not found: ${pdf} — skipping`)
        stats.noPdf++
        skippedIds.push({ id: q.id, reason: `PDF missing: ${pdf}` })
        continue
      }

      // ── Step 2: Extract diagram from PDF ───────────────────────────────
      const choiceText = (q.choices as { id: string; text: string }[])
        .map(c => `${c.id}) ${c.text}`).join('\n')
      const extractPrompt = buildDiagramExtractionPrompt(q.question_text, choiceText)

      process.stdout.write('  → Sending to Claude vision... ')
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBase64,
              },
            } as Parameters<typeof anthropic.messages.create>[0]['messages'][0]['content'][0],
            {
              type: 'text',
              text: extractPrompt,
            },
          ],
        }],
      })

      const rawSvg = stripFences(
        response.content
          .filter(b => b.type === 'text')
          .map(b => (b as { type: 'text'; text: string }).text)
          .join('')
          .trim()
      )

      if (rawSvg.toUpperCase() === 'NULL') {
        console.log('NULL (model: cannot locate diagram)')
        stats.nullFromModel++
        skippedIds.push({ id: q.id, reason: 'model returned NULL' })
        await new Promise(r => setTimeout(r, 500))
        continue
      }

      console.log(`got ${rawSvg.length} bytes`)

      // ── Step 3: Judge the SVG ───────────────────────────────────────────
      process.stdout.write('  → Judging... ')
      const judgeResponse = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 16,
        messages: [{
          role: 'user',
          content: buildSvgJudgePrompt(q.question_text, rawSvg),
        }],
      })

      const judgeRaw = (judgeResponse.content[0] as { type: string; text: string }).text.trim().toUpperCase()
      const useful = judgeRaw.startsWith('USEFUL')
      console.log(judgeRaw)

      if (!useful) {
        console.log('  ✗ SVG judged USELESS — leaving hidden')
        stats.useless++
        skippedIds.push({ id: q.id, reason: 'SVG judged USELESS' })
        await new Promise(r => setTimeout(r, 500))
        continue
      }

      // ── Step 4: Save ────────────────────────────────────────────────────
      console.log('  ★ Recovered!')
      if (!dryRun) {
        const { error: saveErr } = await supabase
          .from('questions')
          .update({ image_svg: rawSvg, needs_image: false })
          .eq('id', q.id)
        if (saveErr) throw saveErr
      } else {
        previews.push({ id: q.id, questionText: q.question_text, svg: rawSvg })
      }
      stats.recovered++
      recoveredIds.push(q.id)
      await new Promise(r => setTimeout(r, 500))

    } catch (err) {
      console.log(`  ! ERROR: ${(err as Error).message}`)
      stats.errors++
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(50))
  console.log(`Recovered (image_svg saved, needs_image=false): ${stats.recovered}`)
  console.log(`No PDF on disk:                                  ${stats.noPdf}`)
  console.log(`Model returned NULL (diagram unreadable):        ${stats.nullFromModel}`)
  console.log(`SVG judged USELESS:                              ${stats.useless}`)
  console.log(`Errors:                                          ${stats.errors}`)
  if (dryRun) console.log('\n[dry-run] No changes written.')

  if (recoveredIds.length > 0) {
    // Pick up to 5 random IDs for spot-checking
    const sample = [...recoveredIds].sort(() => Math.random() - 0.5).slice(0, 5)
    console.log('\nSpot-check these recovered question IDs:')
    sample.forEach(id => console.log(`  ${id}`))
  }

  if (skippedIds.length > 0) {
    console.log('\nStill hidden:')
    skippedIds.forEach(({ id, reason }) => console.log(`  ${id}  (${reason})`))
  }

  // In dry-run, write an HTML preview file so you can visually spot-check SVGs.
  // SVGs are embedded as base64 data URIs in <img> tags — works reliably from file:// URLs.
  if (dryRun && previews.length > 0) {
    // Browsers need explicit width/height on the SVG root to size <img> correctly.
    // Extract dimensions from viewBox and inject them if not already on the <svg> tag.
    // Note: can't use `/ width=/` — that matches stroke-width inside the SVG body.
    const toDataUri = (svg: string) => {
      const vbMatch = svg.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/)
      let sized = svg
      if (vbMatch && !/<svg[^>]*\swidth=/.test(svg)) {
        sized = svg.replace('<svg', `<svg width="${vbMatch[1]}" height="${vbMatch[2]}"`)
      }
      return `data:image/svg+xml;base64,${Buffer.from(sized).toString('base64')}`
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Recovered SVG Preview</title>
<style>
  body { font-family: sans-serif; padding: 2rem; background: #f5f5f5; }
  .card { background: white; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; margin-bottom: 2rem; }
  .id { font-family: monospace; color: #888; font-size: 0.8rem; margin-bottom: 0.5rem; }
  .question { font-size: 0.95rem; margin-bottom: 1rem; color: #333; max-width: 600px; }
  .img-wrap { border: 1px solid #eee; border-radius: 4px; padding: 1rem; background: #fafafa; display: inline-block; }
  img { max-width: 500px; height: auto; display: block; }
</style>
</head>
<body>
<h1>Dry-run SVG previews (${previews.length} questions)</h1>
${previews.map(p => `
<div class="card">
  <div class="id">${p.id}</div>
  <div class="question">${p.questionText.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</div>
  <div class="img-wrap"><img src="${toDataUri(p.svg)}" alt="diagram" /></div>
</div>`).join('\n')}
</body></html>`

    const previewPath = path.join('data', 'recover-preview.html')
    fs.mkdirSync('data', { recursive: true })
    fs.writeFileSync(previewPath, html)
    console.log(`\n📄 SVG preview saved → ${previewPath}`)
    console.log('   Open it in a browser to visually inspect the diagrams.')
  }
}

main().catch(e => { console.error(e); process.exit(1) })
