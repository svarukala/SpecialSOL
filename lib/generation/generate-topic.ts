// lib/generation/generate-topic.ts
import Anthropic from '@anthropic-ai/sdk'
import { type SolTopic } from '@/lib/curriculum/sol-curriculum'
import { validateQuestionBatch, type GeneratedQuestion } from '@/lib/generation/question-schema'

function buildPrompt(grade: number, subject: 'math' | 'reading', topic: SolTopic, tier: 'foundational' | 'standard'): string {
  const foundationalInstructions = tier === 'foundational'
    ? `IMPORTANT: These questions are for children with special needs. You MUST follow these rules:
- Every sentence must be 10 words or fewer.
- Each question tests exactly ONE concept — no compound ideas.
- Use only Grade 1–2 vocabulary. No subject-specific jargon unless it is the core concept being tested.
- Use concrete, everyday scenarios (sharing food, counting objects, reading a sign).
- The simplified_text field must be null — do not populate it.
- All other fields (answer_type, choices, hints, difficulty, sol_standard) follow the normal format.\n\n`
    : ''
  return `${foundationalInstructions}You are creating Virginia SOL practice questions for Grade ${grade} ${subject}.

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

export async function generateTopic(
  grade: number,
  subject: 'math' | 'reading',
  topic: SolTopic,
  tier: 'foundational' | 'standard' = 'standard'
): Promise<GeneratedQuestion[]> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: buildPrompt(grade, subject, topic, tier) }],
  })

  const raw = (message.content[0] as { type: string; text: string }).text.trim()
  const jsonText = raw.startsWith('```')
    ? raw.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '')
    : raw

  let parsed: unknown[]
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new Error(`Failed to parse JSON from model response: ${jsonText.slice(0, 200)}`)
  }

  return validateQuestionBatch(parsed)
}
