// scripts/generate-images.ts
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

config({ path: process.env.ENV_FILE ?? '.env.local', override: true })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const PAGE_SIZE = 50
const PAUSE_MS = 500

function buildImagePrompt(grade: number, subject: string, questionText: string): string {
  return `Given this practice question for Grade ${grade} ${subject}:
"${questionText}"

Return ONLY a compact inline SVG (no markdown, no explanation) that visually supports
this question, OR return the single word null if no image would help.

SVG rules: viewBox-based, no <style>, no scripts, no on* attributes, monochrome or
2-color max, under 1 KB.`
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
  dryRun: boolean
): Promise<void> {
  const prompt = buildImagePrompt(question.grade, question.subject, question.question_text)

  if (dryRun) {
    console.log(`– ${question.id} — would generate SVG (dry-run)`)
    return
  }

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = (message.content[0] as { type: string; text: string }).text.trim()

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

async function main() {
  const args = process.argv.slice(2)

  const dryRun = args.includes('--dry-run')
  const regenerate = args.includes('--regenerate')

  const gradeArg = args.find((a) => a.startsWith('--grade='))?.split('=')[1]
    ?? (args.indexOf('--grade') >= 0 ? args[args.indexOf('--grade') + 1] : undefined)
  const subjectArg = args.find((a) => a.startsWith('--subject='))?.split('=')[1]
    ?? (args.indexOf('--subject') >= 0 ? args[args.indexOf('--subject') + 1] : undefined)
  const topicArg = args.find((a) => a.startsWith('--topic='))?.split('=')[1]
    ?? (args.indexOf('--topic') >= 0 ? args[args.indexOf('--topic') + 1] : undefined)

  if (dryRun) {
    console.log('[dry-run] No changes will be written to the database.')
  }

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

    if (gradeArg) {
      query = query.eq('grade', parseInt(gradeArg))
    }
    if (subjectArg) {
      query = query.eq('subject', subjectArg)
    }
    if (topicArg) {
      query = query.eq('topic', topicArg)
    }

    const { data, error } = await query

    if (error) {
      console.error('Failed to fetch questions:', error.message)
      process.exit(1)
    }

    if (!data || data.length === 0) {
      break
    }

    for (const question of data as QuestionRow[]) {
      await generateImageForQuestion(question, dryRun)
      await new Promise((r) => setTimeout(r, PAUSE_MS))
      totalProcessed++
    }

    if (data.length < PAGE_SIZE) {
      break
    }

    offset += PAGE_SIZE
  }

  console.log(`\nDone. Processed ${totalProcessed} question(s).`)
}

main().catch((e) => { console.error(e); process.exit(1) })
