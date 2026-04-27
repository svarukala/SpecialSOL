# Admin Question Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an admin section that lets authorised users trigger AI question generation, review/approve/reject generated questions, and browse/edit published questions — all in-browser, writing directly to the live DB.

**Architecture:** Two DB migrations add the `is_admin` flag and `questions_pending` staging table. A third migration adds a Postgres RPC function for atomic question approval. Shared library files extract generation logic and the admin auth helper from `scripts/`. Seven API routes (all behind `assertAdmin`) handle generation, review, and CRUD on published questions. Two Client Components own the interactive UI under a new `(admin)` route group that enforces access at the layout level.

**Tech Stack:** Next.js 16 App Router (Server + Client Components), Supabase (user JWT client + service-role client), Anthropic SDK (`claude-opus-4-6`), Vitest + `vi.mock` for tests.

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Create | `supabase/migrations/0010_admin_flag.sql` | Add `is_admin` to `parents` |
| Create | `supabase/migrations/0011_questions_pending.sql` | Staging table + RLS |
| Create | `supabase/migrations/0012_approve_question_fn.sql` | Atomic approve RPC function |
| Create | `lib/curriculum/sol-curriculum.ts` | Curriculum data moved from `scripts/` |
| Create | `lib/generation/question-schema.ts` | Question types/validation moved from `scripts/` |
| Create | `lib/generation/question-schema.test.ts` | Tests for question schema (moved) |
| Modify | `scripts/generate-questions.ts` | Update imports to use `lib/` |
| Modify | `scripts/consolidate-questions.ts` | Update imports to use `lib/` |
| Modify | `scripts/question-schema.test.ts` | Redirect stub (tests moved to lib/) |
| Create | `lib/generation/generate-topic.ts` | Pure generation function |
| Create | `lib/generation/generate-topic.test.ts` | Unit tests for generation |
| Create | `lib/admin/assert-admin.ts` | Shared admin auth helper |
| Create | `app/api/admin/auth-guard.test.ts` | All routes return 403 for non-admin |
| Create | `app/api/admin/generate/route.ts` | POST — trigger generation |
| Create | `app/api/admin/generate/route.test.ts` | Tests |
| Create | `app/api/admin/pending/route.ts` | GET — list pending |
| Create | `app/api/admin/pending/route.test.ts` | Tests |
| Create | `app/api/admin/pending/[id]/route.ts` | PATCH — edit pending question |
| Create | `app/api/admin/pending/[id]/route.test.ts` | Tests |
| Create | `app/api/admin/pending/[id]/approve/route.ts` | POST — approve |
| Create | `app/api/admin/pending/[id]/approve/route.test.ts` | Tests |
| Create | `app/api/admin/pending/[id]/reject/route.ts` | POST — reject |
| Create | `app/api/admin/pending/[id]/reject/route.test.ts` | Tests |
| Create | `app/api/admin/pending/[id]/restore/route.ts` | POST — restore rejected → pending |
| Create | `app/api/admin/pending/[id]/restore/route.test.ts` | Tests |
| Create | `app/api/admin/questions/route.ts` | GET — list published |
| Create | `app/api/admin/questions/route.test.ts` | Tests |
| Create | `app/api/admin/questions/[id]/route.ts` | PATCH — edit published |
| Create | `app/api/admin/questions/[id]/route.test.ts` | Tests |
| Create | `app/(admin)/layout.tsx` | Admin route group, is_admin guard |
| Create | `app/(admin)/admin/generate/page.tsx` | Generate & Review shell |
| Create | `app/(admin)/admin/questions/page.tsx` | Published Questions shell |
| Create | `components/admin/generate-review-client.tsx` | Interactive Generate & Review UI |
| Create | `components/admin/published-questions-client.tsx` | Interactive Published Questions UI |
| Modify | `app/(parent)/layout.tsx` | Conditional Admin nav link |

---

### Task 1: DB Migrations

**Files:**
- Create: `supabase/migrations/0010_admin_flag.sql`
- Create: `supabase/migrations/0011_questions_pending.sql`
- Create: `supabase/migrations/0012_approve_question_fn.sql`

- [ ] **Step 1: Create 0010_admin_flag.sql**

```sql
ALTER TABLE parents ADD COLUMN is_admin boolean NOT NULL DEFAULT false;
```

- [ ] **Step 2: Create 0011_questions_pending.sql**

```sql
CREATE TABLE questions_pending (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade integer NOT NULL,
  subject text NOT NULL,
  topic text NOT NULL,
  subtopic text NOT NULL,
  sol_standard text NOT NULL,
  difficulty integer NOT NULL CHECK (difficulty IN (1, 2, 3)),
  question_text text NOT NULL,
  simplified_text text NOT NULL,
  answer_type text NOT NULL DEFAULT 'multiple_choice'
    CHECK (answer_type IN (
      'multiple_choice', 'true_false', 'multiple_select',
      'short_answer', 'ordering', 'matching', 'fill_in_blank'
    )),
  choices jsonb NOT NULL,
  hint_1 text NOT NULL,
  hint_2 text NOT NULL,
  hint_3 text NOT NULL,
  calculator_allowed boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'ai_generated'
    CHECK (source IN ('doe_released', 'ai_generated')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  generated_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES parents(id)
);

ALTER TABLE questions_pending
  ADD CONSTRAINT review_columns_consistent
    CHECK (
      (reviewed_at IS NULL AND reviewed_by IS NULL) OR
      (reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL)
    );

ALTER TABLE questions_pending ENABLE ROW LEVEL SECURITY;

-- Admin-only access via the is_admin column on parents
CREATE POLICY "admin_only" ON questions_pending
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM parents WHERE id = auth.uid() AND is_admin = true
    )
  );
```

- [ ] **Step 3: Create 0012_approve_question_fn.sql**

This function atomically inserts a pending question into `questions` and marks it approved — both writes in a single transaction. `SECURITY DEFINER` lets it bypass RLS so it can insert into `questions` (which has no user-write policy).

```sql
CREATE OR REPLACE FUNCTION approve_pending_question(
  p_pending_id uuid,
  p_admin_id uuid
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_question_id uuid;
  v_pending questions_pending%ROWTYPE;
BEGIN
  SELECT * INTO v_pending
  FROM questions_pending WHERE id = p_pending_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  IF v_pending.status != 'pending' THEN
    RAISE EXCEPTION 'not_pending';
  END IF;

  IF EXISTS (
    SELECT 1 FROM questions
    WHERE sol_standard = v_pending.sol_standard
      AND question_text = v_pending.question_text
  ) THEN
    RAISE EXCEPTION 'already_published';
  END IF;

  INSERT INTO questions (
    grade, subject, topic, subtopic, sol_standard, difficulty,
    question_text, simplified_text, answer_type, choices,
    hint_1, hint_2, hint_3, calculator_allowed, source
  ) VALUES (
    v_pending.grade, v_pending.subject, v_pending.topic, v_pending.subtopic,
    v_pending.sol_standard, v_pending.difficulty, v_pending.question_text,
    v_pending.simplified_text, v_pending.answer_type, v_pending.choices,
    v_pending.hint_1, v_pending.hint_2, v_pending.hint_3,
    v_pending.calculator_allowed, v_pending.source
  ) RETURNING id INTO v_question_id;

  UPDATE questions_pending SET
    status = 'approved',
    reviewed_at = now(),
    reviewed_by = p_admin_id
  WHERE id = p_pending_id;

  RETURN v_question_id;
END;
$$;
```

- [ ] **Step 4: Apply migrations locally**

```bash
npx supabase db reset
```

