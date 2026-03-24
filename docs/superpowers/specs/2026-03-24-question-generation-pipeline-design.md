# Question Generation Pipeline Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an offline AI-powered question generation pipeline that produces 300 VA SOL-aligned questions (50 per grade/subject for grades 3–5), each with standard and simplified text variants, reviewed via git diff before seeding to the database.

**Architecture:** Per-topic generation script calls Claude API → writes reviewed JSON files → consolidation script merges → existing seed script loads to DB. Progressive language-level tracking added to DB and session logic.

**Tech Stack:** TypeScript, Anthropic SDK (`@anthropic-ai/sdk`), tsx, existing Supabase/Next.js stack.

---

## VA SOL Curriculum Framework — Grades 3–5

> Source: Virginia Department of Education Standards of Learning (doe.virginia.gov).
> Standard codes reference the 2016 Mathematics SOL and 2017 English/Reading SOL frameworks.
> Verify current codes at https://www.doe.virginia.gov/teaching-learning-assessment/k-12-standards-instructional-support

### Grade 3 — Mathematics

| SOL Standard | Strand | Topic |
|---|---|---|
| 3.1 | Number & Number Sense | Read, write, and identify place value of six-digit whole numbers |
| 3.2 | Number & Number Sense | Name, write, and model fractions and mixed numbers; compare and order fractions |
| 3.3 | Computation & Estimation | Addition and subtraction of whole numbers up to 9,999; estimate sums/differences |
| 3.4 | Computation & Estimation | Represent multiplication as repeated addition; create/solve multiplication problems (facts 0–10) |
| 3.5 | Computation & Estimation | Represent division as equal sharing and repeated subtraction; create/solve division problems |
| 3.6 | Computation & Estimation | Add and subtract proper fractions with like denominators |
| 3.7 | Measurement | Measure length (inches, feet, yards, centimeters, meters); determine perimeter |
| 3.8 | Measurement | Determine area of rectangles using square units |
| 3.9 | Measurement | Tell time to nearest minute; elapsed time in one-hour increments |
| 3.10 | Measurement | Count and make change with coins and bills up to $5.00 |
| 3.11 | Measurement | Read temperature to nearest degree (Celsius and Fahrenheit) |
| 3.12 | Geometry | Identify and describe plane figures (polygon, circle); congruence and symmetry |
| 3.13 | Geometry | Identify 3D figures (cube, rectangular prism, cone, cylinder, pyramid, sphere) |
| 3.14 | Probability & Statistics | Collect, organize, and display data using picture graphs, bar graphs, and line plots |
| 3.15 | Probability & Statistics | Interpret data from graphs; identify mode and range |
| 3.16 | Patterns, Functions & Algebra | Identify, describe, create, and extend patterns (numerical and geometric) |
| 3.17 | Patterns, Functions & Algebra | Investigate identity and commutative properties of addition and multiplication |

### Grade 3 — Reading / Language Arts

| SOL Standard | Strand | Topic |
|---|---|---|
| 3.1 | Oral Language | Listen actively and speak using standard English grammar |
| 3.2 | Reading — Word Study | Use phonics, word analysis, and context to decode multi-syllabic words |
| 3.3 | Reading — Word Study | Read and spell grade-appropriate words; use prefixes, suffixes, roots |
| 3.4 | Reading — Vocabulary | Determine meaning of unfamiliar words using context clues and reference materials |
| 3.5 | Reading — Fiction | Read and demonstrate comprehension of fiction: main idea, plot, character, setting, theme |
| 3.6 | Reading — Nonfiction | Read and demonstrate comprehension of nonfiction: main idea, supporting details, text features |
| 3.7 | Reading — Poetry | Identify rhythm, rhyme, and figurative language in poetry |
| 3.8 | Writing | Plan, draft, revise, and publish in various forms |
| 3.9 | Writing | Edit for grammar, capitalization, punctuation, and spelling |
| 3.10 | Research | Use reference materials to gather information and cite sources |

