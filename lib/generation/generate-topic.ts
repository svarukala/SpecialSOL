// lib/generation/generate-topic.ts
import Anthropic from '@anthropic-ai/sdk'
import { type SolTopic } from '@/lib/curriculum/sol-curriculum'
import { validateQuestionBatch, type GeneratedQuestion } from '@/lib/generation/question-schema'

function buildPrompt(grade: number, subject: 'math' | 'reading', topic: SolTopic, tier: 'foundational' | 'standard'): string {
  const foundationalInstructions = tier === 'foundational'
    ? `IMPORTANT: These questions are for children who are significantly behind grade level and need extra scaffolding. Apply every rule below without exception.

DIFFICULTY: Generate exactly 6 questions, ALL at difficulty 1. Do NOT generate difficulty 2 or 3.

SINGLE OPERATION RULE: Every question must require exactly one mental step to answer.
- GOOD: "There are 8 apples. Sam eats 3. How many are left?" (one subtraction)
- BAD: "Each picture equals 5 boxes. Monday has 4 pictures. How many boxes?" (scale × multiply — two steps)
- BAD: "Round 467 to the nearest hundred, then compare it to 500." (two operations)
- BAD: "A table shows snacks sold. What fraction were cookies?" (read table THEN compute fraction — two steps)

LANGUAGE:
- Every sentence must be 10 words or fewer.
- Use only Grade 1–2 vocabulary. Avoid jargon unless it IS the concept being tested.
- Use concrete, everyday scenarios: counting objects, sharing food, reading simple signs.
- Numbers should be small and friendly (under 20 for addition/subtraction; under 10 for multiplication).

TOPIC ADAPTATION: If the grade-level topic inherently requires multiple steps (e.g. pictographs with scale factors, multi-digit operations, data tables with computations), simplify it to its most basic sub-skill:
- Pictograph with scale → just "count the pictures, each = 1"
- Multi-digit addition → single-digit addition with a story context
- Fractions → identify which shape shows one half or one third (visual recognition only)
- Data table → read a single value from the table, no computation

OTHER:
- The simplified_text field must be null — do not populate it.
- All other fields (answer_type, choices, hints, difficulty, sol_standard) follow the normal format.\n\n`
    : ''
  return `${foundationalInstructions}You are creating Virginia SOL practice questions for Grade ${grade} ${subject}.

Topic: ${topic.name}
SOL Standard: ${topic.solStandard}
Standard Description: ${topic.description}

${tier === 'foundational' ? 'Generate exactly 6 multiple-choice questions for this topic, ALL at difficulty 1 (see rules above).' : `Generate exactly 6 multiple-choice questions for this topic:
- 2–3 at difficulty 1 (easy): single step, familiar context, straightforward distractors
- 2 at difficulty 2 (medium): two steps or less familiar context, one plausible distractor
- 1–2 at difficulty 3 (hard): multi-step, abstract phrasing, strong distractors`}

For EVERY question, provide TWO text versions:
- "question_text": standard SOL test-style phrasing, grade-appropriate vocabulary
- "simplified_text": plain language, max 1 sentence shorter, no words above 3rd-grade level, use concrete nouns (apples/boxes/steps), active voice, digits not words

Rules:
- Each question has exactly 4 choices (ids: "a","b","c","d"), exactly 1 with is_correct: true
- Distractors must be plausible (common mistakes, not obviously wrong)
- 3 hints per question, each revealing a bit more (hint_1 hints at concept, hint_2 narrows approach, hint_3 nearly gives answer)
- calculator_allowed: true only for Grade 5 multi-step decimal/fraction computation, otherwise false
- source: always "ai_generated"

For each question, include an "image_svg" field:
- Set to a compact inline SVG string when a visual genuinely helps (fraction diagrams,
  number lines, geometric shapes, bar/line graphs, coordinate grids, place value blocks).
- Set to null for text-only questions (arithmetic word problems, vocabulary, reading
  comprehension, poetry).
SVG rules:
- Use a viewBox (e.g. viewBox="0 0 200 100"), no fixed pixel width/height
- No <style> tags, no external hrefs, no JavaScript, no on* attributes
- Monochrome or 2-color max; simple strokes and fills only
- Keep it small — target under 1 KB

FORMATTING RULE — question_text and simplified_text:
When a question begins with a preamble instruction followed by the content to read, separate
them with a blank line (\\n\\n). Examples:
  "Read the story.\\n\\nRosa wanted to win the race..."
  "Read this passage:\\n\\nBees are important to..."
  "Read the sentence.\\n\\n\\"The dog was tiny.\\"..."
  "Read the following lines from a poem.\\n\\n\\"The stars winked...\\"..."
Do NOT run the instruction and the content together on one line.

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
    "image_svg": null,
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