Expected: "Finished supabase db reset." with no errors.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0010_admin_flag.sql supabase/migrations/0011_questions_pending.sql supabase/migrations/0012_approve_question_fn.sql
git commit -m "feat: add is_admin flag, questions_pending table, and approve RPC"
```

---

### Task 2: Move curriculum and schema files to lib/

**Why:** `lib/` is shared with the Next.js app; `scripts/` is CLI-only. Both `sol-curriculum.ts` and `question-schema.ts` need to be importable from API routes, so they move to `lib/`.

**Files:**
- Create: `lib/curriculum/sol-curriculum.ts`
- Create: `lib/generation/question-schema.ts`
- Create: `lib/generation/question-schema.test.ts`
- Modify: `scripts/generate-questions.ts`
- Modify: `scripts/consolidate-questions.ts`
- Modify: `scripts/question-schema.test.ts`

- [ ] **Step 1: Create lib/curriculum/sol-curriculum.ts**

Copy the full content of `scripts/sol-curriculum.ts` to `lib/curriculum/sol-curriculum.ts`. Change only the first-line comment to `// lib/curriculum/sol-curriculum.ts`. The rest of the file is identical.

- [ ] **Step 2: Create lib/generation/question-schema.ts**

Copy the full content of `scripts/question-schema.ts` to `lib/generation/question-schema.ts`. Change only the first-line comment to `// lib/generation/question-schema.ts`.

- [ ] **Step 3: Create lib/generation/question-schema.test.ts**

Copy `scripts/question-schema.test.ts` to `lib/generation/question-schema.test.ts`. Change the import:

```typescript
// Change:
import { validateQuestion, validateQuestionBatch, ValidationError } from './question-schema'
// (path stays the same since test is co-located with the moved schema)
```

The import doesn't actually need to change since the test is co-located with the file — but update the first-line path comment.

- [ ] **Step 4: Run the moved tests**

```bash
npx vitest run lib/generation/question-schema.test.ts
```

Expected: All tests pass (identical to original).

- [ ] **Step 5: Update scripts/generate-questions.ts imports**

```typescript
// Change:
import { getTopicsForGradeSubject, type SolTopic } from './sol-curriculum'
import { validateQuestionBatch } from './question-schema'

// To:
import { getTopicsForGradeSubject, type SolTopic } from '@/lib/curriculum/sol-curriculum'
import { validateQuestionBatch } from '@/lib/generation/question-schema'
```

- [ ] **Step 6: Update scripts/consolidate-questions.ts imports**

```typescript
// Change:
import { validateQuestionBatch, type GeneratedQuestion } from './question-schema'

// To:
import { validateQuestionBatch, type GeneratedQuestion } from '@/lib/generation/question-schema'
```

- [ ] **Step 7: Replace scripts/question-schema.test.ts with a redirect stub**

```typescript
// scripts/question-schema.test.ts
// Tests moved to lib/generation/question-schema.test.ts
import { describe, it } from 'vitest'
describe('question-schema (redirect)', () => {
  it('see lib/generation/question-schema.test.ts', () => {})
})
```

- [ ] **Step 8: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 9: Commit**

```bash
git add lib/curriculum/sol-curriculum.ts lib/generation/question-schema.ts lib/generation/question-schema.test.ts scripts/generate-questions.ts scripts/consolidate-questions.ts scripts/question-schema.test.ts
git commit -m "refactor: move curriculum and question schema to lib/ for API route access"
```

---

### Task 3: lib/generation/generate-topic.ts + tests

**Files:**
- Create: `lib/generation/generate-topic.test.ts`
- Create: `lib/generation/generate-topic.ts`
- Modify: `scripts/generate-questions.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/generation/generate-topic.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { generateTopic } from './generate-topic'
import type { SolTopic } from '@/lib/curriculum/sol-curriculum'

const mockTopic: SolTopic = {
  name: 'fractions',
  solStandard: '3.2',
  description: 'Name, write, and model fractions',
}

const mockQuestion = {
  grade: 3, subject: 'math', topic: 'fractions', subtopic: 'identifying fractions',
  sol_standard: '3.2', difficulty: 1,
  question_text: 'What fraction?', simplified_text: 'What fraction?',
  answer_type: 'multiple_choice',
  choices: [
    { id: 'a', text: '1/4', is_correct: true },
    { id: 'b', text: '1/3', is_correct: false },
    { id: 'c', text: '2/4', is_correct: false },
    { id: 'd', text: '3/4', is_correct: false },
  ],
  hint_1: 'H1', hint_2: 'H2', hint_3: 'H3',
  calculator_allowed: false, source: 'ai_generated',
}

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify([mockQuestion]) }],
      }),
    },
  })),
}))

describe('generateTopic', () => {
  it('returns validated questions from the API response', async () => {
    const result = await generateTopic(3, 'math', mockTopic)
    expect(result).toHaveLength(1)
    expect(result[0].grade).toBe(3)
    expect(result[0].sol_standard).toBe('3.2')
  })

  it('strips markdown code fences from the response', async () => {
    const Anthropic = (await import('@anthropic-ai/sdk')).default as ReturnType<typeof vi.fn>
    Anthropic.mockImplementationOnce(() => ({
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: '```json\n' + JSON.stringify([mockQuestion]) + '\n```' }],
        }),
      },
    }))
    const result = await generateTopic(3, 'math', mockTopic)
    expect(result).toHaveLength(1)
  })

  it('throws when the API returns invalid JSON', async () => {
    const Anthropic = (await import('@anthropic-ai/sdk')).default as ReturnType<typeof vi.fn>
    Anthropic.mockImplementationOnce(() => ({
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'not json at all' }],
        }),
      },
    }))
    await expect(generateTopic(3, 'math', mockTopic)).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run lib/generation/generate-topic.test.ts
```

Expected: FAIL — "Cannot find module './generate-topic'"

- [ ] **Step 3: Create lib/generation/generate-topic.ts**

```typescript
// lib/generation/generate-topic.ts
import Anthropic from '@anthropic-ai/sdk'
import { type SolTopic } from '@/lib/curriculum/sol-curriculum'
import { validateQuestionBatch, type GeneratedQuestion } from '@/lib/generation/question-schema'

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

export async function generateTopic(
  grade: number,
  subject: 'math' | 'reading',
  topic: SolTopic
): Promise<GeneratedQuestion[]> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: buildPrompt(grade, subject, topic) }],
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
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run lib/generation/generate-topic.test.ts
```

Expected: All 3 tests pass.

- [ ] **Step 5: Update scripts/generate-questions.ts to use the shared function**

In `scripts/generate-questions.ts`:
- Add import: `import { generateTopic } from '@/lib/generation/generate-topic'`
- Remove the local `buildPrompt` function and the local `async function generateTopic(...)` entirely
- Replace the `await generateTopic(grade, subject, topic)` call in the main loop with a wrapper that handles file writing:

```typescript
async function generateAndSave(grade: number, subject: 'math' | 'reading', topic: SolTopic) {
  console.log(`Generating: Grade ${grade} ${subject} — ${topic.name} (${topic.solStandard})...`)
  try {
    const validated = await generateTopic(grade, subject, topic)
    const slug = topicSlug(topic.name)
    const outPath = join(OUT_DIR, `grade${grade}-${subject}-${slug}.json`)
    writeFileSync(outPath, JSON.stringify(validated, null, 2))
    console.log(`  ✓ ${validated.length} questions → ${outPath}`)
  } catch (e) {
    console.error(`  ✗ ${topic.name}: ${(e as Error).message}`)
  }
}
```

Replace the inner loop call `await generateTopic(...)` with `await generateAndSave(...)`.