### Grade 4 — Mathematics

| SOL Standard | Strand | Topic |
|---|---|---|
| 4.1 | Number & Number Sense | Place value and rounding of whole numbers through millions; compare and order |
| 4.2 | Number & Number Sense | Compare and order fractions and mixed numbers; represent equivalent fractions |
| 4.3 | Number & Number Sense | Read, write, represent, and identify decimals through thousandths |
| 4.4 | Computation & Estimation | Multiply whole numbers (two digits × two digits); estimate products; divide by one-digit divisors |
| 4.5 | Computation & Estimation | Add and subtract fractions and mixed numbers with like denominators |
| 4.6 | Computation & Estimation | Add and subtract decimals through thousandths |
| 4.7 | Measurement | Measure and convert US customary units (length, weight, liquid volume) |
| 4.8 | Measurement | Measure and convert metric units (length, mass, liquid volume) |
| 4.9 | Measurement | Solve practical problems involving elapsed time; determine perimeter and area |
| 4.10 | Geometry | Identify and describe points, lines, line segments, rays, angles, and parallel/perpendicular lines |
| 4.11 | Geometry | Classify quadrilaterals and triangles; identify lines of symmetry |
| 4.12 | Geometry | Identify and describe plane and solid figures; relate 2D nets to 3D figures |
| 4.13 | Probability & Statistics | Collect, organize, display, and interpret data (bar graphs, line graphs, line plots) |
| 4.14 | Probability & Statistics | Predict the likelihood of outcomes; represent probability as a fraction |
| 4.15 | Patterns, Functions & Algebra | Identify, describe, and extend numerical and geometric patterns |
| 4.16 | Patterns, Functions & Algebra | Write and solve one-step equations using addition, subtraction, multiplication, or division |

### Grade 4 — Reading / Language Arts

| SOL Standard | Strand | Topic |
|---|---|---|
| 4.1 | Oral Language | Present information orally; listen and summarize speaker's message |
| 4.2 | Reading — Word Study | Use context and word analysis to decode multi-syllabic words; Latin and Greek roots |
| 4.3 | Reading — Word Study | Read and spell grade-appropriate words; use syllabication and morphemes |
| 4.4 | Reading — Vocabulary | Determine meaning of unfamiliar words; understand multiple-meaning words; figurative language |
| 4.5 | Reading — Fiction | Comprehend fiction: plot structure, conflict, character motivation, theme, point of view |
| 4.6 | Reading — Nonfiction | Comprehend nonfiction: main idea, fact vs. opinion, text structure, author's purpose |
| 4.7 | Reading — Poetry | Identify sensory language, metaphor, simile, and personification in poetry |
| 4.8 | Writing | Plan, draft, revise, and publish narrative, descriptive, and expository writing |
| 4.9 | Writing | Edit for capitalization, punctuation, spelling, and grammar in written work |
| 4.10 | Research | Use print and digital resources to locate, evaluate, and cite information |

### Grade 5 — Mathematics

