// scripts/generate-questions.ts
import Anthropic from '@anthropic-ai/sdk'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { config } from 'dotenv'
import { getTopicsForGradeSubject, type SolTopic } from './sol-curriculum'
import { validateQuestionBatch } from './question-schema'

config({ path: '.env.local', override: true })

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const OUT_DIR = join(process.cwd(), 'supabase/seed/generated')

function buildPrompt(grade: number, subject: 'math' | 'reading', topic: SolTopic): string {
  return `You are creating Virginia SOL practice questions for Grade ${grade} ${subject}.

Topic: ${topic.name}
SOL Standard: ${topic.solStandard}
Standard Description: ${topic.description}

Generate exactly 6 multiple-choice questions for this topic:
- 2–3 at difficulty 1 (easy): single step, familiar context, straightforward distractors
- 2 at difficulty 2 (medium): two steps or less familiar context, one plausible distractor
- 1–2 at difficulty 3 (hard): multi-step, abstract phrasing, strong distractors

For EVERY question, provide TWO text versions:
- "question_text": standard SOL test-style phrasing, grade-appropriate vocabulary
- "simplified_text": plain language, max 1 sentence shorter, no words above 3rd-grade level, use concrete nouns (apples/boxes/steps), active voice, digits not words

Rules:
- Each question has exactly 4 choices (ids: "a","b","c","d"), exactly 1 with is_correct: true
- Distractors must be plausible (common mistakes, not obviously wrong)
- 3 hints per question, each revealing a bit more (hint_1 hints at concept, hint_2 narrows approach, hint_3 nearly gives answer)
- calculator_allowed: true only for Grade 5 multi-step decimal/fraction computation, otherwise false
- source: always "ai_generated"

Return a JSON array only (no markdown, no explanation):
[
  {
    "grade": ${grade},
    "subject": "${subject}",
    "topic": "${topic.name}",
    "subtopic": "<specific concept within topic>",
    "sol_standard": "${topic.solStandard}",
    "difficulty": 1,
    "question_text": "<standard SOL phrasing>",
    "simplified_text": "<plain language version>",
    "answer_type": "multiple_choice",
    "choices": [
      {"id": "a", "text": "<correct answer>", "is_correct": true},
      {"id": "b", "text": "<distractor>", "is_correct": false},
      {"id": "c", "text": "<distractor>", "is_correct": false},
      {"id": "d", "text": "<distractor>", "is_correct": false}
    ],
    "hint_1": "<concept pointer>",
    "hint_2": "<approach narrower>",
    "hint_3": "<near answer>",
    "calculator_allowed": false,
    "source": "ai_generated"
  }
]`
}

function topicSlug(name: string): string {
  return name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
}

async function generateTopic(grade: number, subject: 'math' | 'reading', topic: SolTopic) {
  console.log(`Generating: Grade ${grade} ${subject} — ${topic.name} (${topic.solStandard})...`)

  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: buildPrompt(grade, subject, topic) }],
  })

  const raw = (message.content[0] as { type: string; text: string }).text.trim()

  // Strip markdown code fences if present
  const jsonText = raw.startsWith('```') ? raw.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '') : raw

  let questions: unknown[]
  try {
    questions = JSON.parse(jsonText)
  } catch {
    console.error(`  ✗ Failed to parse JSON for ${topic.name}`)
    console.error(jsonText.slice(0, 300))
    return
  }

  try {
    const validated = validateQuestionBatch(questions)
    const slug = topicSlug(topic.name)
    const outPath = join(OUT_DIR, `grade${grade}-${subject}-${slug}.json`)
    writeFileSync(outPath, JSON.stringify(validated, null, 2))
    console.log(`  ✓ ${validated.length} questions → ${outPath}`)
  } catch (e) {
    console.error(`  ✗ Validation error for ${topic.name}: ${(e as Error).message}`)
  }
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })

  const args = process.argv.slice(2)
  const gradeArg = args.find((a) => a.startsWith('--grade='))?.split('=')[1]
    ?? args[args.indexOf('--grade') + 1]
  const subjectArg = args.find((a) => a.startsWith('--subject='))?.split('=')[1]
    ?? args[args.indexOf('--subject') + 1]
  const topicArg = args.find((a) => a.startsWith('--topic='))?.split('=')[1]
    ?? (args.indexOf('--topic') >= 0 ? args[args.indexOf('--topic') + 1] : undefined)
  const allFlag = args.includes('--all')

  const gradesToRun: number[] = allFlag
    ? [3, 4, 5]
    : gradeArg ? [parseInt(gradeArg)] : []

  const subjectsToRun: ('math' | 'reading')[] = allFlag
    ? ['math', 'reading']
    : subjectArg ? [subjectArg as 'math' | 'reading'] : []

  if (gradesToRun.length === 0 || subjectsToRun.length === 0) {
    console.error('Usage: npx tsx scripts/generate-questions.ts --grade 3 --subject math [--topic "fractions"]')
    console.error('       npx tsx scripts/generate-questions.ts --all')
    process.exit(1)
  }

  for (const grade of gradesToRun) {
    for (const subject of subjectsToRun) {
      const topics = getTopicsForGradeSubject(grade, subject)
      for (const topic of topics) {
        if (topicArg && topic.name !== topicArg) continue
        await generateTopic(grade, subject, topic)
        // Respectful pause between API calls
        await new Promise((r) => setTimeout(r, 1000))
      }
    }
  }

  console.log('\nDone. Review files in supabase/seed/generated/ before running consolidate:questions.')
}

main().catch((e) => { console.error(e); process.exit(1) })