- [ ] **Step 6: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add lib/generation/generate-topic.ts lib/generation/generate-topic.test.ts scripts/generate-questions.ts
git commit -m "feat: extract generateTopic to lib/generation/ — shared by API routes and CLI"
```

---

### Task 4: lib/admin/assert-admin.ts + auth guard test scaffold

**Files:**
- Create: `lib/admin/assert-admin.ts`
- Create: `app/api/admin/auth-guard.test.ts`

- [ ] **Step 1: Create lib/admin/assert-admin.ts**

```typescript
// lib/admin/assert-admin.ts
import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Returns the user id if the current user is an admin.
 * Throws a Response(403) if not authenticated or not admin.
 * Any other error (e.g. DB failure) is re-thrown as-is.
 *
 * Usage in route handlers:
 *   const userIdOrErr = await assertAdmin(supabase).catch(e => e)
 *   if (userIdOrErr instanceof Response) return userIdOrErr
 *   // userIdOrErr is now string (userId)
 */
export async function assertAdmin(supabase: SupabaseClient): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Response(JSON.stringify({ error: 'forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { data: parent } = await supabase
    .from('parents')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!parent?.is_admin) {
    throw new Response(JSON.stringify({ error: 'forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return user.id
}
```

- [ ] **Step 2: Create app/api/admin/auth-guard.test.ts scaffold**

Create the file now with a placeholder. The full test body is added in Task 11 once all routes exist.

```typescript
// app/api/admin/auth-guard.test.ts
// Full test added in Task 11 after all routes are built.
import { describe, it } from 'vitest'
describe('auth-guard scaffold', () => {
  it('placeholder', () => {})
})
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run lib/admin
```

Expected: No test file yet for assert-admin itself (it is tested indirectly through every route test). The scaffold passes.

- [ ] **Step 4: Commit**

```bash
git add lib/admin/assert-admin.ts app/api/admin/auth-guard.test.ts
git commit -m "feat: assertAdmin helper and auth guard test scaffold"
```

---

### Task 5: POST /api/admin/generate + tests

**Files:**
- Create: `app/api/admin/generate/route.test.ts`
- Create: `app/api/admin/generate/route.ts`

- [ ] **Step 1: Write the failing test**

Create `app/api/admin/generate/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockQuestion = {
  grade: 3, subject: 'math', topic: 'fractions', subtopic: 'identifying fractions',
  sol_standard: '3.2', difficulty: 1,
  question_text: 'What fraction?', simplified_text: 'What fraction?',
  answer_type: 'multiple_choice',
  choices: [
    { id: 'a', text: '1/4', is_correct: true },
    { id: 'b', text: '1/3', is_correct: false },
    { id: 'c', text: '2/4', is_correct: false },
    { id: 'd', text: '3/4', is_correct: false },
  ],
  hint_1: 'H1', hint_2: 'H2', hint_3: 'H3',
  calculator_allowed: false, source: 'ai_generated',
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}))
vi.mock('@/lib/generation/generate-topic', () => ({
  generateTopic: vi.fn().mockResolvedValue([mockQuestion]),
}))

describe('POST /api/admin/generate', () => {
  beforeEach(async () => {
    const { createClient, createAdminClient } = await import('@/lib/supabase/server')
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { is_admin: true }, error: null }),
      }),
    })
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: [{ id: 'pq-1' }], error: null }),
      }),
    })
  })

  it('returns 200 with count and ids on success', async () => {
    const { POST } = await import('./route')
    const req = new NextRequest('http://localhost/api/admin/generate', {
      method: 'POST',
      body: JSON.stringify({ grade: 3, subject: 'math', topic: 'fractions' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('count', 1)
    expect(body).toHaveProperty('ids')
  })

  it('returns 400 for an unknown topic name', async () => {
    const { POST } = await import('./route')
    const req = new NextRequest('http://localhost/api/admin/generate', {
      method: 'POST',
      body: JSON.stringify({ grade: 3, subject: 'math', topic: 'not a real topic' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('unknown_topic')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run app/api/admin/generate/route.test.ts
```

Expected: FAIL — "Cannot find module './route'"

- [ ] **Step 3: Create app/api/admin/generate/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/lib/admin/assert-admin'
import { generateTopic } from '@/lib/generation/generate-topic'
import { getTopicsForGradeSubject } from '@/lib/curriculum/sol-curriculum'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const userIdOrErr = await assertAdmin(supabase).catch(e => e)
  if (userIdOrErr instanceof Response) return userIdOrErr

  const { grade, subject, topic: topicName } = await req.json()

  const topics = getTopicsForGradeSubject(grade, subject)
  const topic = topics.find(t => t.name === topicName)
  if (!topic) {
    return NextResponse.json({ error: 'unknown_topic' }, { status: 400 })
  }

  let questions
  try {
    questions = await generateTopic(grade, subject, topic)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }

  const adminDb = createAdminClient()
  const { data, error } = await adminDb
    .from('questions_pending')
    .insert(questions)
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ count: data.length, ids: data.map((r: { id: string }) => r.id) })
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run app/api/admin/generate/route.test.ts
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/generate/route.ts app/api/admin/generate/route.test.ts
git commit -m "feat: POST /api/admin/generate — trigger AI question generation"
```

---

### Task 6: GET /api/admin/pending + tests

**Files:**
- Create: `app/api/admin/pending/route.test.ts`
- Create: `app/api/admin/pending/route.ts`

- [ ] **Step 1: Write the failing test**

Create `app/api/admin/pending/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}))

const mockPending = { id: 'pq-1', status: 'pending', generated_at: new Date().toISOString() }
const mockRejected = { id: 'pq-2', status: 'rejected', generated_at: new Date().toISOString() }

function makeAdminMocks(rows: unknown[]) {
  const client = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }) },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: rows, error: null }),
      single: vi.fn().mockResolvedValue({ data: { is_admin: true }, error: null }),
    }),
  }
  return client
}

describe('GET /api/admin/pending', () => {
  beforeEach(async () => {
    const { createClient, createAdminClient } = await import('@/lib/supabase/server')
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(makeAdminMocks([mockPending]))
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(makeAdminMocks([mockPending]))
  })

  it('returns 200 with an array', async () => {
    const { GET } = await import('./route')
    const res = await GET(new NextRequest('http://localhost/api/admin/pending'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  it('includes rejected when includeRejected=true', async () => {
    const { createAdminClient } = await import('@/lib/supabase/server')
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAdminMocks([mockPending, mockRejected])
    )
    const { GET } = await import('./route')
    const res = await GET(new NextRequest('http://localhost/api/admin/pending?includeRejected=true'))
    expect(res.status).toBe(200)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run app/api/admin/pending/route.test.ts
```

Expected: FAIL — "Cannot find module './route'"

- [ ] **Step 3: Create app/api/admin/pending/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/lib/admin/assert-admin'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const userIdOrErr = await assertAdmin(supabase).catch(e => e)
  if (userIdOrErr instanceof Response) return userIdOrErr

  const includeRejected = req.nextUrl.searchParams.get('includeRejected') === 'true'
  const statuses = includeRejected ? ['pending', 'rejected'] : ['pending']

  const adminDb = createAdminClient()
  const { data, error } = await adminDb
    .from('questions_pending')
    .select('*')
    .in('status', statuses)
    .order('generated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run app/api/admin/pending/route.test.ts
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/pending/route.ts app/api/admin/pending/route.test.ts
git commit -m "feat: GET /api/admin/pending — list pending questions"
```

---

### Task 7: PATCH /api/admin/pending/[id] + tests

**Files:**
- Create: `app/api/admin/pending/[id]/route.test.ts`
- Create: `app/api/admin/pending/[id]/route.ts`

- [ ] **Step 1: Write the failing test**

Create `app/api/admin/pending/[id]/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}))

function makeAdminMocks(pendingStatus = 'pending') {
  const updateResult = { eq: vi.fn().mockReturnThis(), select: vi.fn().mockResolvedValue({ data: [{ id: 'pq-1' }], error: null }) }
  return {
    userClient: {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { is_admin: true }, error: null }),
      }),
    },
    adminClient: {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'questions_pending') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'pq-1', status: pendingStatus }, error: null }),
            update: vi.fn().mockReturnValue(updateResult),
          }
        }
        return {}
      }),
    },
  }
}

