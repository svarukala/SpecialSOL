# Question Generation Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an offline AI question generation pipeline producing 300 VA SOL-aligned questions (grades 3–5), add progressive simplified→standard language-level tracking per child per topic, and wire difficulty distribution into the session question picker.

**Architecture:** Generation scripts (sol-curriculum → generate-questions → consolidate) produce reviewed JSON, seeded via existing db-seed script. DB gains a `child_topic_levels` table; three query functions in `queries.ts` handle language-level lookup and progression; API routes and TTS are updated to serve the correct text variant.

**Tech Stack:** TypeScript, tsx, `@anthropic-ai/sdk`, Vitest, Supabase JS client, Next.js 16 App Router.

**Spec:** `docs/superpowers/specs/2026-03-24-question-generation-pipeline-design.md`

---

## File Map

| Action | File | Purpose |
|---|---|---|
| Create | `supabase/migrations/0007_child_topic_levels.sql` | New table for per-child per-topic language level |
| Create | `scripts/sol-curriculum.ts` | SOL topics registry (grade→subject→topics) |
| Create | `scripts/generate-questions.ts` | Claude API question generator (per topic) |
| Create | `scripts/consolidate-questions.ts` | Merges generated/*.json → questions.json |
| Modify | `.gitignore` | Add `supabase/seed/generated/` |
| Modify | `package.json` | Add `generate:questions` and `consolidate:questions` scripts |
| Modify | `lib/supabase/queries.ts` | Add 2 new functions, update `getQuestionsForSession` |
| Modify | `app/api/questions/route.ts` | Pass language level to question picker |
| Modify | `app/api/sessions/[sessionId]/route.ts` | Bump topic levels after session |
| Modify | `app/(practice)/practice/[childId]/practice-session.tsx` | Fix TTS to use simplified_text |
| Create | `lib/supabase/queries.test.ts` | Tests for the 3 new/updated query functions |
| Create | `scripts/consolidate-questions.test.ts` | Tests for deduplication logic |

---

## Task 1: DB Migration — child_topic_levels

**Files:**
- Create: `supabase/migrations/0007_child_topic_levels.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/0007_child_topic_levels.sql
CREATE TABLE child_topic_levels (
  child_id       uuid REFERENCES children(id) ON DELETE CASCADE,
  subject        text NOT NULL,
  topic          text NOT NULL,
  language_level text NOT NULL DEFAULT 'simplified'
    CHECK (language_level IN ('simplified', 'standard')),
  sessions_at_level int NOT NULL DEFAULT 0,
  updated_at     timestamptz DEFAULT now(),
  PRIMARY KEY (child_id, subject, topic)
);

ALTER TABLE child_topic_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "child_topic_levels_parent_rw" ON child_topic_levels
  FOR ALL
  USING (child_id IN (SELECT id FROM children WHERE parent_id = auth.uid()));

-- updated_at is maintained by application code (no trigger).
-- Every upsert must include updated_at: new Date().toISOString()
```

- [ ] **Step 2: Apply migration to local Supabase**

```bash
npx supabase db push
```

Expected: `Applied migration 0007_child_topic_levels`

- [ ] **Step 3: Verify table exists**

```bash
npx supabase db diff
```

Expected: no diff (migration is applied and up to date)

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0007_child_topic_levels.sql
git commit -m "feat: add child_topic_levels migration for progressive language levels"
```

---

## Task 2: Project Scaffolding — .gitignore, package.json scripts, install SDK

**Files:**
- Modify: `.gitignore`
- Modify: `package.json`

- [ ] **Step 1: Add generated directory to .gitignore**

Add this line to `.gitignore`:
```
supabase/seed/generated/
```

- [ ] **Step 2: Create the generated directory with a .gitkeep**

```bash
mkdir -p supabase/seed/generated
touch supabase/seed/generated/.gitkeep
```

- [ ] **Step 3: Add scripts to package.json**

In the `"scripts"` block of `package.json`, add:
```json
"generate:questions": "npx tsx scripts/generate-questions.ts",
"consolidate:questions": "npx tsx scripts/consolidate-questions.ts"
```

- [ ] **Step 4: Install Anthropic SDK**

```bash
npm install @anthropic-ai/sdk
```

Expected: package installed, `package.json` and `package-lock.json` updated.

- [ ] **Step 5: Commit**

```bash
git add .gitignore package.json package-lock.json supabase/seed/generated/.gitkeep
git commit -m "chore: scaffold question generation pipeline (gitignore, scripts, sdk)"
```

---

## Task 3: SOL Curriculum Registry

**Files:**
- Create: `scripts/sol-curriculum.ts`

No tests needed — this is a pure data file with no logic.

- [ ] **Step 1: Create the registry**

```ts
// scripts/sol-curriculum.ts

export interface SolTopic {
  name: string       // used as the `topic` field in questions table
  solStandard: string // e.g. "3.2"
  description: string // human-readable for the Claude prompt
}

export interface SolSubject {
  math: SolTopic[]
  reading: SolTopic[]
}

export const SOL_CURRICULUM: Record<number, SolSubject> = {
  3: {
    math: [
      { name: 'place value and number sense',   solStandard: '3.1', description: 'Read, write, and identify place value of six-digit whole numbers' },
      { name: 'fractions',                      solStandard: '3.2', description: 'Name, write, and model fractions and mixed numbers; compare and order fractions' },
      { name: 'addition and subtraction',       solStandard: '3.3', description: 'Addition and subtraction of whole numbers up to 9,999; estimate sums/differences' },
      { name: 'multiplication',                 solStandard: '3.4', description: 'Represent multiplication as repeated addition; create/solve multiplication problems (facts 0–10)' },
      { name: 'division',                       solStandard: '3.5', description: 'Represent division as equal sharing and repeated subtraction; create/solve division problems' },
      { name: 'measurement',                    solStandard: '3.7', description: 'Measure length, determine perimeter, area, tell time, count money, read temperature' },
      { name: 'geometry',                       solStandard: '3.12', description: 'Identify plane and solid figures; congruence and symmetry' },
      { name: 'data and graphs',                solStandard: '3.14', description: 'Collect, organize, and display data using picture graphs, bar graphs, and line plots' },
      { name: 'patterns and algebra',           solStandard: '3.16', description: 'Identify, describe, create, and extend patterns; commutative and identity properties' },
    ],
    reading: [
      { name: 'word study and phonics',         solStandard: '3.2', description: 'Use phonics, word analysis, and context to decode multi-syllabic words; prefixes, suffixes, roots' },
      { name: 'vocabulary',                     solStandard: '3.4', description: 'Determine meaning of unfamiliar words using context clues and reference materials' },
      { name: 'fiction comprehension',          solStandard: '3.5', description: 'Read and demonstrate comprehension of fiction: main idea, plot, character, setting, theme' },
      { name: 'nonfiction comprehension',       solStandard: '3.6', description: 'Read and demonstrate comprehension of nonfiction: main idea, supporting details, text features' },
      { name: 'poetry',                         solStandard: '3.7', description: 'Identify rhythm, rhyme, and figurative language in poetry' },
      { name: 'research and reference',         solStandard: '3.10', description: 'Use reference materials to gather information and cite sources' },
    ],
  },
  4: {
    math: [
      { name: 'place value and rounding',       solStandard: '4.1', description: 'Place value and rounding of whole numbers through millions; compare and order' },
      { name: 'fractions and mixed numbers',    solStandard: '4.2', description: 'Compare and order fractions and mixed numbers; represent equivalent fractions' },
      { name: 'decimals',                       solStandard: '4.3', description: 'Read, write, represent, and identify decimals through thousandths' },
      { name: 'multiplication and division',    solStandard: '4.4', description: 'Multiply two-digit by two-digit numbers; estimate products; divide by one-digit divisors' },
      { name: 'fractions computation',          solStandard: '4.5', description: 'Add and subtract fractions and mixed numbers with like denominators' },
      { name: 'measurement',                    solStandard: '4.7', description: 'Measure and convert US customary and metric units; elapsed time; perimeter and area' },
      { name: 'geometry',                       solStandard: '4.10', description: 'Points, lines, angles, parallel/perpendicular lines; classify quadrilaterals and triangles' },
      { name: 'data and probability',           solStandard: '4.13', description: 'Collect, display, and interpret data; predict likelihood of outcomes; represent probability as fraction' },
      { name: 'patterns and algebra',           solStandard: '4.15', description: 'Identify and extend patterns; write and solve one-step equations' },
    ],
    reading: [
      { name: 'word study and roots',          solStandard: '4.2', description: 'Use context and word analysis to decode multi-syllabic words; Latin and Greek roots' },
      { name: 'vocabulary',                    solStandard: '4.4', description: 'Determine meaning of unfamiliar words; multiple-meaning words; figurative language' },
      { name: 'fiction comprehension',         solStandard: '4.5', description: 'Comprehend fiction: plot structure, conflict, character motivation, theme, point of view' },
      { name: 'nonfiction comprehension',      solStandard: '4.6', description: 'Comprehend nonfiction: main idea, fact vs. opinion, text structure, author\'s purpose' },
      { name: 'poetry',                        solStandard: '4.7', description: 'Identify sensory language, metaphor, simile, and personification in poetry' },
      { name: 'research and reference',        solStandard: '4.10', description: 'Use print and digital resources to locate, evaluate, and cite information' },
    ],
  },
  5: {
    math: [
      { name: 'decimals and place value',      solStandard: '5.1', description: 'Read, write, identify place value of decimals through thousandths; round decimals' },
      { name: 'fractions and decimals',        solStandard: '5.2', description: 'Represent and identify equivalences among fractions, mixed numbers, and decimals' },
      { name: 'prime and composite numbers',   solStandard: '5.3', description: 'Identify and describe prime and composite numbers; identify even and odd' },
      { name: 'fractions computation',         solStandard: '5.4', description: 'Add, subtract, and multiply fractions and mixed numbers; solve single- and multi-step problems' },
      { name: 'decimal computation',           solStandard: '5.6', description: 'Add, subtract, multiply, and divide decimals; solve single- and multi-step problems' },
      { name: 'order of operations',           solStandard: '5.7', description: 'Evaluate expressions using order of operations: parentheses, exponents, ×, ÷, +, −' },
      { name: 'measurement and geometry',      solStandard: '5.8', description: 'Perimeter, area, volume; classify angles, triangles, quadrilaterals; diameter, radius, circumference' },
      { name: 'data and probability',          solStandard: '5.14', description: 'Predict probability; represent as fractions/decimals/percents; mean, median, mode, range' },
      { name: 'patterns and algebra',          solStandard: '5.17', description: 'Write variable expressions for patterns; perfect squares and square roots; solve for missing variable' },
    ],
    reading: [
      { name: 'word study and roots',          solStandard: '5.2', description: 'Greek/Latin roots, affixes; determine word meaning from context and word analysis' },
      { name: 'vocabulary and figurative language', solStandard: '5.4', description: 'Connotation, denotation, figurative language, and idioms' },
      { name: 'fiction comprehension',         solStandard: '5.5', description: 'Analyze fiction: theme, character development, conflict, narrator perspective, literary devices' },
      { name: 'nonfiction comprehension',      solStandard: '5.6', description: 'Analyze nonfiction: author\'s purpose, argument, evidence, text structure, bias' },
      { name: 'poetry',                        solStandard: '5.7', description: 'Analyze figurative language, mood, tone, and structure in poetry' },
      { name: 'research and reference',        solStandard: '5.10', description: 'Collect, evaluate, synthesize, and cite information from print and digital resources' },
    ],
  },
}

export function getTopicsForGradeSubject(grade: number, subject: 'math' | 'reading'): SolTopic[] {
  return SOL_CURRICULUM[grade]?.[subject] ?? []
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/sol-curriculum.ts
git commit -m "feat: add VA SOL curriculum registry (grades 3-5)"
```

---

## Task 4: Question Validation Utility

**Files:**
- Create: `scripts/question-schema.ts`
- Create: `scripts/question-schema.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// scripts/question-schema.test.ts
import { describe, it, expect } from 'vitest'
import { validateQuestion, ValidationError } from './question-schema'

const validQuestion = {
  grade: 3,
  subject: 'math',
  topic: 'fractions',
  subtopic: 'identifying fractions',
  sol_standard: '3.2',
  difficulty: 1,
  question_text: 'Which fraction shows 1 out of 4 equal parts?',
  simplified_text: 'A shape has 4 equal parts. 1 part is shaded. What fraction is shaded?',
  answer_type: 'multiple_choice',
  choices: [
    { id: 'a', text: '1/4', is_correct: true },
    { id: 'b', text: '1/3', is_correct: false },
    { id: 'c', text: '2/4', is_correct: false },
    { id: 'd', text: '3/4', is_correct: false },
  ],
  hint_1: 'Count the total equal parts.',
  hint_2: 'The bottom number is the total, the top is the shaded part.',
  hint_3: '1 shaded out of 4 total = 1/4.',
  calculator_allowed: false,
  source: 'ai_generated',
}

describe('validateQuestion', () => {
  it('accepts a valid question', () => {
    expect(() => validateQuestion(validQuestion)).not.toThrow()
  })

  it('rejects missing required fields', () => {
    const bad = { ...validQuestion, question_text: undefined }
    expect(() => validateQuestion(bad)).toThrow(ValidationError)
  })

  it('rejects choices count !== 4', () => {
    const bad = { ...validQuestion, choices: validQuestion.choices.slice(0, 3) }
    expect(() => validateQuestion(bad)).toThrow(ValidationError)
  })

  it('rejects zero correct answers', () => {
    const bad = { ...validQuestion, choices: validQuestion.choices.map((c) => ({ ...c, is_correct: false })) }
    expect(() => validateQuestion(bad)).toThrow(ValidationError)
  })

  it('rejects more than one correct answer', () => {
    const bad = { ...validQuestion, choices: validQuestion.choices.map((c) => ({ ...c, is_correct: true })) }
    expect(() => validateQuestion(bad)).toThrow(ValidationError)
  })

  it('rejects invalid difficulty', () => {
    const bad = { ...validQuestion, difficulty: 4 }
    expect(() => validateQuestion(bad)).toThrow(ValidationError)
  })

  it('rejects missing simplified_text', () => {
    const bad = { ...validQuestion, simplified_text: undefined }
    expect(() => validateQuestion(bad)).toThrow(ValidationError)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- scripts/question-schema.test.ts
```

Expected: FAIL — `Cannot find module './question-schema'`

- [ ] **Step 3: Implement the validator**

```ts
// scripts/question-schema.ts

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export interface GeneratedQuestion {
  grade: number
  subject: string
  topic: string
  subtopic: string
  sol_standard: string
  difficulty: number
  question_text: string
  simplified_text: string
  answer_type: string
  choices: { id: string; text: string; is_correct: boolean }[]
  hint_1: string
  hint_2: string
  hint_3: string
  calculator_allowed: boolean
  source: string
}

export function validateQuestion(q: Partial<GeneratedQuestion>): GeneratedQuestion {
  const required = [
    'grade', 'subject', 'topic', 'subtopic', 'sol_standard', 'difficulty',
    'question_text', 'simplified_text', 'answer_type', 'choices',
    'hint_1', 'hint_2', 'hint_3', 'calculator_allowed', 'source',
  ] as const

  for (const field of required) {
    if (q[field] === undefined || q[field] === null) {
      throw new ValidationError(`Missing required field: ${field}`)
    }
  }

  if (![1, 2, 3].includes(q.difficulty!)) {
    throw new ValidationError(`difficulty must be 1, 2, or 3 — got ${q.difficulty}`)
  }

  if (!Array.isArray(q.choices) || q.choices.length !== 4) {
    throw new ValidationError(`choices must be an array of exactly 4 items — got ${q.choices?.length}`)
  }

  const correctCount = q.choices.filter((c) => c.is_correct).length
  if (correctCount !== 1) {
    throw new ValidationError(`exactly 1 choice must have is_correct: true — got ${correctCount}`)
  }

  return q as GeneratedQuestion
}

export function validateQuestionBatch(questions: unknown[]): GeneratedQuestion[] {
  return questions.map((q, i) => {
    try {
      return validateQuestion(q as Partial<GeneratedQuestion>)
    } catch (e) {
      throw new ValidationError(`Question ${i + 1}: ${(e as Error).message}`)
    }
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- scripts/question-schema.test.ts
```

Expected: all 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/question-schema.ts scripts/question-schema.test.ts
git commit -m "feat: add question schema validator for generation pipeline"
```

---

## Task 5: Consolidation Script

**Files:**
- Create: `scripts/consolidate-questions.ts`
- Create: `scripts/consolidate-questions.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// scripts/consolidate-questions.test.ts
import { describe, it, expect } from 'vitest'
import { deduplicateQuestions } from './consolidate-questions'

const base = {
  grade: 3, subject: 'math', topic: 'fractions', subtopic: 'x',
  sol_standard: '3.2', difficulty: 1,
  question_text: 'What is 1/4?', simplified_text: 'What is 1 out of 4?',
  answer_type: 'multiple_choice',
  choices: [{ id: 'a', text: '0.25', is_correct: true }, { id: 'b', text: '0.5', is_correct: false }, { id: 'c', text: '0.75', is_correct: false }, { id: 'd', text: '1', is_correct: false }],
  hint_1: 'h1', hint_2: 'h2', hint_3: 'h3', calculator_allowed: false, source: 'ai_generated',
}

describe('deduplicateQuestions', () => {
  it('keeps unique questions', () => {
    const q2 = { ...base, sol_standard: '3.3', question_text: 'What is 2+2?' }
    expect(deduplicateQuestions([base, q2])).toHaveLength(2)
  })

  it('removes exact duplicate (same sol_standard + question_text)', () => {
    expect(deduplicateQuestions([base, { ...base }])).toHaveLength(1)
  })

  it('removes duplicate regardless of whitespace case differences', () => {
    const dup = { ...base, question_text: 'what is 1/4? ' }
    expect(deduplicateQuestions([base, dup])).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- scripts/consolidate-questions.test.ts
```

Expected: FAIL — `Cannot find module './consolidate-questions'`

- [ ] **Step 3: Implement consolidation script**

```ts
// scripts/consolidate-questions.ts
import { readFileSync, readdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { validateQuestionBatch, type GeneratedQuestion } from './question-schema'

const GENERATED_DIR = join(process.cwd(), 'supabase/seed/generated')
const OUTPUT_FILE = join(process.cwd(), 'supabase/seed/questions.json')

export function deduplicateQuestions(questions: GeneratedQuestion[]): GeneratedQuestion[] {
  const seen = new Set<string>()
  return questions.filter((q) => {
    const key = `${q.sol_standard}::${q.question_text.trim().toLowerCase()}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function main() {
  // Load existing questions.json
  const existing: GeneratedQuestion[] = JSON.parse(readFileSync(OUTPUT_FILE, 'utf-8'))

  // Load all generated files
  const generatedFiles = readdirSync(GENERATED_DIR).filter((f) => f.endsWith('.json') && f !== '.gitkeep')
  const generated: GeneratedQuestion[] = []
  for (const file of generatedFiles) {
    const raw = JSON.parse(readFileSync(join(GENERATED_DIR, file), 'utf-8'))
    try {
      generated.push(...validateQuestionBatch(raw))
    } catch (e) {
      console.error(`Validation failed in ${file}: ${(e as Error).message}`)
      process.exit(1)
    }
  }

  const merged = deduplicateQuestions([...existing, ...generated])
  writeFileSync(OUTPUT_FILE, JSON.stringify(merged, null, 2))

  // Print summary
  const byGradeSubject: Record<string, number> = {}
  for (const q of merged) {
    const key = `Grade ${q.grade} ${q.subject}`
    byGradeSubject[key] = (byGradeSubject[key] ?? 0) + 1
  }
  console.log(`\nConsolidated ${merged.length} questions (${existing.length} existing + ${generated.length} new − duplicates):`)
  for (const [key, count] of Object.entries(byGradeSubject).sort()) {
    console.log(`  ${key}: ${count}`)
  }
}

// Only run main() when invoked directly, not when imported by tests
if (process.argv[1] === import.meta.filename) main()
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- scripts/consolidate-questions.test.ts
```

Expected: all 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/consolidate-questions.ts scripts/consolidate-questions.test.ts
git commit -m "feat: add question consolidation script with deduplication"
```

---

## Task 6: Question Generation Script

**Files:**
- Create: `scripts/generate-questions.ts`

No unit tests — this calls the external Claude API. Test manually by running with `--grade 3 --subject math --topic "fractions"`.

- [ ] **Step 1: Create the generation script**

```ts
// scripts/generate-questions.ts
import Anthropic from '@anthropic-ai/sdk'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { config } from 'dotenv'
import { SOL_CURRICULUM, getTopicsForGradeSubject, type SolTopic } from './sol-curriculum'
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
```

- [ ] **Step 2: Test with a single topic (dry run)**

```bash
export ANTHROPIC_API_KEY=sk-ant-your-key-here
npx tsx scripts/generate-questions.ts --grade 3 --subject math --topic "fractions"
```

Expected output:
```
Generating: Grade 3 math — fractions (3.2)...
  ✓ 6 questions → supabase/seed/generated/grade3-math-fractions.json
```

- [ ] **Step 3: Review the output file**

Open `supabase/seed/generated/grade3-math-fractions.json` and verify:
- 6 questions present
- Each has both `question_text` and `simplified_text`
- Difficulty distribution: 2–3 easy, 2 medium, 1–2 hard
- Each has exactly 4 choices with exactly 1 correct

- [ ] **Step 4: Commit**

```bash
git add scripts/generate-questions.ts
git commit -m "feat: add Claude-powered question generation script"
```

---

## Task 7: Update queries.ts — getQuestionsForSession with difficulty tiers

**Files:**
- Modify: `lib/supabase/queries.ts` (lines 13–37)
- Create: `lib/supabase/queries.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/supabase/queries.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getQuestionsForSession } from './queries'

// Helper to create a fake question
const fakeQ = (id: string, difficulty: 1|2|3, simplified_text: string|null = 'simplified') => ({
  id, difficulty, simplified_text, grade: 3, subject: 'math',
})

function makeSupabase(questions: ReturnType<typeof fakeQ>[]) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: questions, error: null }),
  }
  return { from: vi.fn().mockReturnValue(chain), _chain: chain }
}

describe('getQuestionsForSession', () => {
  it('returns count questions distributed across difficulty tiers', async () => {
    const pool = [
      ...Array.from({ length: 10 }, (_, i) => fakeQ(`e${i}`, 1)),
      ...Array.from({ length: 10 }, (_, i) => fakeQ(`m${i}`, 2)),
      ...Array.from({ length: 10 }, (_, i) => fakeQ(`h${i}`, 3)),
    ]
    // Mock returns the whole pool for each difficulty tier query
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        limit: vi.fn().mockImplementation(() =>
          Promise.resolve({ data: pool.slice(0, 10), error: null })
        ),
      }),
    }
    const result = await getQuestionsForSession(supabase as any, 3, 'math', 10, [], 'simplified')
    expect(result).toHaveLength(10)
  })

  it('uses simplified_text preference when languageLevel is simplified', async () => {
    const withSimplified = [fakeQ('s1', 1, 'plain text'), fakeQ('s2', 1, 'also plain')]
    const withoutSimplified = [fakeQ('n1', 1, null)]

    let callCount = 0
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        limit: vi.fn().mockImplementation(() => {
          callCount++
          // First call (with simplified filter): return simplified questions
          // Even calls (difficulty 2, 3): return empty
          return Promise.resolve({ data: callCount === 1 ? withSimplified : [], error: null })
        }),
      }),
    }
    const result = await getQuestionsForSession(supabase as any, 3, 'math', 2, [], 'simplified')
    expect(result.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- lib/supabase/queries.test.ts
```

Expected: FAIL — tests fail because `getQuestionsForSession` doesn't accept `languageLevel` param

- [ ] **Step 3: Update `getQuestionsForSession` in `lib/supabase/queries.ts`**

Replace the existing `getQuestionsForSession` function (lines 13–37) with:

```ts
export async function getQuestionsForSession(
  supabase: SupabaseClient,
  grade: number,
  subject: string,
  count: number,
  excludeQuestionIds: string[] = [],
  languageLevel: 'simplified' | 'standard' = 'simplified'
) {
  const easyTarget   = Math.round(count * 0.4)
  const mediumTarget = Math.round(count * 0.4)
  const hardTarget   = count - easyTarget - mediumTarget

  async function fetchTier(difficulty: number, target: number): Promise<Record<string, unknown>[]> {
    const buildQuery = (withSimplifiedFilter: boolean) => {
      let q = supabase
        .from('questions')
        .select('*')
        .eq('grade', grade)
        .eq('subject', subject)
        .eq('difficulty', difficulty)
      if (excludeQuestionIds.length > 0) {
        q = q.not('id', 'in', `(${excludeQuestionIds.join(',')})`)
      }
      if (withSimplifiedFilter) {
        q = q.not('simplified_text', 'is', null)
      }
      return q.limit(target * 3)
    }

    // When serving simplified, prefer questions that have simplified_text populated
    if (languageLevel === 'simplified') {
      const { data } = await buildQuery(true)
      if ((data ?? []).length >= target) {
        return (data ?? []).sort(() => Math.random() - 0.5).slice(0, target)
      }
    }

    // Fallback: no simplified_text filter
    const { data, error } = await buildQuery(false)
    if (error) throw error
    return (data ?? []).sort(() => Math.random() - 0.5).slice(0, target)
  }

  const easy   = await fetchTier(1, easyTarget)
  let   medium = await fetchTier(2, mediumTarget)
  const hard   = await fetchTier(3, hardTarget)

  // Fill deficit from medium tier if hard tier is short
  const deficit = count - (easy.length + medium.length + hard.length)
  if (deficit > 0) {
    const extra = await fetchTier(2, mediumTarget + deficit)
    medium = extra
  }

  const combined = [...easy, ...medium, ...hard].sort(() => Math.random() - 0.5)

  // Final safety: if still short (very small question pool), fall back to unrestricted
  if (combined.length < Math.min(count, 3)) {
    const { data, error } = await supabase
      .from('questions').select('*').eq('grade', grade).eq('subject', subject).limit(count * 3)
    if (error) throw error
    return (data ?? []).sort(() => Math.random() - 0.5).slice(0, count)
  }

  return combined.slice(0, count)
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- lib/supabase/queries.test.ts
```

Expected: PASS

- [ ] **Step 5: Run full test suite to check no regressions**

```bash
npm test
```

Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add lib/supabase/queries.ts lib/supabase/queries.test.ts
git commit -m "feat: add difficulty-tier distribution and language level filtering to getQuestionsForSession"
```

---

## Task 8: Add getChildTopicLevels to queries.ts

**Files:**
- Modify: `lib/supabase/queries.ts`
- Modify: `lib/supabase/queries.test.ts`

- [ ] **Step 1: Add failing test**

Append to `lib/supabase/queries.test.ts`:

```ts
import { getChildTopicLevels } from './queries'

describe('getChildTopicLevels', () => {
  it('returns a map of topic → language_level', async () => {
    const rows = [
      { topic: 'fractions', language_level: 'standard' },
      { topic: 'multiplication', language_level: 'simplified' },
    ]
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: undefined,
        // Supabase query resolves like a promise
        [Symbol.iterator]: undefined,
      }),
    }
    // Simpler: mock the whole chain to resolve with data
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    }
    ;(mockChain.eq as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: rows, error: null })
    const sb = { from: vi.fn().mockReturnValue(mockChain) } as any

    const result = await getChildTopicLevels(sb, 'child-1', 'math')
    expect(result).toEqual({ fractions: 'standard', multiplication: 'simplified' })
  })

  it('returns empty object when no records exist', async () => {
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValueOnce({ data: [], error: null }),
    }
    const sb = { from: vi.fn().mockReturnValue(mockChain) } as any
    const result = await getChildTopicLevels(sb, 'child-1', 'math')
    expect(result).toEqual({})
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- lib/supabase/queries.test.ts
```

Expected: FAIL — `getChildTopicLevels is not exported`

- [ ] **Step 3: Add function to `lib/supabase/queries.ts`**

Append to the end of the file:

```ts
export async function getChildTopicLevels(
  supabase: SupabaseClient,
  childId: string,
  subject: string
): Promise<Record<string, 'simplified' | 'standard'>> {
  const { data } = await supabase
    .from('child_topic_levels')
    .select('topic, language_level')
    .eq('child_id', childId)
    .eq('subject', subject)
  if (!data || data.length === 0) return {}
  return Object.fromEntries(data.map((row: { topic: string; language_level: string }) => [row.topic, row.language_level])) as Record<string, 'simplified' | 'standard'>
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- lib/supabase/queries.test.ts
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/queries.ts lib/supabase/queries.test.ts
git commit -m "feat: add getChildTopicLevels query"
```

---

## Task 9: Add bumpTopicLevelIfEarned to queries.ts

**Files:**
- Modify: `lib/supabase/queries.ts`
- Modify: `lib/supabase/queries.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `lib/supabase/queries.test.ts`:

```ts
import { bumpTopicLevelIfEarned } from './queries'

describe('bumpTopicLevelIfEarned', () => {
  function makeUpsertSb(existingRows: Record<string, unknown>[]) {
    const upserted: unknown[] = []
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockImplementation((data) => { upserted.push(data); return Promise.resolve({ error: null }) }),
    }
    // first call returns existing row, subsequent calls for upsert
    mockChain.eq.mockResolvedValueOnce({ data: existingRows, error: null })
    return { sb: { from: vi.fn().mockReturnValue(mockChain) } as any, upserted }
  }

  it('promotes topic to standard after 2 sessions at 80%+ accuracy', async () => {
    const { sb, upserted } = makeUpsertSb([
      { topic: 'fractions', language_level: 'simplified', sessions_at_level: 1 },
    ])
    // Patch from() to return existing data for SELECT then accept upsert
    const selectChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    }
    ;(selectChain.eq as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: [{ topic: 'fractions', language_level: 'simplified', sessions_at_level: 1 }], error: null,
    })
    const upsertChain = { upsert: vi.fn().mockResolvedValue({ error: null }) }
    const calls = [selectChain, upsertChain]
    let callIdx = 0
    const mockSb = { from: vi.fn().mockImplementation(() => calls[callIdx++] ?? upsertChain) } as any

    await bumpTopicLevelIfEarned(mockSb, 'child-1', 'math', {
      fractions: { correct: 9, total: 10 }, // 90% accuracy
    })
    expect(upsertChain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ language_level: 'standard', sessions_at_level: 0 }),
      expect.any(Object)
    )
  })

  it('demotes topic to simplified when accuracy drops below 50% at standard', async () => {
    const selectChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    }
    ;(selectChain.eq as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: [{ topic: 'fractions', language_level: 'standard', sessions_at_level: 0 }], error: null,
    })
    const upsertChain = { upsert: vi.fn().mockResolvedValue({ error: null }) }
    let callIdx = 0
    const calls = [selectChain, upsertChain]
    const mockSb = { from: vi.fn().mockImplementation(() => calls[callIdx++] ?? upsertChain) } as any

    await bumpTopicLevelIfEarned(mockSb, 'child-1', 'math', {
      fractions: { correct: 3, total: 10 }, // 30% accuracy
    })
    expect(upsertChain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ language_level: 'simplified', sessions_at_level: 0 }),
      expect.any(Object)
    )
  })

  it('does nothing when accuracy is between 50% and 80%', async () => {
    const selectChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    }
    ;(selectChain.eq as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: [{ topic: 'fractions', language_level: 'simplified', sessions_at_level: 0 }], error: null,
    })
    const upsertChain = { upsert: vi.fn().mockResolvedValue({ error: null }) }
    let callIdx = 0
    const calls = [selectChain, upsertChain]
    const mockSb = { from: vi.fn().mockImplementation(() => calls[callIdx++] ?? upsertChain) } as any

    await bumpTopicLevelIfEarned(mockSb, 'child-1', 'math', {
      fractions: { correct: 6, total: 10 }, // 60% — no change
    })
    expect(upsertChain.upsert).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- lib/supabase/queries.test.ts
```

Expected: FAIL

- [ ] **Step 3: Add function to `lib/supabase/queries.ts`**

Append to end of file:

```ts
export async function bumpTopicLevelIfEarned(
  supabase: SupabaseClient,
  childId: string,
  subject: string,
  topicAccuracy: Record<string, { correct: number; total: number }>
): Promise<void> {
  // Fetch existing levels in one query
  const { data: existing } = await supabase
    .from('child_topic_levels')
    .select('topic, language_level, sessions_at_level')
    .eq('child_id', childId)
    .eq('subject', subject)

  const levelMap: Record<string, { language_level: 'simplified' | 'standard'; sessions_at_level: number }> =
    Object.fromEntries(
      (existing ?? []).map((r: { topic: string; language_level: string; sessions_at_level: number }) => [
        r.topic,
        { language_level: r.language_level as 'simplified' | 'standard', sessions_at_level: r.sessions_at_level },
      ])
    )

  for (const [topic, { correct, total }] of Object.entries(topicAccuracy)) {
    if (total === 0) continue
    const accuracy = correct / total
    const current = levelMap[topic] ?? { language_level: 'simplified' as const, sessions_at_level: 0 }
    const now = new Date().toISOString()

    if (accuracy >= 0.8) {
      const newSessionsAtLevel = current.sessions_at_level + 1
      if (newSessionsAtLevel >= 2 && current.language_level === 'simplified') {
        // Promote to standard
        await supabase.from('child_topic_levels').upsert(
          { child_id: childId, subject, topic, language_level: 'standard', sessions_at_level: 0, updated_at: now },
          { onConflict: 'child_id,subject,topic' }
        )
      } else {
        // Increment sessions_at_level
        await supabase.from('child_topic_levels').upsert(
          { child_id: childId, subject, topic, language_level: current.language_level, sessions_at_level: newSessionsAtLevel, updated_at: now },
          { onConflict: 'child_id,subject,topic' }
        )
      }
    } else if (accuracy < 0.5 && current.language_level === 'standard') {
      // Demote to simplified
      await supabase.from('child_topic_levels').upsert(
        { child_id: childId, subject, topic, language_level: 'simplified', sessions_at_level: 0, updated_at: now },
        { onConflict: 'child_id,subject,topic' }
      )
    }
    // 50–79%: no change
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- lib/supabase/queries.test.ts
```

Expected: all tests PASS

- [ ] **Step 5: Run full suite**

```bash
npm test
```

Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add lib/supabase/queries.ts lib/supabase/queries.test.ts
git commit -m "feat: add bumpTopicLevelIfEarned for progressive language level progression"
```

---

## Task 10: Update questions API route — language level

**Files:**
- Modify: `app/api/questions/route.ts`

- [ ] **Step 1: Update the route**

Replace the full contents of `app/api/questions/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getQuestionsForSession, getRecentSessionQuestionIds, getChildTopicLevels } from '@/lib/supabase/queries'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const grade = parseInt(searchParams.get('grade') ?? '3')
  const subject = searchParams.get('subject') ?? 'math'
  const childId = searchParams.get('childId') ?? ''
  const mode = searchParams.get('mode') ?? 'practice'
  const count = mode === 'test' ? 20 : 10

  const supabase = await createClient()
  const recentIds = childId ? await getRecentSessionQuestionIds(supabase, childId) : []

  // Derive the child's current dominant language level
  let languageLevel: 'simplified' | 'standard' = 'simplified'
  if (childId) {
    const topicLevels = await getChildTopicLevels(supabase, childId, subject)
    const levels = Object.values(topicLevels)
    const standardCount = levels.filter((l) => l === 'standard').length
    // Majority at standard → serve standard; ties and new children default to simplified
    if (levels.length > 0 && standardCount > levels.length / 2) {
      languageLevel = 'standard'
    }
  }

  const questions = await getQuestionsForSession(supabase, grade, subject, count, recentIds, languageLevel)

  return NextResponse.json(questions)
}
```

- [ ] **Step 2: Run full test suite**

```bash
npm test
```

Expected: all tests pass (no existing tests for this route call the new params)

- [ ] **Step 3: Commit**

```bash
git add app/api/questions/route.ts
git commit -m "feat: pass child language level to question picker"
```

---

## Task 11: Update sessions PATCH — bump topic levels after completion

**Files:**
- Modify: `app/api/sessions/[sessionId]/route.ts`

- [ ] **Step 1: Replace full contents of the PATCH handler**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { bumpTopicLevelIfEarned } from '@/lib/supabase/queries'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch session metadata (child_id + subject needed for topic level update)
  const { data: session } = await supabase
    .from('practice_sessions')
    .select('child_id, subject')
    .eq('id', sessionId)
    .single()

  // Fetch answers with question_id for scoring and topic accuracy
  const { data: answers } = await supabase
    .from('session_answers')
    .select('is_correct, attempt_number, question_id')
    .eq('session_id', sessionId)

  const answersArr = answers ?? []
  const correct = answersArr.filter((a) => a.is_correct).length
  const scorePercent = answersArr.length > 0
    ? Math.round((correct / answersArr.length) * 100)
    : 0

  // Update session status
  const { error } = await supabase
    .from('practice_sessions')
    .update({ status: 'completed', ended_at: new Date().toISOString(), score_percent: scorePercent })
    .eq('id', sessionId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Bump topic levels if session metadata is available
  if (session && answersArr.length > 0) {
    const questionIds = [...new Set(answersArr.map((a) => a.question_id).filter(Boolean))]
    if (questionIds.length > 0) {
      const { data: questions } = await supabase
        .from('questions')
        .select('id, topic')
        .in('id', questionIds)

      if (questions && questions.length > 0) {
        const topicMap: Record<string, string> = Object.fromEntries(
          questions.map((q: { id: string; topic: string }) => [q.id, q.topic])
        )
        const topicAccuracy: Record<string, { correct: number; total: number }> = {}
        for (const a of answersArr) {
          const topic = topicMap[a.question_id]
          if (!topic) continue
          if (!topicAccuracy[topic]) topicAccuracy[topic] = { correct: 0, total: 0 }
          topicAccuracy[topic].total++
          if (a.is_correct) topicAccuracy[topic].correct++
        }
        await bumpTopicLevelIfEarned(supabase, session.child_id, session.subject, topicAccuracy)
      }
    }
  }

  return NextResponse.json({ scorePercent })
}
```

- [ ] **Step 2: Run full test suite**

```bash
npm test
```

Expected: all tests pass

- [ ] **Step 3: Commit**

```bash
git add app/api/sessions/[sessionId]/route.ts
git commit -m "feat: bump child topic levels on session completion"
```

---

## Task 12: Fix TTS text in practice-session.tsx

**Files:**
- Modify: `app/(practice)/practice/[childId]/practice-session.tsx` (AccommodationToolbar prop)

- [ ] **Step 1: Find the AccommodationToolbar usage**

In `practice-session.tsx`, locate the `<AccommodationToolbar` JSX block (around line 268–276). It currently has:
```tsx
questionText={q.question_text}
```

- [ ] **Step 2: Update the prop**

Change only that one prop:
```tsx
questionText={
  (accommodations.simplified_language && q.simplified_text)
    ? q.simplified_text
    : q.question_text
}
```

`QuestionCard` already handles this correctly via its `simplified` prop — no change needed there.

- [ ] **Step 3: Run full test suite**

```bash
npm test
```

Expected: all tests pass

- [ ] **Step 4: Commit**

```bash
git add app/\(practice\)/practice/\[childId\]/practice-session.tsx
git commit -m "fix: TTS reads simplified_text when simplified language accommodation is active"
```

---

## Task 13: Generate questions — Grade 3

Requires: `ANTHROPIC_API_KEY` set in environment.

- [ ] **Step 1: Generate Grade 3 Math (all topics)**

```bash
export ANTHROPIC_API_KEY=sk-ant-your-key-here
npm run generate:questions -- --grade 3 --subject math
```

Expected: 9 files created in `supabase/seed/generated/`, each with 6 questions (~54 total).

- [ ] **Step 2: Generate Grade 3 Reading (all topics)**

```bash
npm run generate:questions -- --grade 3 --subject reading
```

Expected: 6 files created (~36 total).

- [ ] **Step 3: Review all Grade 3 generated files**

For each file in `supabase/seed/generated/grade3-*`:
- Confirm `question_text` is standard SOL phrasing
- Confirm `simplified_text` is shorter, plain language
- Confirm difficulty spread (not all the same difficulty)
- Confirm exactly 4 choices, 1 correct per question

- [ ] **Step 4: Consolidate**

```bash
npm run consolidate:questions
```

Expected output:
```
Consolidated ~90 questions (46 existing + ~54 new − duplicates):
  Grade 3 math: ~24
  Grade 3 reading: ~12
  ... (existing grades 4 and 5 unchanged)
```

- [ ] **Step 5: Seed to local database**

```bash
npm run db:seed
```

Expected: `Seed complete.`

- [ ] **Step 6: Verify in Supabase Studio**

Open `http://127.0.0.1:54323` → Table Editor → questions → filter by grade=3.
Confirm new questions appear with `simplified_text` populated and `source = 'ai_generated'`.

- [ ] **Step 7: Commit consolidated questions**

```bash
git add supabase/seed/questions.json
git commit -m "feat: add Grade 3 VA SOL questions (math + reading, simplified + standard)"
```

---

## Task 14: Generate questions — Grades 4 & 5

- [ ] **Step 1: Generate Grade 4**

```bash
npm run generate:questions -- --grade 4 --subject math
npm run generate:questions -- --grade 4 --subject reading
```

- [ ] **Step 2: Generate Grade 5**

```bash
npm run generate:questions -- --grade 5 --subject math
npm run generate:questions -- --grade 5 --subject reading
```

- [ ] **Step 3: Review all Grade 4 and 5 generated files**

Same review criteria as Task 13 Step 3.

- [ ] **Step 4: Consolidate and seed**

```bash
npm run consolidate:questions
npm run db:seed
```

Expected final count: ~300 questions total.

- [ ] **Step 5: Run full test suite one final time**

```bash
npm test
```

Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add supabase/seed/questions.json
git commit -m "feat: add Grades 4 & 5 VA SOL questions — 300 total questions seeded"
```

---

## Verify End-to-End

After all tasks complete:

1. Start the dev server: `npm run dev`
2. Log in, start a practice session for a Grade 3 child
3. Confirm questions appear and have more variety than before
4. Enable "Simplified Language" accommodation in child settings
5. Confirm the TTS reads a shorter/simpler version of the question text
6. Complete a session — check Supabase Studio → `child_topic_levels` table has rows for the child
7. Seed production database: `ENV_FILE=.env.prod npm run db:seed`