| SOL Standard | Strand | Topic |
|---|---|---|
| 5.1 | Number & Number Sense | Read, write, and identify place value of decimals through thousandths; round decimals |
| 5.2 | Number & Number Sense | Represent and identify equivalences among fractions, mixed numbers, and decimals |
| 5.3 | Number & Number Sense | Identify and describe prime and composite numbers; identify even and odd |
| 5.4 | Number & Number Sense | Create and solve single-step and multi-step practical problems involving addition, subtraction, and multiplication of fractions and mixed numbers |
| 5.5 | Computation & Estimation | Multiply and divide fractions and mixed numbers; estimate products and quotients |
| 5.6 | Computation & Estimation | Solve single-step and multi-step problems with decimals (add, subtract, multiply, divide) |
| 5.7 | Computation & Estimation | Evaluate expressions using order of operations (parentheses, exponents, ×, ÷, +, −) |
| 5.8 | Measurement | Solve problems involving perimeter, area, and volume; convert units within a system |
| 5.9 | Patterns, Functions & Algebra | Investigate and identify perfect squares and their square roots; use patterns to solve problems |
| 5.10 | Geometry | Classify and measure angles; identify relationships between angle pairs |
| 5.11 | Geometry | Identify, classify, and describe triangles and quadrilaterals by their properties |
| 5.12 | Geometry | Identify and describe the diameter, radius, chord, and circumference of circles |
| 5.13 | Geometry | Identify 3D figures and their properties; describe volume and surface area |
| 5.14 | Probability & Statistics | Make predictions and determine probability of outcomes; represent as fractions, decimals, percents |
| 5.15 | Probability & Statistics | Collect, organize, and interpret data using stem-and-leaf plots and line graphs |
| 5.16 | Probability & Statistics | Find mean, median, mode, and range of a data set |
| 5.17 | Patterns, Functions & Algebra | Describe and write a variable expression for a pattern; solve for a missing variable |

### Grade 5 — Reading / Language Arts

| SOL Standard | Strand | Topic |
|---|---|---|
| 5.1 | Oral Language | Present and evaluate information orally using evidence and logical arguments |
| 5.2 | Reading — Word Study | Use context and word analysis (Greek/Latin roots, affixes) to determine word meaning |
| 5.3 | Reading — Word Study | Read and spell grade-appropriate words; use vocabulary strategies |
| 5.4 | Reading — Vocabulary | Determine connotation and denotation; understand figurative language and idioms |
| 5.5 | Reading — Fiction | Analyze fiction: theme, character development, conflict, narrator perspective, literary devices |
| 5.6 | Reading — Nonfiction | Analyze nonfiction: author's purpose, argument, evidence, text structure, bias |
| 5.7 | Reading — Poetry | Analyze figurative language, mood, tone, and structure in poetry |
| 5.8 | Writing | Plan, draft, revise, and publish persuasive, expository, and narrative writing |
| 5.9 | Writing | Edit for grammar, usage, mechanics, and spelling in written work |
| 5.10 | Research | Use print and digital resources to collect, evaluate, synthesize, and cite information |

---

## Question Schema

Each generated question must conform to the existing `questions` DB table. All fields required:

```ts
{
  grade: 3 | 4 | 5
  subject: 'math' | 'reading'
  topic: string                    // from sol-curriculum.ts topic name
  subtopic: string                 // specific concept within topic
  sol_standard: string             // e.g. "3.2", "4.5"
  difficulty: 1 | 2 | 3           // 1=easy, 2=medium, 3=hard
  question_text: string            // standard SOL-aligned phrasing
  simplified_text: string          // plain language variant (shorter sentences, concrete examples)
  answer_type: 'multiple_choice'   // all generated questions use multiple_choice
  choices: ChoiceOption[]          // exactly 4 choices, exactly 1 with is_correct: true
  hint_1: string                   // scaffolded — points toward the concept
  hint_2: string                   // scaffolded — narrows the approach
  hint_3: string                   // scaffolded — nearly gives the answer
  calculator_allowed: boolean      // true only for grade 5 multi-step computation
  source: 'ai_generated'
}
```

**`simplified_text` writing rules** (included in generation prompt):
- Max 1 sentence shorter than `question_text`
- No words above 3rd-grade reading level
- Use concrete nouns (apples, steps, boxes) over abstract (quantities, units, elements)
- Active voice only
- Numbers written as digits, not words

**Difficulty guidelines:**
- `1` (easy): single step, familiar context, no distractors that require deep reasoning
- `2` (medium): two steps or unfamiliar context, one plausible distractor
- `3` (hard): multi-step, abstract context, vocabulary from higher grade level, strong distractors

---

## File Structure