describe('PATCH /api/admin/pending/[id]', () => {
  beforeEach(async () => {
    const { createClient, createAdminClient } = await import('@/lib/supabase/server')
    const { userClient, adminClient } = makeAdminMocks()
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(userClient)
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(adminClient)
  })

  it('updates a pending question and returns 200', async () => {
    const { PATCH } = await import('./route')
    const req = new NextRequest('http://localhost/api/admin/pending/pq-1', {
      method: 'PATCH',
      body: JSON.stringify({ question_text: 'Updated text' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'pq-1' }) })
    expect(res.status).toBe(200)
  })

  it('returns 409 when row is already approved', async () => {
    const { createAdminClient } = await import('@/lib/supabase/server')
    const { adminClient } = makeAdminMocks('approved')
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(adminClient)
    const { PATCH } = await import('./route')
    const req = new NextRequest('http://localhost/api/admin/pending/pq-1', {
      method: 'PATCH',
      body: JSON.stringify({ question_text: 'Updated text' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'pq-1' }) })
    expect(res.status).toBe(409)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run "app/api/admin/pending/[id]/route.test.ts"
```

Expected: FAIL — "Cannot find module './route'"

- [ ] **Step 3: Create app/api/admin/pending/[id]/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/lib/admin/assert-admin'

const EDITABLE_FIELDS = [
  'question_text', 'simplified_text', 'choices',
  'hint_1', 'hint_2', 'hint_3', 'difficulty', 'calculator_allowed',
] as const

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const userIdOrErr = await assertAdmin(supabase).catch(e => e)
  if (userIdOrErr instanceof Response) return userIdOrErr

  const { id } = await params
  const adminDb = createAdminClient()

  const { data: existing, error: fetchErr } = await adminDb
    .from('questions_pending')
    .select('status')
    .eq('id', id)
    .single()

  if (fetchErr || !existing) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (existing.status !== 'pending') {
    return NextResponse.json({ error: 'already_reviewed' }, { status: 409 })
  }

  const body = await req.json()
  const patch: Record<string, unknown> = {}
  for (const field of EDITABLE_FIELDS) {
    if (field in body) patch[field] = body[field]
  }

  const { data, error } = await adminDb
    .from('questions_pending')
    .update(patch)
    .eq('id', id)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data?.[0])
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run "app/api/admin/pending/[id]/route.test.ts"
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add "app/api/admin/pending/[id]/route.ts" "app/api/admin/pending/[id]/route.test.ts"
git commit -m "feat: PATCH /api/admin/pending/[id] — inline-edit pending question"
```

---

### Task 8: POST /api/admin/pending/[id]/approve + tests

**Files:**
- Create: `app/api/admin/pending/[id]/approve/route.test.ts`
- Create: `app/api/admin/pending/[id]/approve/route.ts`

- [ ] **Step 1: Write the failing test**

Create `app/api/admin/pending/[id]/approve/route.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}))

function makeAdminMocks(rpcResult: { data: unknown; error: unknown }) {
  return {
    userClient: {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { is_admin: true }, error: null }),
      }),
    },
    adminClient: { rpc: vi.fn().mockResolvedValue(rpcResult) },
  }
}

describe('POST /api/admin/pending/[id]/approve', () => {
  it('returns 200 with questionId on success', async () => {
    const { createClient, createAdminClient } = await import('@/lib/supabase/server')
    const { userClient, adminClient } = makeAdminMocks({ data: 'new-q-id', error: null })
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(userClient)
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(adminClient)

    const { POST } = await import('./route')
    const req = new NextRequest('http://localhost/api/admin/pending/pq-1/approve', { method: 'POST' })
    const res = await POST(req, { params: Promise.resolve({ id: 'pq-1' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('questionId', 'new-q-id')
  })

  it('returns 409 when already_published error comes back from RPC', async () => {
    const { createClient, createAdminClient } = await import('@/lib/supabase/server')
    const { userClient, adminClient } = makeAdminMocks({
      data: null,
      error: { message: 'already_published', code: 'P0001', details: null, hint: null },
    })
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(userClient)
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(adminClient)

    const { POST } = await import('./route')
    const req = new NextRequest('http://localhost/api/admin/pending/pq-1/approve', { method: 'POST' })
    const res = await POST(req, { params: Promise.resolve({ id: 'pq-1' }) })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('already_published')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run "app/api/admin/pending/[id]/approve/route.test.ts"
```

Expected: FAIL — "Cannot find module './route'"

- [ ] **Step 3: Create app/api/admin/pending/[id]/approve/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/lib/admin/assert-admin'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const userIdOrErr = await assertAdmin(supabase).catch(e => e)
  if (userIdOrErr instanceof Response) return userIdOrErr
  const userId = userIdOrErr as string

  const { id } = await params
  const adminDb = createAdminClient()

  const { data: questionId, error } = await adminDb.rpc('approve_pending_question', {
    p_pending_id: id,
    p_admin_id: userId,
  })

  if (error) {
    const msg = (error as { message?: string }).message ?? ''
    if (msg.includes('already_published')) {
      return NextResponse.json({ error: 'already_published' }, { status: 409 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  return NextResponse.json({ questionId })
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run "app/api/admin/pending/[id]/approve/route.test.ts"
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add "app/api/admin/pending/[id]/approve/route.ts" "app/api/admin/pending/[id]/approve/route.test.ts"
git commit -m "feat: POST /api/admin/pending/[id]/approve — atomic approve via Postgres RPC"
```

---

### Task 9: reject + restore routes + tests

**Files:**
- Create: `app/api/admin/pending/[id]/reject/route.test.ts`
- Create: `app/api/admin/pending/[id]/reject/route.ts`
- Create: `app/api/admin/pending/[id]/restore/route.test.ts`
- Create: `app/api/admin/pending/[id]/restore/route.ts`

- [ ] **Step 1: Write failing tests for reject**

Create `app/api/admin/pending/[id]/reject/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}))

describe('POST /api/admin/pending/[id]/reject', () => {
  beforeEach(async () => {
    const { createClient, createAdminClient } = await import('@/lib/supabase/server')
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { is_admin: true }, error: null }),
      }),
    })
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    })
  })

  it('returns 200 on success', async () => {
    const { POST } = await import('./route')
    const req = new NextRequest('http://localhost/api/admin/pending/pq-1/reject', { method: 'POST' })
    const res = await POST(req, { params: Promise.resolve({ id: 'pq-1' }) })
    expect(res.status).toBe(200)
  })
})
```

- [ ] **Step 2: Write failing tests for restore**

Create `app/api/admin/pending/[id]/restore/route.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}))

function makeAdminMocks(currentStatus: string) {
  const updateChain = { eq: vi.fn().mockResolvedValue({ error: null }) }
  return {
    userClient: {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { is_admin: true }, error: null }),
      }),
    },
    adminClient: {
      from: vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { status: currentStatus }, error: null }),
        update: vi.fn().mockReturnValue(updateChain),
      })),
    },
  }
}

