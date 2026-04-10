/**
 * fix-missing-images.ts
 *
 * Identifies DOE questions that reference a visual/diagram but have no image_svg.
 * For each:
 *   1. Judge: can a student answer this without seeing the image?
 *      YES → skip (visual is decorative or question is self-contained)
 *      NO  → attempt SVG generation
 *   2. Generate SVG (using existing generate-images pipeline)
 *   3. Judge the SVG: useful?
 *      YES → save image_svg
 *      NO  → set needs_image = true (hidden from practice sessions)
 *
 * Usage:
 *   npx tsx scripts/fix-missing-images.ts [--dry-run] [--provider=anthropic|gemini]
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

config({ path: process.env.ENV_FILE ?? '.env.local', override: true })

type Provider = 'anthropic' | 'gemini'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── Text patterns that suggest a missing image ─────────────────────────────
const VISUAL_PATTERNS = [
  /\bshown below\b/i,
  /\bthe figure below\b/i,
  /\bthe model below\b/i,
  /\bthe picture below\b/i,
  /\bthe diagram below\b/i,
  /\bthe spinner\b/i,
  /\bdotted line\b/i,
  /\bthe shape\b/i,
  /\bshaded to represent\b/i,
  /\beach figure\b/i,
  /\bwhich of the (area )?models\b/i,
  /\bthe area model\b/i,
  /\bthe following shows\b/i,
  /\bbelow\b/i,
  /\babove\b/i,
  /\bthe figure\b/i,
  /\bthe graph\b/i,
  /\bthe table\b/i,
  /\bthe diagram\b/i,
  /\bthe chart\b/i,
  /\bshown in\b/i,
  /\bshaded\b/i,
  /\bdot plot\b/i,
  /\bnumber line\b/i,
  /\bcoordinate\b/i,
  /\bgrid\b/i,
  /\bvenn diagram\b/i,
  /\bbar graph\b/i,
  /\bline plot\b/i,
  /\bpictograph\b/i,
  /\bthe picture\b/i,
]

function needsVisualCheck(text: string): boolean {
  return VISUAL_PATTERNS.some((p) => p.test(text))
}

// ── Prompts ────────────────────────────────────────────────────────────────

function buildAnswerableJudgePrompt(questionText: string, choices: string): string {
  return `You are evaluating a multiple-choice practice question from a Virginia SOL test.

Question text:
"${questionText}"

Answer choices:
${choices}

Determine whether a student can select the correct answer using ONLY the text above — without needing to see any image, diagram, figure, table, graph, or illustration.

Answer YES if:
- The question contains all necessary data inline (e.g. a number pattern written out, a table embedded as text)
- The image reference is purely decorative (e.g. "there are 274 people on the plane shown below — round 274 to the nearest hundred" — the plane picture is irrelevant)
- The answer choices themselves make the question self-contained

Answer NO if:
- The correct answer depends on seeing a specific visual (e.g. a fraction shown as a shaded region, coins/money, a geometric transformation, a spinner, a bar graph with specific values, shapes that must be compared)
- Without the image, multiple answer choices would appear equally correct

Reply with exactly one word: YES or NO`
}

function buildImagePrompt(grade: number, subject: string, questionText: string): string {
  return `You are generating a supporting illustration for an educational practice question.

Question (Grade ${grade} ${subject}):
"${questionText}"

Generate a clean SVG diagram that shows the visual element this question refers to, based on the context in the question text.

SVG rules:
- viewBox-based, no <style>, no scripts, no on* attributes
- 2–3 colors max, clean simple shapes
- 400–900 bytes target
- Do NOT include the answer, solution steps, or any text that gives away the correct response
- Label elements only if the question explicitly refers to them by name

If you cannot reconstruct a meaningful diagram from the question text alone (e.g. specific coin amounts, card values, or pictograph data that aren't stated), return the single word NULL.

Return ONLY the SVG (starting with <svg, ending with </svg>) or the single word NULL.
No markdown fences, no explanation.`
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
4. Too minimal to convey anything meaningful

Mark USEFUL only if the SVG clearly illustrates the scenario, object, or concept that helps a child understand what the question is asking about.

Reply with exactly one word: USEFUL or USELESS`
}

// ── API helpers ────────────────────────────────────────────────────────────

function stripFences(text: string): string {
  return text.replace(/^```(?:svg|xml)?\s*/i, '').replace(/\s*```$/, '').trim()
}

async function callAnthropic(prompt: string): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })
  return (msg.content[0] as { type: string; text: string }).text.trim()
}

async function callGemini(prompt: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_KEY!)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
  const maxRetries = 4
  let delay = 10_000
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent(prompt)
      return result.response.text().trim()
    } catch (err: unknown) {
      const status = (err as { status?: number }).status
      if ((status === 503 || status === 429) && attempt < maxRetries) {
        console.log(`  ⏳ Gemini ${status} — retrying in ${delay / 1000}s (attempt ${attempt}/${maxRetries})`)
        await new Promise((r) => setTimeout(r, delay))
        delay *= 2
      } else throw err
    }
  }
  throw new Error('Gemini: max retries exceeded')
}

async function call(provider: Provider, prompt: string): Promise<string> {
  return provider === 'gemini' ? callGemini(prompt) : callAnthropic(prompt)
}

// ── Main ───────────────────────────────────────────────────────────────────

interface QuestionRow {
  id: string
  grade: number
  subject: string
  question_text: string
  choices: { id: string; text: string }[]
  image_svg: string | null
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const providerArg = (
    args.find((a) => a.startsWith('--provider='))?.split('=')[1] ??
    process.env.IMAGE_PROVIDER ??
    'anthropic'
  ) as Provider

  if (providerArg !== 'anthropic' && providerArg !== 'gemini') {
    console.error(`Unknown provider "${providerArg}". Use anthropic or gemini.`)
    process.exit(1)
  }

  console.log(`Provider: ${providerArg}${dryRun ? '  [dry-run]' : ''}`)
  console.log()

  // Fetch all DOE questions with no image
  let all: QuestionRow[] = []
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from('questions')
      .select('id, grade, subject, question_text, choices, image_svg')
      .eq('source', 'doe_released')
      .is('image_svg', null)
      .eq('needs_image', false)          // skip already-flagged
      .range(from, from + 999)
    if (error) { console.error(error); process.exit(1) }
    all = all.concat(data as QuestionRow[])
    if (data!.length < 1000) break
    from += 1000
  }

  // Filter to only those whose text suggests a missing image
  const candidates = all.filter((q) => needsVisualCheck(q.question_text))
  console.log(`Candidates to process: ${candidates.length} (of ${all.length} DOE questions without image)`)
  console.log()

  const stats = { skippedSelfContained: 0, svgSaved: 0, flagged: 0, errors: 0 }

  for (const q of candidates) {
    try {
      // ── Step 1: Is the question answerable without seeing an image? ──────
      const choiceText = (q.choices as { id: string; text: string }[])
        .map((c) => `${c.id}) ${c.text}`).join('\n')
      const answerablePrompt = buildAnswerableJudgePrompt(q.question_text, choiceText)
      const answerableRaw = await call(providerArg, answerablePrompt)
      const answerable = answerableRaw.trim().toUpperCase().startsWith('YES')

      if (answerable) {
        console.log(`  ✓ ${q.id} — self-contained (no image needed)`)
        stats.skippedSelfContained++
        await new Promise((r) => setTimeout(r, 300))
        continue
      }

      // ── Step 2: Attempt SVG generation ───────────────────────────────────
      const svgPrompt = buildImagePrompt(q.grade, q.subject, q.question_text)
      const svgRaw = stripFences(await call(providerArg, svgPrompt))

      if (svgRaw.toLowerCase() === 'null') {
        // Model couldn't reconstruct the image — flag the question
        console.log(`  ✗ ${q.id} — flagged (model: cannot reconstruct image)`)
        if (!dryRun) {
          await supabase.from('questions').update({ needs_image: true }).eq('id', q.id)
        }
        stats.flagged++
        await new Promise((r) => setTimeout(r, 300))
        continue
      }

      // ── Step 3: Judge the SVG ─────────────────────────────────────────────
      const judgePrompt = buildSvgJudgePrompt(q.question_text, svgRaw)
      const judgeRaw = await call(providerArg, judgePrompt)
      const useful = judgeRaw.trim().toUpperCase().startsWith('USEFUL')

      if (!useful) {
        console.log(`  ✗ ${q.id} — flagged (judge: SVG not useful)`)
        if (!dryRun) {
          await supabase.from('questions').update({ needs_image: true }).eq('id', q.id)
        }
        stats.flagged++
        await new Promise((r) => setTimeout(r, 300))
        continue
      }

      // ── Step 4: Save the SVG ──────────────────────────────────────────────
      console.log(`  ★ ${q.id} — SVG generated and saved`)
      if (!dryRun) {
        const { error } = await supabase
          .from('questions')
          .update({ image_svg: svgRaw })
          .eq('id', q.id)
        if (error) throw error
      }
      stats.svgSaved++
      await new Promise((r) => setTimeout(r, 300))

    } catch (err) {
      console.error(`  ! ${q.id} — error: ${(err as Error).message}`)
      stats.errors++
    }
  }

  console.log()
  console.log('─────────────────────────────')
  console.log(`Self-contained (skipped):  ${stats.skippedSelfContained}`)
  console.log(`SVG generated & saved:     ${stats.svgSaved}`)
  console.log(`Flagged needs_image=true:  ${stats.flagged}`)
  console.log(`Errors:                    ${stats.errors}`)
  if (dryRun) console.log('\n[dry-run] No changes written.')
}

main().catch((e) => { console.error(e); process.exit(1) })