```
scripts/
  sol-curriculum.ts          ← SOL topics registry (grade → subject → topics[])
  generate-questions.ts      ← AI generation script
  consolidate-questions.ts   ← merge generated/*.json → questions.json

supabase/
  seed/
    questions.json           ← master seed file (committed)
    generated/               ← per-topic output (gitignored — NOT committed; review locally then consolidate)
      grade3-math-place-value-and-number-sense.json
      grade3-math-addition-and-subtraction.json
      ... (one file per topic)
  migrations/
    0007_child_topic_levels.sql

lib/supabase/
  queries.ts                 ← updated: difficulty distribution, language level filtering
```

---

## New DB Migration: `0007_child_topic_levels.sql`

```sql
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

-- updated_at: no trigger — application code must pass updated_at explicitly on every upsert.
-- In bumpTopicLevelIfEarned, include updated_at: new Date().toISOString() in the upsert payload.
```

---

## Code Changes

### 1. `lib/supabase/queries.ts`

**Update `getQuestionsForSession`:**

Signature change: add `languageLevel: 'simplified' | 'standard'` parameter (after `excludeQuestionIds`).

Implementation — run **three separate Supabase queries**, one per difficulty tier:
```ts
const easyTarget  = Math.round(count * 0.4)   // 40%
const mediumTarget = Math.round(count * 0.4)  // 40%
const hardTarget  = count - easyTarget - mediumTarget // 20%

// Each query: .eq('grade').eq('subject').eq('difficulty', N)
//             .not('id', 'in', excludeIds)  (if excludeIds.length > 0)
//             .limit(target * 3)  (fetch extra to allow shuffling)
// When languageLevel === 'simplified': add .not('simplified_text', 'is', null)
//   to each tier query FIRST; if that tier returns < target results,
//   re-run WITHOUT the simplified_text filter (graceful fallback)
```

After fetching each tier, shuffle and slice to target count. If a tier is still short after fallback, fill the deficit from the medium tier pool (never leave the session short). Merge all three tier results and return. The existing `excludeQuestionIds` fallback (retry without exclusion) remains in place around the entire operation.

**Add `getChildTopicLevels`:**
```ts
async function getChildTopicLevels(
  supabase: SupabaseClient,
  childId: string,
  subject: string
): Promise<Record<string, 'simplified' | 'standard'>>
// Returns { [topic]: 'simplified' | 'standard' }
// Returns {} (empty) if no records — caller defaults to 'simplified'
```

**Add `bumpTopicLevelIfEarned`:**
```ts
async function bumpTopicLevelIfEarned(
  supabase: SupabaseClient,
  childId: string,
  subject: string,
  topicAccuracy: Record<string, { correct: number; total: number }>
): Promise<void>
// For each topic in topicAccuracy:
//   1. Fetch existing row from child_topic_levels (or default to { language_level: 'simplified', sessions_at_level: 0 })
//   2. If accuracy >= 0.80:
//        - newSessionsAtLevel = existing.sessions_at_level + 1
//        - If newSessionsAtLevel >= 2 and language_level === 'simplified':
//            → upsert { language_level: 'standard', sessions_at_level: 0, updated_at: now() }
//          Else:
//            → upsert { sessions_at_level: newSessionsAtLevel, updated_at: now() }
//   3. If accuracy < 0.50 and language_level === 'standard':
//        → upsert { language_level: 'simplified', sessions_at_level: 0, updated_at: now() }
//   4. Otherwise (accuracy 0.50–0.79): no change
//
// Use fetch-then-upsert pattern (no atomic increment in Supabase client).
// Race conditions are acceptable here — sessions are single-user per child.
```

---

### 2. `app/api/questions/route.ts`

The existing route already reads `grade`, `subject`, `childId`, and `mode` from query params (`searchParams.get('subject')` etc.). After fetching `recentIds`, also:
1. Call `getChildTopicLevels(supabase, childId, subject)` — `subject` comes from `searchParams.get('subject')`
2. Derive dominant language level: if majority of topics are `'simplified'` (or no records exist), use `'simplified'`; otherwise `'standard'`
3. Pass derived language level to `getQuestionsForSession`