describe('POST /api/admin/pending/[id]/restore', () => {
  it('returns 200 when restoring a rejected question', async () => {
    const { createClient, createAdminClient } = await import('@/lib/supabase/server')
    const { userClient, adminClient } = makeAdminMocks('rejected')
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(userClient)
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(adminClient)
    const { POST } = await import('./route')
    const req = new NextRequest('http://localhost/api/admin/pending/pq-1/restore', { method: 'POST' })
    const res = await POST(req, { params: Promise.resolve({ id: 'pq-1' }) })
    expect(res.status).toBe(200)
  })

  it('returns 409 when the question is not rejected', async () => {
    const { createClient, createAdminClient } = await import('@/lib/supabase/server')
    const { userClient, adminClient } = makeAdminMocks('pending')
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(userClient)
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(adminClient)
    const { POST } = await import('./route')
    const req = new NextRequest('http://localhost/api/admin/pending/pq-1/restore', { method: 'POST' })
    const res = await POST(req, { params: Promise.resolve({ id: 'pq-1' }) })
    expect(res.status).toBe(409)
  })
})
```

- [ ] **Step 3: Run to verify both fail**

```bash
npx vitest run "app/api/admin/pending/[id]/reject/route.test.ts" "app/api/admin/pending/[id]/restore/route.test.ts"
```

Expected: FAIL — "Cannot find module"

- [ ] **Step 4: Create reject route**

Create `app/api/admin/pending/[id]/reject/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/lib/admin/assert-admin'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const userIdOrErr = await assertAdmin(supabase).catch(e => e)
  if (userIdOrErr instanceof Response) return userIdOrErr
  const userId = userIdOrErr as string

  const { id } = await params
  const adminDb = createAdminClient()

  const { error } = await adminDb
    .from('questions_pending')
    .update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: userId })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 5: Create restore route**

Create `app/api/admin/pending/[id]/restore/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/lib/admin/assert-admin'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const userIdOrErr = await assertAdmin(supabase).catch(e => e)
  if (userIdOrErr instanceof Response) return userIdOrErr

  const { id } = await params
  const adminDb = createAdminClient()

  const { data: existing, error: fetchErr } = await adminDb
    .from('questions_pending')
    .select('status')
    .eq('id', id)
    .single()

  if (fetchErr || !existing) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (existing.status !== 'rejected') {
    return NextResponse.json({ error: 'not_rejected' }, { status: 409 })
  }

  const { error } = await adminDb
    .from('questions_pending')
    .update({ status: 'pending', reviewed_at: null, reviewed_by: null })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 6: Run tests**

```bash
npx vitest run "app/api/admin/pending/[id]/reject/route.test.ts" "app/api/admin/pending/[id]/restore/route.test.ts"
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add "app/api/admin/pending/[id]/reject/route.ts" "app/api/admin/pending/[id]/reject/route.test.ts" "app/api/admin/pending/[id]/restore/route.ts" "app/api/admin/pending/[id]/restore/route.test.ts"
git commit -m "feat: reject and restore routes for pending questions"
```

---

### Task 10: GET /api/admin/questions + PATCH /api/admin/questions/[id] + tests

**Files:**
- Create: `app/api/admin/questions/route.test.ts`
- Create: `app/api/admin/questions/route.ts`
- Create: `app/api/admin/questions/[id]/route.test.ts`
- Create: `app/api/admin/questions/[id]/route.ts`

- [ ] **Step 1: Write failing tests**

Create `app/api/admin/questions/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}))

describe('GET /api/admin/questions', () => {
  beforeEach(async () => {
    const { createClient, createAdminClient } = await import('@/lib/supabase/server')
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { is_admin: true }, error: null }),
      }),
    })
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [{ id: 'q-1' }], count: 1, error: null }),
      }),
    })
  })

  it('returns questions and total', async () => {
    const { GET } = await import('./route')
    const res = await GET(new NextRequest('http://localhost/api/admin/questions?grade=3'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('questions')
    expect(body).toHaveProperty('total')
  })
})
```

Create `app/api/admin/questions/[id]/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}))

describe('PATCH /api/admin/questions/[id]', () => {
  beforeEach(async () => {
    const { createClient, createAdminClient } = await import('@/lib/supabase/server')
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { is_admin: true }, error: null }),
      }),
    })
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [{ id: 'q-1', question_text: 'Updated Q?' }],
          error: null,
        }),
      }),
    })
  })

  it('updates a published question and returns it', async () => {
    const { PATCH } = await import('./route')
    const req = new NextRequest('http://localhost/api/admin/questions/q-1', {
      method: 'PATCH',
      body: JSON.stringify({ question_text: 'Updated Q?' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'q-1' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.question_text).toBe('Updated Q?')
  })
})
```

- [ ] **Step 2: Run to verify they fail**

```bash
npx vitest run app/api/admin/questions/route.test.ts "app/api/admin/questions/[id]/route.test.ts"
```

Expected: FAIL — "Cannot find module"

- [ ] **Step 3: Create GET /api/admin/questions route**

Create `app/api/admin/questions/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/lib/admin/assert-admin'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const userIdOrErr = await assertAdmin(supabase).catch(e => e)
  if (userIdOrErr instanceof Response) return userIdOrErr

  const { searchParams } = req.nextUrl
  const grade = searchParams.get('grade')
  const subject = searchParams.get('subject')
  const topic = searchParams.get('topic')
  const offset = parseInt(searchParams.get('offset') ?? '0', 10)
  const limit = parseInt(searchParams.get('limit') ?? '20', 10)

  const adminDb = createAdminClient()
  let query = adminDb.from('questions').select('*', { count: 'exact' })
  if (grade) query = query.eq('grade', parseInt(grade, 10))
  if (subject) query = query.eq('subject', subject)
  if (topic) query = query.eq('topic', topic)

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ questions: data, total: count ?? 0 })
}
```

- [ ] **Step 4: Create PATCH /api/admin/questions/[id] route**

Create `app/api/admin/questions/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/lib/admin/assert-admin'

