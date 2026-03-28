// scripts/generate-images.ts
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

config({ path: process.env.ENV_FILE ?? '.env.local', override: true })

// Switch provider via --provider=anthropic|gemini flag or IMAGE_PROVIDER env var.
// Defaults to anthropic.
type Provider = 'anthropic' | 'gemini'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PAGE_SIZE = 50
const PAUSE_MS = 500

function buildImagePrompt(grade: number, subject: string, questionText: string): string {
  return `You are generating a supporting illustration for an educational practice question.

Question (Grade ${grade} ${subject}):
"${questionText}"

DECISION — does this question benefit from an image?
Return the single word NULL (no SVG) if the question is:
- Pure arithmetic or calculation (e.g. "What is 567 + 218?")
- A reading comprehension passage where text IS the content
- A vocabulary/definition question (words don't need pictures)
- A word-roots or prefix/suffix question
- A research/source-reliability question
- Already self-contained in text with no visual component

Only generate an SVG if it would genuinely help a child understand the SCENARIO or CONCEPT:
- A story setting or character situation (fiction comprehension)
- A geometric shape, number line, place-value chart, fraction bar, data table
- A concrete object count or grouping that the question refers to
- A sequence or pattern the child needs to see

SVG rules (when you do generate):
- viewBox-based, no <style>, no scripts, no on* attributes
- 2–3 colors max, clean simple shapes
- 400–900 bytes target; if you cannot draw something meaningful in that budget, return NULL
- Do NOT include the answer, solution steps, or any text that gives away the correct response
- Label axes or objects only if the question explicitly refers to them by name

Return ONLY the SVG (starting with <svg, ending with </svg>) or the single word NULL.
No markdown fences, no explanation, no other text.`
}

function buildJudgePrompt(questionText: string, svg: string): string {
  return `You are a strict quality judge for educational SVG illustrations.

Question: "${questionText}"

SVG (${svg.length} bytes):
${svg}

Judge whether this SVG is USEFUL or USELESS for a child answering this question.

Mark it USELESS if ANY of these are true:
1. The shapes are random/abstract with no clear relationship to the question topic
2. The SVG contains the answer, solution steps, or spoiler text (e.g. "Mode = 5", "= 50%")
3. The SVG is decorative noise — circles, lines, polygons that don't represent anything from the question
4. The question is pure text (reading passage, vocabulary, arithmetic) and the SVG adds nothing
5. The SVG is too minimal to convey anything (a single circle or path with no labels)

Mark it USEFUL only if the SVG clearly illustrates a scenario, object, structure, or concept that helps a child understand WHAT the question is asking about.

Reply with exactly one word: USEFUL or USELESS`
}

function stripFences(text: string): string {
  return text.replace(/^```(?:svg|xml)?\s*/i, '').replace(/\s*```$/, '').trim()
}

async function callAnthropic(prompt: string): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })
  return (message.content[0] as { type: string; text: string }).text.trim()
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
      } else {
        throw err
      }
    }
  }
  throw new Error('Gemini: max retries exceeded')
}

interface QuestionRow {
  id: string
  grade: number
  subject: string
  question_text: string
  image_svg: string | null
}

async function judgesvg(questionText: string, svg: string, provider: Provider): Promise<boolean> {
  const prompt = buildJudgePrompt(questionText, svg)
  const response = provider === 'gemini'
    ? await callGemini(prompt)
    : await callAnthropic(prompt)
  return response.trim().toUpperCase().startsWith('USEFUL')
}

async function generateImageForQuestion(
  question: QuestionRow,
  dryRun: boolean,
  provider: Provider
): Promise<void> {
  const prompt = buildImagePrompt(question.grade, question.subject, question.question_text)

  if (dryRun) {
    console.log(`– ${question.id} — would generate SVG (dry-run, provider: ${provider})`)
    return
  }

  const responseText = provider === 'gemini'
    ? await callGemini(prompt)
    : await callAnthropic(prompt)

  const raw = stripFences(responseText)

  if (raw.toLowerCase() === 'null') {
    console.log(`– ${question.id} — skipped (model: no image needed)`)
    return
  }

  const useful = await judgesvg(question.question_text, raw, provider)
  if (!useful) {
    console.log(`– ${question.id} — skipped (judge: useless SVG)`)
    return
  }

  const { error } = await supabase
    .from('questions')
    .update({ image_svg: raw })
    .eq('id', question.id)

  if (error) {
    console.error(`✗ ${question.id} — DB update failed: ${error.message}`)
    return
  }

  console.log(`✓ ${question.id} — SVG generated and passed judge`)
}

function getArg(args: string[], flag: string): string | undefined {
  return args.find((a) => a.startsWith(`--${flag}=`))?.split('=')[1]
    ?? (args.indexOf(`--${flag}`) >= 0 ? args[args.indexOf(`--${flag}`) + 1] : undefined)
}

async function main() {
  const args = process.argv.slice(2)

  const dryRun = args.includes('--dry-run')
  const regenerate = args.includes('--regenerate')

  const providerArg = (getArg(args, 'provider') ?? process.env.IMAGE_PROVIDER ?? 'anthropic') as Provider
  if (providerArg !== 'anthropic' && providerArg !== 'gemini') {
    console.error(`Unknown provider "${providerArg}". Use anthropic or gemini.`)
    process.exit(1)
  }

  const gradeArg = getArg(args, 'grade')
  const subjectArg = getArg(args, 'subject')
  const topicArg = getArg(args, 'topic')
  const tierArg = getArg(args, 'tier')

  console.log(`Provider: ${providerArg}`)
  if (dryRun) console.log('[dry-run] No changes will be written to the database.')

  let offset = 0
  let totalProcessed = 0

  while (true) {
    let query = supabase
      .from('questions')
      .select('id, grade, subject, question_text, image_svg')
      .range(offset, offset + PAGE_SIZE - 1)

    if (!regenerate) {
      query = query.is('image_svg', null)
    }

    if (gradeArg) query = query.eq('grade', parseInt(gradeArg))
    if (subjectArg) query = query.eq('subject', subjectArg)
    if (topicArg) query = query.eq('topic', topicArg)
    if (tierArg) query = query.eq('tier', tierArg)

    const { data, error } = await query

    if (error) {
      console.error('Failed to fetch questions:', error.message)
      process.exit(1)
    }

    if (!data || data.length === 0) break

    for (const question of data as QuestionRow[]) {
      try {
        await generateImageForQuestion(question, dryRun, providerArg)
      } catch (err) {
        console.error(`✗ ${question.id} — API error: ${(err as Error).message}`)
      }
      if (!dryRun) await new Promise((r) => setTimeout(r, PAUSE_MS))
      totalProcessed++
    }

    if (data.length < PAGE_SIZE) break

    offset += PAGE_SIZE
  }

  console.log(`\nDone. Processed ${totalProcessed} question(s).`)
}

main().catch((e) => { console.error(e); process.exit(1) })
