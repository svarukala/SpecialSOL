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
  return `Given this practice question for Grade ${grade} ${subject}:
"${questionText}"

Return ONLY a compact inline SVG starting with <svg and ending with </svg> — no markdown
fences, no explanation, no extra text. OR return the single word null if no image would help.

The image should illustrate the concept or scenario — do NOT depict or highlight the correct answer.

SVG rules: viewBox-based, no <style>, no scripts, no on* attributes, monochrome or
2-color max, under 1 KB.`
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
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
  const result = await model.generateContent(prompt)
  return result.response.text().trim()
}

interface QuestionRow {
  id: string
  grade: number
  subject: string
  question_text: string
  image_svg: string | null
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
    console.log(`– ${question.id} — skipped (null)`)
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

  console.log(`✓ ${question.id} — SVG generated`)
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
      await generateImageForQuestion(question, dryRun, providerArg)
      if (!dryRun) await new Promise((r) => setTimeout(r, PAUSE_MS))
      totalProcessed++
    }

    if (data.length < PAGE_SIZE) break

    offset += PAGE_SIZE
  }

  console.log(`\nDone. Processed ${totalProcessed} question(s).`)
}

main().catch((e) => { console.error(e); process.exit(1) })