const EDITABLE_FIELDS = [
  'question_text', 'simplified_text', 'choices',
  'hint_1', 'hint_2', 'hint_3', 'difficulty', 'calculator_allowed',
] as const

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const userIdOrErr = await assertAdmin(supabase).catch(e => e)
  if (userIdOrErr instanceof Response) return userIdOrErr

  const { id } = await params
  const body = await req.json()
  const patch: Record<string, unknown> = {}
  for (const field of EDITABLE_FIELDS) {
    if (field in body) patch[field] = body[field]
  }

  const adminDb = createAdminClient()
  const { data, error } = await adminDb
    .from('questions')
    .update(patch)
    .eq('id', id)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data?.[0])
}
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run app/api/admin/questions/route.test.ts "app/api/admin/questions/[id]/route.test.ts"
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add app/api/admin/questions/route.ts app/api/admin/questions/route.test.ts "app/api/admin/questions/[id]/route.ts" "app/api/admin/questions/[id]/route.test.ts"
git commit -m "feat: GET and PATCH routes for published questions"
```

---

### Task 11: Complete auth guard test + app/(admin) layout + page shells

**Files:**
- Modify: `app/api/admin/auth-guard.test.ts`
- Create: `app/(admin)/layout.tsx`
- Create: `app/(admin)/admin/generate/page.tsx`
- Create: `app/(admin)/admin/questions/page.tsx`

- [ ] **Step 1: Replace auth-guard.test.ts with full coverage**

Replace `app/api/admin/auth-guard.test.ts` entirely:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}))

function makeNonAdminClient() {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { is_admin: false }, error: null }),
    }),
  }
}

describe('Admin API auth guard — non-admin gets 403', () => {
  beforeEach(async () => {
    const { createClient } = await import('@/lib/supabase/server')
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(makeNonAdminClient())
  })

  it('POST /api/admin/generate returns 403', async () => {
    const { POST } = await import('@/app/api/admin/generate/route')
    const res = await POST(new NextRequest('http://localhost/api/admin/generate', {
      method: 'POST', body: JSON.stringify({ grade: 3, subject: 'math', topic: 'fractions' }),
    }))
    expect(res.status).toBe(403)
  })

  it('GET /api/admin/pending returns 403', async () => {
    const { GET } = await import('@/app/api/admin/pending/route')
    const res = await GET(new NextRequest('http://localhost/api/admin/pending'))
    expect(res.status).toBe(403)
  })

  it('PATCH /api/admin/pending/[id] returns 403', async () => {
    const { PATCH } = await import('@/app/api/admin/pending/[id]/route')
    const res = await PATCH(
      new NextRequest('http://localhost/api/admin/pending/pq-1', {
        method: 'PATCH', body: JSON.stringify({ question_text: 'x' }),
      }),
      { params: Promise.resolve({ id: 'pq-1' }) }
    )
    expect(res.status).toBe(403)
  })

  it('POST /api/admin/pending/[id]/approve returns 403', async () => {
    const { POST } = await import('@/app/api/admin/pending/[id]/approve/route')
    const res = await POST(
      new NextRequest('http://localhost/api/admin/pending/pq-1/approve', { method: 'POST' }),
      { params: Promise.resolve({ id: 'pq-1' }) }
    )
    expect(res.status).toBe(403)
  })

  it('POST /api/admin/pending/[id]/reject returns 403', async () => {
    const { POST } = await import('@/app/api/admin/pending/[id]/reject/route')
    const res = await POST(
      new NextRequest('http://localhost/api/admin/pending/pq-1/reject', { method: 'POST' }),
      { params: Promise.resolve({ id: 'pq-1' }) }
    )
    expect(res.status).toBe(403)
  })

  it('POST /api/admin/pending/[id]/restore returns 403', async () => {
    const { POST } = await import('@/app/api/admin/pending/[id]/restore/route')
    const res = await POST(
      new NextRequest('http://localhost/api/admin/pending/pq-1/restore', { method: 'POST' }),
      { params: Promise.resolve({ id: 'pq-1' }) }
    )
    expect(res.status).toBe(403)
  })

  it('GET /api/admin/questions returns 403', async () => {
    const { GET } = await import('@/app/api/admin/questions/route')
    const res = await GET(new NextRequest('http://localhost/api/admin/questions'))
    expect(res.status).toBe(403)
  })

  it('PATCH /api/admin/questions/[id] returns 403', async () => {
    const { PATCH } = await import('@/app/api/admin/questions/[id]/route')
    const res = await PATCH(
      new NextRequest('http://localhost/api/admin/questions/q-1', {
        method: 'PATCH', body: JSON.stringify({ question_text: 'x' }),
      }),
      { params: Promise.resolve({ id: 'q-1' }) }
    )
    expect(res.status).toBe(403)
  })
})
```

- [ ] **Step 2: Run auth guard tests**

```bash
npx vitest run app/api/admin/auth-guard.test.ts
```

Expected: All 8 tests pass.

- [ ] **Step 3: Create app/(admin)/layout.tsx**

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: parent } = await supabase
    .from('parents')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!parent?.is_admin) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <nav className="max-w-5xl mx-auto px-3 sm:px-4 h-14 flex items-center gap-4">
          <span className="font-bold text-sm">🛠️ Admin</span>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/admin/generate" className="hover:underline">Generate &amp; Review</Link>
            <span className="text-muted-foreground">|</span>
            <Link href="/admin/questions" className="hover:underline">Published Questions</Link>
            <span className="text-muted-foreground">|</span>
            <Link href="/dashboard" className="text-muted-foreground hover:underline">← Dashboard</Link>
          </div>
        </nav>
      </header>
      <div>{children}</div>
    </div>
  )
}
```

- [ ] **Step 4: Create page shells**

Create `app/(admin)/admin/generate/page.tsx`:

```typescript
import { GenerateReviewClient } from '@/components/admin/generate-review-client'

export default function GeneratePage() {
  return <GenerateReviewClient />
}
```

Create `app/(admin)/admin/questions/page.tsx`:

```typescript
import { createAdminClient } from '@/lib/supabase/server'
import { PublishedQuestionsClient } from '@/components/admin/published-questions-client'

export default async function QuestionsPage() {
  const adminDb = createAdminClient()
  const { data: questions, count } = await adminDb
    .from('questions')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(0, 19)

  return (
    <PublishedQuestionsClient
      initialQuestions={questions ?? []}
      initialTotal={count ?? 0}
    />
  )
}
```

- [ ] **Step 5: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add app/api/admin/auth-guard.test.ts "app/(admin)/layout.tsx" "app/(admin)/admin/generate/page.tsx" "app/(admin)/admin/questions/page.tsx"
git commit -m "feat: admin route group — layout with is_admin guard, page shells"
```

---

### Task 12: components/admin/generate-review-client.tsx

The Client Component that owns the generation form and pending review queue.

**Files:**
- Create: `components/admin/generate-review-client.tsx`

- [ ] **Step 1: Create components/admin/generate-review-client.tsx**