---

### 3. `app/api/sessions/[sessionId]/route.ts` (PATCH)

After computing `scorePercent`, also:

1. Fetch the session's `child_id` and `subject` (needed for topic-level update):
   ```ts
   const { data: session } = await supabase
     .from('practice_sessions')
     .select('child_id, subject')
     .eq('id', sessionId)
     .single()
   ```

2. Re-fetch answers joined with question topic. Use two Supabase queries (no raw SQL join needed):
   ```ts
   // Already have: answersArr from step above (has question_id via session_answers)
   // Fetch question topics for those question IDs:
   const questionIds = answersArr.map((a) => a.question_id)
   const { data: questions } = await supabase
     .from('questions')
     .select('id, topic')
     .in('id', questionIds)
   ```

3. Build `topicAccuracy` map by joining on `question_id`:
   ```ts
   // { [topic]: { correct: number, total: number } }
   ```

4. Call `bumpTopicLevelIfEarned(supabase, session.child_id, session.subject, topicAccuracy)`

Note: the existing PATCH handler fetches `session_answers` with `select('is_correct, attempt_number')`. Extend the select to include `question_id`: `select('is_correct, attempt_number, question_id')`.

---

### 4. `app/(practice)/practice/[childId]/practice-session.tsx`

**Context:** `QuestionCard` already handles `simplified_text` correctly — it receives a `simplified` boolean prop and internally swaps the text (no change needed there). The gap is that `AccommodationToolbar` receives `questionText={q.question_text}` and therefore always reads the standard text aloud via TTS even when the simplified accommodation is active.

**Fix — `AccommodationToolbar`'s `questionText` prop only:**
```ts
// Before (AccommodationToolbar prop):
questionText={q.question_text}

// After:
questionText={
  (accommodations.simplified_language && q.simplified_text)
    ? q.simplified_text
    : q.question_text
}
```

No change to `QuestionCard` or any other prop.

---

## Generation Workflow (Step-by-Step)

```bash
# 1. Set Anthropic API key
export ANTHROPIC_API_KEY=sk-ant-...

# 2. Generate one topic (validate output before running all)
npx tsx scripts/generate-questions.ts --grade 3 --subject math --topic "fractions"

# 3. Review the output file
# supabase/seed/generated/grade3-math-fractions.json

# 4. Generate all questions (run in phases: grade 3 first)
npx tsx scripts/generate-questions.ts --grade 3 --subject math
npx tsx scripts/generate-questions.ts --grade 3 --subject reading
# ... repeat for grades 4 and 5

# 5. After reviewing all generated files:
npx tsx scripts/consolidate-questions.ts

# 6. Seed to database
npm run db:seed

# 7. Commit the consolidated questions.json
git add supabase/seed/questions.json
git commit -m "feat: add 300 VA SOL-aligned questions (grades 3-5)"
```

---

## Progression Logic Summary

| Condition | Action |
|---|---|
| New child, no topic level record | Default to `simplified`, `sessions_at_level = 0` |
| Topic accuracy ≥ 80% this session | `sessions_at_level + 1` |
| `sessions_at_level + 1 >= 2` at `simplified` | Promote to `standard`, **reset `sessions_at_level = 0`** |
| Topic accuracy < 50% at `standard` | Demote to `simplified`, reset `sessions_at_level = 0` |
| Topic accuracy 50–79% | No change |
| No `simplified_text` exists for a question | Serve `question_text` at both levels (graceful fallback) |

---

## Backlog (Out of Scope for This Plan)

- **Admin page** (`/admin/generate`) — trigger generation, preview, approve/reject per question in browser UI
- **Parent difficulty control** — setting to cap difficulty level per child per subject
- **VDOE released items scraper** — parse actual released SOL test PDFs as a premium question source