```typescript
'use client'

import { useEffect, useState, useCallback } from 'react'
import { SOL_CURRICULUM } from '@/lib/curriculum/sol-curriculum'

type Choice = { id: string; text: string; is_correct: boolean }

type PendingQuestion = {
  id: string
  grade: number
  subject: string
  topic: string
  difficulty: number
  question_text: string
  simplified_text: string
  choices: Choice[]
  hint_1: string
  hint_2: string
  hint_3: string
  status: 'pending' | 'approved' | 'rejected'
}

export function GenerateReviewClient() {
  const [grade, setGrade] = useState<number>(3)
  const [subject, setSubject] = useState<'math' | 'reading'>('math')
  const [topicName, setTopicName] = useState<string>('')
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [pendingQuestions, setPendingQuestions] = useState<PendingQuestion[]>([])
  const [showRejected, setShowRejected] = useState(false)
  // Optimistic status map: overrides server status for immediate UI feedback
  const [optimisticStatuses, setOptimisticStatuses] = useState<Record<string, PendingQuestion['status']>>({})

  const topicsForCurrent = SOL_CURRICULUM[grade]?.[subject] ?? []

  // Reset topic when grade or subject changes
  useEffect(() => {
    setTopicName(topicsForCurrent[0]?.name ?? '')
  }, [grade, subject]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchPending = useCallback(async () => {
    const res = await fetch(`/api/admin/pending?includeRejected=${showRejected}`)
    if (res.ok) {
      setPendingQuestions(await res.json())
      setOptimisticStatuses({})
    }
  }, [showRejected])

  useEffect(() => { fetchPending() }, [fetchPending])

  async function handleGenerate() {
    setGenerating(true)
    setGenerateError(null)
    try {
      const res = await fetch('/api/admin/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grade, subject, topic: topicName }),
      })
      if (!res.ok) {
        const body = await res.json()
        setGenerateError(body.error ?? 'Generation failed')
        return
      }
      await fetchPending()
    } finally {
      setGenerating(false)
    }
  }

  async function saveField(id: string, patch: Record<string, unknown>) {
    await fetch(`/api/admin/pending/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
  }

  async function handleApprove(id: string) {
    setOptimisticStatuses(prev => ({ ...prev, [id]: 'approved' }))
    const res = await fetch(`/api/admin/pending/${id}/approve`, { method: 'POST' })
    if (!res.ok) {
      setOptimisticStatuses(prev => ({ ...prev, [id]: 'pending' }))
      const body = await res.json()
      alert(body.error === 'already_published' ? 'Already published in questions table.' : 'Approval failed.')
    }
  }

  async function handleReject(id: string) {
    setOptimisticStatuses(prev => ({ ...prev, [id]: 'rejected' }))
    const res = await fetch(`/api/admin/pending/${id}/reject`, { method: 'POST' })
    if (!res.ok) setOptimisticStatuses(prev => ({ ...prev, [id]: 'pending' }))
  }

  async function handleRestore(id: string) {
    setOptimisticStatuses(prev => ({ ...prev, [id]: 'pending' }))
    const res = await fetch(`/api/admin/pending/${id}/restore`, { method: 'POST' })
    if (!res.ok) setOptimisticStatuses(prev => ({ ...prev, [id]: 'rejected' }))
  }

  const displayedQuestions = pendingQuestions.filter(q => {
    const status = optimisticStatuses[q.id] ?? q.status
    return showRejected || status !== 'rejected'
  })
  const pendingCount = displayedQuestions.filter(
    q => (optimisticStatuses[q.id] ?? q.status) === 'pending'
  ).length

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex justify-between items-baseline mb-4">
        <h1 className="text-lg font-semibold">Generate Questions</h1>
        <a href="/admin/questions" className="text-sm text-muted-foreground hover:underline">→ Published Questions</a>
      </div>

      {/* Generation form */}
      <div className="flex gap-3 items-end p-4 bg-muted/40 border rounded-lg mb-6 flex-wrap">
        <div>
          <label className="text-xs font-medium block mb-1">Grade</label>
          <select value={grade} onChange={e => setGrade(Number(e.target.value))}
            className="border rounded px-2 py-1 text-sm bg-background">
            {[3, 4, 5].map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium block mb-1">Subject</label>
          <select value={subject} onChange={e => setSubject(e.target.value as 'math' | 'reading')}
            className="border rounded px-2 py-1 text-sm bg-background">
            <option value="math">Math</option>
            <option value="reading">Reading</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium block mb-1">Topic</label>
          <select value={topicName} onChange={e => setTopicName(e.target.value)}
            className="border rounded px-2 py-1 text-sm bg-background w-48">
            {topicsForCurrent.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
          </select>
        </div>
        <button onClick={handleGenerate} disabled={generating || !topicName}
          className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm font-medium disabled:opacity-50">
          {generating ? 'Generating…' : '⚡ Generate 6 questions'}
        </button>
      </div>
      {generateError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
          {generateError}
        </div>
      )}

      {/* Queue header */}
      <div className="flex justify-between items-center mb-3">
        <span className="font-semibold text-sm">
          Pending Review{' '}
          <span className="bg-amber-500 text-white text-xs rounded-full px-2 py-0.5 ml-1">{pendingCount}</span>
        </span>
        <label className="text-xs text-muted-foreground flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={showRejected} onChange={e => setShowRejected(e.target.checked)} />
          Show rejected
        </label>
      </div>

      {/* Cards */}
      {displayedQuestions.map(q => {
        const status = optimisticStatuses[q.id] ?? q.status
        const isRejected = status === 'rejected'
        const isApproved = status === 'approved'

        return (
          <div key={q.id} className={`border rounded-lg p-4 mb-3 ${isRejected ? 'border-red-200 bg-red-50/50 opacity-60' : isApproved ? 'opacity-50 bg-muted/20' : 'bg-white'}`}>
            <div className="flex gap-1.5 flex-wrap mb-3">
              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded">Grade {q.grade} · {q.subject}</span>
              <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded">{q.topic}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${q.difficulty === 1 ? 'bg-yellow-100 text-yellow-800' : q.difficulty === 2 ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'}`}>
                Difficulty {q.difficulty}
              </span>
              {isRejected && <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded">Rejected</span>}
            </div>

            {isRejected ? (
              <div className="flex justify-between items-center">
                <p className="text-sm truncate mr-4">{q.question_text}</p>
                <button onClick={() => handleRestore(q.id)} className="px-3 py-1 border rounded text-xs shrink-0 hover:bg-muted">↩ Restore</button>
              </div>
            ) : (
              <>
                <div className="mb-3">
                  <label className="text-xs font-medium block mb-1">Question</label>
                  <textarea defaultValue={q.question_text} onBlur={e => saveField(q.id, { question_text: e.target.value })}
                    className="w-full border rounded px-2 py-1 text-sm bg-background resize-y" rows={2} />
                </div>
                <div className="mb-3">
                  <label className="text-xs font-medium block mb-1">Simplified</label>
                  <textarea defaultValue={q.simplified_text} onBlur={e => saveField(q.id, { simplified_text: e.target.value })}
                    className="w-full border rounded px-2 py-1 text-sm text-muted-foreground bg-background resize-y" rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {q.choices.map((c, i) => (
                    <div key={c.id} className={`border rounded px-3 py-1.5 text-sm flex items-center gap-2 ${c.is_correct ? 'border-green-400 bg-green-50' : ''}`}>
                      <input type="radio" name={`correct-${q.id}`} checked={c.is_correct} onChange={() => {
                        const updated = q.choices.map((ch, j) => ({ ...ch, is_correct: j === i }))
                        saveField(q.id, { choices: updated })
                      }} />
                      <span>{c.id}) {c.text}</span>
                    </div>
                  ))}
                </div>
                <details className="text-xs text-muted-foreground mb-3 cursor-pointer">
                  <summary>Hints</summary>
                  <div className="mt-2 space-y-1 pl-3">
                    {(['hint_1', 'hint_2', 'hint_3'] as const).map((h, i) => (
                      <input key={h} defaultValue={q[h]} onBlur={e => saveField(q.id, { [h]: e.target.value })}
                        placeholder={`Hint ${i + 1}`} className="w-full border rounded px-2 py-0.5 text-xs bg-background" />
                    ))}
                  </div>
                </details>
                <div className="flex gap-2">
                  <button onClick={() => handleApprove(q.id)} disabled={isApproved}
                    className="px-4 py-1.5 bg-green-600 text-white rounded text-xs font-medium disabled:opacity-40">✓ Approve</button>
                  <button onClick={() => handleReject(q.id)}
                    className="px-4 py-1.5 bg-red-600 text-white rounded text-xs font-medium">✗ Reject</button>
                </div>
              </>
            )}
          </div>
        )
      })}

      {displayedQuestions.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No pending questions. Generate some above.</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass (no component tests for admin UI — internal tool).

- [ ] **Step 3: Commit**

```bash
git add components/admin/generate-review-client.tsx
git commit -m "feat: GenerateReviewClient — interactive generate and review UI"
```

---

### Task 13: components/admin/published-questions-client.tsx

**Files:**
- Create: `components/admin/published-questions-client.tsx`

- [ ] **Step 1: Create components/admin/published-questions-client.tsx**

```typescript
'use client'

import { useState } from 'react'
import { SOL_CURRICULUM } from '@/lib/curriculum/sol-curriculum'

type Choice = { id: string; text: string; is_correct: boolean }

type Question = {
  id: string
  grade: number
  subject: string
  topic: string
  subtopic: string | null
  sol_standard: string | null
  difficulty: number
  question_text: string
  simplified_text: string | null
  choices: Choice[]
  hint_1: string | null
  hint_2: string | null
  hint_3: string | null
  calculator_allowed: boolean
}

type Filters = { grade: string; subject: string; topic: string }

export function PublishedQuestionsClient({
  initialQuestions,
  initialTotal,
}: {
  initialQuestions: Question[]
  initialTotal: number
}) {
  const [questions, setQuestions] = useState<Question[]>(initialQuestions)
  const [total, setTotal] = useState(initialTotal)
  const [offset, setOffset] = useState(initialQuestions.length)
  const [filters, setFilters] = useState<Filters>({ grade: '', subject: '', topic: '' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, Record<string, unknown>>>({})
  const [saving, setSaving] = useState(false)

  const topicsForFilter = filters.subject && filters.grade
    ? SOL_CURRICULUM[parseInt(filters.grade)]?.[filters.subject as 'math' | 'reading'] ?? []
    : []

  async function fetchWithFilters(newFilters: Filters, newOffset: number, append = false) {
    const params = new URLSearchParams()
    if (newFilters.grade) params.set('grade', newFilters.grade)
    if (newFilters.subject) params.set('subject', newFilters.subject)
    if (newFilters.topic) params.set('topic', newFilters.topic)
    params.set('offset', String(newOffset))
    params.set('limit', '20')
    const res = await fetch(`/api/admin/questions?${params}`)
    if (!res.ok) return
    const body = await res.json()
    setQuestions(prev => append ? [...prev, ...body.questions] : body.questions)
    setTotal(body.total)
    setOffset(newOffset + body.questions.length)
  }

  function handleFilterChange(key: keyof Filters, value: string) {
    const updated = { ...filters, [key]: value, ...(key === 'subject' ? { topic: '' } : {}) }
    setFilters(updated)
    fetchWithFilters(updated, 0)
  }

  async function handleSave(id: string) {
    setSaving(true)
    const patch = drafts[id] ?? {}
    const res = await fetch(`/api/admin/questions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (res.ok) {
      const updated = await res.json()
      setQuestions(prev => prev.map(q => q.id === id ? updated : q))
      setDrafts(prev => { const n = { ...prev }; delete n[id]; return n })
      setEditingId(null)
    }
    setSaving(false)
  }

  const difficultyColor = (d: number) =>
    d === 1 ? 'bg-yellow-100 text-yellow-800' : d === 2 ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex justify-between items-baseline mb-4">
        <h1 className="text-lg font-semibold">
          Published Questions{' '}
          <span className="text-muted-foreground font-normal text-sm">{total} total</span>
        </h1>
        <a href="/admin/generate" className="text-sm text-muted-foreground hover:underline">← Generate &amp; Review</a>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-end p-4 bg-muted/40 border rounded-lg mb-6 flex-wrap">
        <div>
          <label className="text-xs font-medium block mb-1">Grade</label>
          <select value={filters.grade} onChange={e => handleFilterChange('grade', e.target.value)}
            className="border rounded px-2 py-1 text-sm bg-background">
            <option value="">All</option>
            {[3, 4, 5].map(g => <option key={g} value={String(g)}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium block mb-1">Subject</label>
          <select value={filters.subject} onChange={e => handleFilterChange('subject', e.target.value)}
            className="border rounded px-2 py-1 text-sm bg-background">
            <option value="">All</option>
            <option value="math">Math</option>
            <option value="reading">Reading</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium block mb-1">Topic</label>
          <select value={filters.topic} onChange={e => handleFilterChange('topic', e.target.value)}
            className="border rounded px-2 py-1 text-sm bg-background w-44"
            disabled={!filters.grade || !filters.subject}>
            <option value="">All</option>
            {topicsForFilter.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
          </select>
        </div>
      </div>

      {/* Cards */}
      {questions.map(q => {
        const isEditing = editingId === q.id
        const draft = drafts[q.id] ?? {}
        const isDirty = Object.keys(draft).length > 0

        return (
          <div key={q.id} className="border rounded-lg mb-3 bg-white overflow-hidden">
            {isEditing ? (
              <div className="p-4">
                <div className="flex gap-1.5 flex-wrap mb-3">
                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded">Grade {q.grade} · {q.subject}</span>
                  <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded">{q.topic}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${difficultyColor(q.difficulty)}`}>Difficulty {q.difficulty}</span>
                  {q.sol_standard && <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded">SOL {q.sol_standard}</span>}
                </div>
                <div className="mb-3">
                  <label className="text-xs font-medium block mb-1">Question</label>
                  <textarea defaultValue={q.question_text}
                    onChange={e => setDrafts(prev => ({ ...prev, [q.id]: { ...prev[q.id], question_text: e.target.value } }))}
                    className="w-full border rounded px-2 py-1 text-sm bg-background resize-y" rows={2} />
                </div>
                <div className="mb-3">
                  <label className="text-xs font-medium block mb-1">Simplified</label>
                  <textarea defaultValue={q.simplified_text ?? ''}
                    onChange={e => setDrafts(prev => ({ ...prev, [q.id]: { ...prev[q.id], simplified_text: e.target.value } }))}
                    className="w-full border rounded px-2 py-1 text-sm text-muted-foreground bg-background resize-y" rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {(q.choices as Choice[]).map(c => (
                    <div key={c.id} className={`border rounded px-3 py-1.5 text-sm ${c.is_correct ? 'border-green-400 bg-green-50' : ''}`}>
                      {c.is_correct ? '✓ ' : ''}{c.id}) {c.text}
                    </div>
                  ))}
                </div>
                <details className="text-xs text-muted-foreground mb-3">
                  <summary className="cursor-pointer">Hints</summary>
                  <div className="mt-2 space-y-1 pl-3">
                    {(['hint_1', 'hint_2', 'hint_3'] as const).map((h, i) => (
                      <input key={h} defaultValue={q[h] ?? ''}
                        onChange={e => setDrafts(prev => ({ ...prev, [q.id]: { ...prev[q.id], [h]: e.target.value } }))}
                        placeholder={`Hint ${i + 1}`} className="w-full border rounded px-2 py-0.5 text-xs bg-background" />
                    ))}
                  </div>
                </details>
                <div className="flex gap-3 items-center">
                  <button onClick={() => handleSave(q.id)} disabled={!isDirty || saving}
                    className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm font-medium disabled:opacity-40">
                    Save changes
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-sm text-muted-foreground hover:underline">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="px-4 py-3 flex justify-between items-center gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-xs px-2 py-0.5 rounded shrink-0 ${difficultyColor(q.difficulty)}`}>Difficulty {q.difficulty}</span>
                  <span className="text-sm truncate">{q.question_text}</span>
                </div>
                <button onClick={() => setEditingId(q.id)} className="px-3 py-1 border rounded text-xs shrink-0 hover:bg-muted">Edit</button>
              </div>
            )}
          </div>
        )
      })}

      {questions.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No questions match your filters.</p>
      )}

      {offset < total && (
        <div className="text-center mt-4">
          <button onClick={() => fetchWithFilters(filters, offset, true)}
            className="px-6 py-2 border rounded text-sm hover:bg-muted">Load more</button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add components/admin/published-questions-client.tsx
git commit -m "feat: PublishedQuestionsClient — browse and inline-edit published questions"
```

---

### Task 14: app/(parent)/layout.tsx — add Admin nav link

**Files:**
- Modify: `app/(parent)/layout.tsx`

- [ ] **Step 1: Add is_admin query to the layout**

In `app/(parent)/layout.tsx`, after `const { data: { user } } = await supabase.auth.getUser()`, add:

```typescript
const { data: parent } = await supabase
  .from('parents')
  .select('is_admin')
  .eq('id', user.id)
  .single()
```

- [ ] **Step 2: Add the Admin nav link**

Inside `<div className="flex items-center gap-0.5 sm:gap-1">`, after the `NAV_LINKS.map(...)` block and before `<SignOutButton />`, add:

```tsx
{parent?.is_admin && (
  <Link href="/admin/generate" className={navLinkClass}>
    <span>🛠️</span>
    <span className="hidden sm:inline">Admin</span>
  </Link>
)}
```

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 4: Commit and push**

```bash
git add "app/(parent)/layout.tsx"
git commit -m "feat: show Admin nav link for is_admin users in parent layout"
git push
```

---

## Final verification

```bash
npx vitest run
```

Expected: All tests pass with zero failures.
