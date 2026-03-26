# Question Image Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display AI-generated inline SVG images alongside practice questions when a visual genuinely helps comprehension, with admin editing and a backfill script for existing questions.

**Architecture:** Add a nullable `image_svg text` column to `questions` and `questions_pending`. The generation prompt asks Claude to produce a compact inline SVG (or null) per question. `QuestionCard` renders the sanitized SVG below the question text. Admin UI shows a badge + textarea/preview for editing. A standalone `generate-images.ts` script backfills images for existing questions.

**Tech Stack:** TypeScript, Supabase (Postgres migrations), Anthropic SDK, Next.js App Router, Vitest, Tailwind CSS

---

## File Map

| File | Change |
|------|--------|
| `.gitignore` | Add `.superpowers/` |
| `supabase/migrations/0014_question_image.sql` | Create — add `image_svg` column |
| `lib/svg/sanitize.ts` | Create — strip scripts/event handlers from SVG |
| `lib/svg/sanitize.test.ts` | Create — tests for sanitizer |
| `lib/generation/question-schema.ts` | Add `image_svg?: string \| null` to interface; normalize undefined→null |
| `lib/generation/question-schema.test.ts` | Add test: question with image_svg passes; undefined image_svg becomes null |
| `lib/generation/generate-topic.ts` | Add image_svg instructions + field to JSON example in prompt |
| `lib/practice/question-types.ts` | Add `image_svg: string \| null` to Question interface |
| `components/practice/question-card.tsx` | Render sanitized SVG below question text |
| `app/api/admin/questions/[id]/route.ts` | Add `'image_svg'` to EDITABLE_FIELDS |
| `components/admin/published-questions-client.tsx` | Add `image_svg` to local type, badge in list, textarea+preview in edit |
| `scripts/generate-images.ts` | Create — backfill script |

---

## Task 1: Housekeeping + DB migration

**Files:**
- Modify: `.gitignore`
- Create: `supabase/migrations/0014_question_image.sql`

- [ ] **Step 1: Add `.superpowers/` to `.gitignore`**

  Open `.gitignore` and append after the `supabase/seed/generated/` line:
  ```
  .superpowers/
  ```

- [ ] **Step 2: Create the migration file**

  Create `supabase/migrations/0014_question_image.sql`:
  ```sql
  ALTER TABLE questions ADD COLUMN image_svg text;
  ALTER TABLE questions_pending ADD COLUMN image_svg text;
  ```

- [ ] **Step 3: Apply the migration locally**

  ```bash
  npx supabase db reset
  ```
  Expected: migration runs without error, DB resets cleanly with all previous seed data.

  > Note: `db reset` re-runs all migrations and the seed. After reset, re-run `npx tsx scripts/db-seed.ts` to repopulate questions if needed.

- [ ] **Step 4: Commit**

  ```bash
  git add .gitignore supabase/migrations/0014_question_image.sql
  git commit -m "feat: add image_svg column to questions and questions_pending"
  ```

---

## Task 2: SVG sanitizer utility

**Files:**
- Create: `lib/svg/sanitize.ts`
- Create: `lib/svg/sanitize.test.ts`

- [ ] **Step 1: Write the failing tests**

  Create `lib/svg/sanitize.test.ts`:
  ```ts
  import { describe, it, expect } from 'vitest'
  import { sanitizeSvg } from './sanitize'

  describe('sanitizeSvg', () => {
    it('passes clean SVG through unchanged', () => {
      const svg = '<svg viewBox="0 0 100 50"><rect x="0" y="0" width="50" height="50" fill="#ccc"/></svg>'
      expect(sanitizeSvg(svg)).toBe(svg)
    })

    it('strips <script> tags', () => {
      const svg = '<svg><script>alert(1)</script><rect/></svg>'
      expect(sanitizeSvg(svg)).not.toContain('<script>')
      expect(sanitizeSvg(svg)).toContain('<rect/>')
    })

    it('strips multiline <script> blocks', () => {
      const svg = '<svg><script>\nconst x = 1\n</script><circle/></svg>'
      expect(sanitizeSvg(svg)).not.toContain('script')
    })

    it('strips double-quoted on* event attributes', () => {
      const svg = '<svg><circle onclick="evil()" r="5"/></svg>'
      expect(sanitizeSvg(svg)).not.toContain('onclick')
      expect(sanitizeSvg(svg)).toContain('<circle')
    })

    it('strips single-quoted on* event attributes', () => {
      const svg = "<svg><rect onmouseover='bad()'/></svg>"
      expect(sanitizeSvg(svg)).not.toContain('onmouseover')
    })
  })
  ```

- [ ] **Step 2: Run tests — expect them to fail**

  ```bash
  npx vitest run lib/svg/sanitize.test.ts
  ```
  Expected: FAIL — "Cannot find module './sanitize'"

- [ ] **Step 3: Implement the sanitizer**

  Create `lib/svg/sanitize.ts`:
  ```ts
  export function sanitizeSvg(svg: string): string {
    return svg
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/\son\w+="[^"]*"/gi, '')
      .replace(/\son\w+='[^']*'/gi, '')
  }
  ```

- [ ] **Step 4: Run tests — expect them to pass**

  ```bash
  npx vitest run lib/svg/sanitize.test.ts
  ```
  Expected: 5 tests PASS

- [ ] **Step 5: Commit**

  ```bash
  git add lib/svg/sanitize.ts lib/svg/sanitize.test.ts
  git commit -m "feat: add SVG sanitizer utility"
  ```

---

## Task 3: Type updates — schema + Question interface

**Files:**
- Modify: `lib/generation/question-schema.ts` (lines 10–27 and 43–45)
- Modify: `lib/generation/question-schema.test.ts`
- Modify: `lib/practice/question-types.ts` (line 56–67)

- [ ] **Step 1: Add test for image_svg in question-schema.test.ts**

  In `lib/generation/question-schema.test.ts`, add inside the `validateQuestion` describe block:
  ```ts
  it('passes through image_svg when present', () => {
    const q = { ...validQuestion, image_svg: '<svg viewBox="0 0 100 50"><rect/></svg>' }
    const result = validateQuestion(q)
    expect(result.image_svg).toBe('<svg viewBox="0 0 100 50"><rect/></svg>')
  })

  it('normalises missing image_svg to null', () => {
    const result = validateQuestion(validQuestion)  // validQuestion has no image_svg
    expect(result.image_svg).toBeNull()
  })
  ```

- [ ] **Step 2: Run new tests — expect them to fail**

  ```bash
  npx vitest run lib/generation/question-schema.test.ts
  ```
  Expected: the 2 new tests FAIL

- [ ] **Step 3: Update GeneratedQuestion interface and validateQuestion**

  In `lib/generation/question-schema.ts`:

  Add `image_svg?: string | null` to the `GeneratedQuestion` interface after `tier?`:
  ```ts
  export interface GeneratedQuestion {
    grade: number
    subject: string
    topic: string
    subtopic: string
    sol_standard: string
    difficulty: number
    question_text: string
    simplified_text: string | null
    answer_type: string
    choices: { id: string; text: string; is_correct: boolean }[]
    hint_1: string
    hint_2: string
    hint_3: string
    calculator_allowed: boolean
    source: string
    tier?: 'foundational' | 'standard'
    image_svg?: string | null
  }
  ```

  In `validateQuestion`, after the `simplified_text` normalization block, add:
  ```ts
  // image_svg is optional — normalize missing to null
  if (q.image_svg === undefined) {
    (q as Record<string, unknown>).image_svg = null
  }
  ```

- [ ] **Step 4: Add image_svg to Question interface**

  In `lib/practice/question-types.ts`, add to the `Question` interface after `calculator_allowed`:
  ```ts
  export interface Question {
    id: string
    question_text: string
    simplified_text: string | null
    answer_type: AnswerType
    choices: any
    hint_1: string | null
    hint_2: string | null
    hint_3: string | null
    calculator_allowed: boolean
    image_svg: string | null
  }
  ```

- [ ] **Step 5: Run all tests**

  ```bash
  npx vitest run lib/generation/question-schema.test.ts
  ```
  Expected: all tests PASS (the 2 new ones now pass)

- [ ] **Step 6: Commit**

  ```bash
  git add lib/generation/question-schema.ts lib/generation/question-schema.test.ts lib/practice/question-types.ts
  git commit -m "feat: add image_svg to GeneratedQuestion and Question types"
  ```

---

## Task 4: QuestionCard — render SVG

**Files:**
- Modify: `components/practice/question-card.tsx`

The current `QuestionCard` renders: question text → calculator.
After this task: question text → SVG image (if present) → calculator.

- [ ] **Step 1: Update QuestionCard**

  Replace the entire `components/practice/question-card.tsx` with:
  ```tsx
  import { Card, CardContent } from '@/components/ui/card'
  import { OnScreenCalculator } from './on-screen-calculator'
  import { sanitizeSvg } from '@/lib/svg/sanitize'
  import type { Question } from '@/lib/practice/question-types'

  export type { Question }

  interface Props {
    question: Question
    simplified: boolean
    highlightRange?: { start: number; length: number } | null
  }

  function HighlightedText({ text, highlight }: { text: string; highlight?: { start: number; length: number } | null }) {
    if (!highlight) return <>{text}</>
    const { start, length } = highlight
    return (
      <>
        {text.slice(0, start)}
        <mark className="bg-yellow-300 dark:bg-yellow-500/50 rounded px-0.5 not-italic">{text.slice(start, start + length)}</mark>
        {text.slice(start + length)}
      </>
    )
  }

  export function QuestionCard({ question, simplified, highlightRange }: Props) {
    const text = (simplified && question.simplified_text) ? question.simplified_text : question.question_text
    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          <p className="text-lg font-medium leading-relaxed">
            <HighlightedText text={text} highlight={highlightRange} />
          </p>
          {question.image_svg && (
            <div className="flex justify-center">
              <div
                className="max-w-xs w-full rounded border border-border p-2 bg-muted/30"
                dangerouslySetInnerHTML={{ __html: sanitizeSvg(question.image_svg) }}
              />
            </div>
          )}
          <OnScreenCalculator hidden={!question.calculator_allowed} />
        </CardContent>
      </Card>
    )
  }
  ```

- [ ] **Step 2: Run the practice-session tests**

  ```bash
  npx vitest run app/\(practice\)/practice/\[childId\]/practice-session.test.tsx
  ```
  Expected: all existing tests PASS (no image_svg in mock questions → renders as before)

- [ ] **Step 3: Commit**

  ```bash
  git add components/practice/question-card.tsx
  git commit -m "feat: render image_svg in QuestionCard below question text"
  ```

---

## Task 5: Generation prompt + admin PATCH whitelist

**Files:**
- Modify: `lib/generation/generate-topic.ts` (lines 38–62, the JSON example)
- Modify: `app/api/admin/questions/[id]/route.ts` (lines 5–8)

- [ ] **Step 1: Update the generation prompt**

  In `lib/generation/generate-topic.ts`, update the `buildPrompt` function.

  In the Rules block, after the line `- calculator_allowed: true only for Grade 5 multi-step decimal/fraction computation, otherwise false` and before the line `- source: always "ai_generated"`, insert:
  ```
  - image_svg: a compact inline SVG when a visual genuinely helps (fraction diagrams, number lines, geometric shapes, bar/line graphs, coordinate grids, place value blocks); null for text-only questions (word problems, vocabulary, reading comprehension, poetry)
    SVG rules: viewBox-based (e.g. viewBox="0 0 200 100"), no fixed pixel width/height, no <style> tags, no external hrefs, no JavaScript, no on* attributes, monochrome or 2-color max, simple strokes and fills only, target under 1 KB
  ```

  In the JSON schema example (the object inside the `[...]` array), add `"image_svg": null` between `"calculator_allowed"` and `"source"`:
  ```
      "calculator_allowed": false,
      "image_svg": null,
      "source": "ai_generated"
  ```

- [ ] **Step 2: Add `image_svg` to EDITABLE_FIELDS**

  In `app/api/admin/questions/[id]/route.ts`, update lines 5–8:
  ```ts
  const EDITABLE_FIELDS = [
    'question_text', 'simplified_text', 'choices',
    'hint_1', 'hint_2', 'hint_3', 'difficulty', 'calculator_allowed', 'image_svg',
  ] as const
  ```

- [ ] **Step 3: Run the full test suite**

  ```bash
  npx vitest run
  ```
  Expected: all tests PASS

- [ ] **Step 4: Commit**

  ```bash
  git add lib/generation/generate-topic.ts app/api/admin/questions/\[id\]/route.ts
  git commit -m "feat: add image_svg to generation prompt and admin PATCH whitelist"
  ```

---

## Task 6: Admin questions UI — badge + edit

**Files:**
- Modify: `components/admin/published-questions-client.tsx`

Changes:
1. Add `image_svg: string | null` to the local `Question` type (line 8–23)
2. Add an "Image" badge in the collapsed list view (alongside the Foundational badge)
3. Add SVG preview + textarea in edit mode

- [ ] **Step 1: Update the local Question type**

  In `components/admin/published-questions-client.tsx`, add `image_svg` to the local type:
  ```ts
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
    tier: 'foundational' | 'standard'
    image_svg: string | null
  }
  ```

- [ ] **Step 2: Add Image badge in the list view**

  In the collapsed row (non-editing) section, add the image badge alongside the Foundational badge:
  ```tsx
  {q.tier === 'foundational' && (
    <span className="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded shrink-0">Foundational</span>
  )}
  {q.image_svg && (
    <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded shrink-0">Image</span>
  )}
  ```

- [ ] **Step 3: Add SVG preview + textarea in edit mode**

  In the edit view, after the `simplified_text` textarea block (around line 153), add:
  ```tsx
  <div className="mb-3">
    <label className="text-xs font-medium block mb-1">Image SVG</label>
    {(drafts[q.id]?.image_svg ?? q.image_svg) && (
      <div
        className="mb-2 flex justify-center rounded border border-border p-2 bg-muted/30 max-w-xs"
        dangerouslySetInnerHTML={{ __html: String(drafts[q.id]?.image_svg ?? q.image_svg ?? '') }}
      />
    )}
    <textarea
      defaultValue={q.image_svg ?? ''}
      onChange={e => setDrafts(prev => ({ ...prev, [q.id]: { ...prev[q.id], image_svg: e.target.value || null } }))}
      placeholder="Paste SVG markup here, or leave empty for no image"
      className="w-full border rounded px-2 py-1 text-xs font-mono text-muted-foreground bg-background resize-y"
      rows={3}
    />
  </div>
  ```

- [ ] **Step 4: Verify the page compiles**

  ```bash
  npx tsc --noEmit
  ```
  Expected: no TypeScript errors

- [ ] **Step 5: Commit**

  ```bash
  git add components/admin/published-questions-client.tsx
  git commit -m "feat: add image_svg badge and editor to admin questions UI"
  ```

---

## Task 7: Backfill script

**Files:**
- Create: `scripts/generate-images.ts`

This script queries published questions with `image_svg IS NULL`, calls Claude with a focused image-only prompt, and writes the SVG back to the DB.

- [ ] **Step 1: Create the script**

  Create `scripts/generate-images.ts`:
  ```ts
  // scripts/generate-images.ts
  import { config } from 'dotenv'
  import { createClient } from '@supabase/supabase-js'
  import Anthropic from '@anthropic-ai/sdk'

  config({ path: '.env.local', override: true })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  function buildImagePrompt(grade: number, subject: string, questionText: string): string {
    return `Given this practice question for Grade ${grade} ${subject}:
  "${questionText}"

  Return ONLY a compact inline SVG (no markdown, no explanation, no code fences) that visually supports this question, OR return the single word null if no image would help.

  When to return an SVG: fraction diagrams, number lines, geometric shapes, bar or line graphs, coordinate grids, place value blocks, measurement diagrams.
  When to return null: arithmetic word problems, vocabulary, reading comprehension, poetry, anything text-only.

  SVG rules:
  - viewBox-based (e.g. viewBox="0 0 200 100"), no fixed pixel width/height
  - No <style> tags, no external hrefs, no JavaScript, no on* attributes
  - Monochrome or 2-color max; simple strokes and fills only
  - Target under 1 KB`
  }

  async function generateImageForQuestion(id: string, grade: number, subject: string, questionText: string): Promise<string | null> {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: buildImagePrompt(grade, subject, questionText) }],
    })
    const raw = (message.content[0] as { type: string; text: string }).text.trim()
    if (raw.toLowerCase() === 'null') return null
    // Strip accidental code fences
    return raw.startsWith('```') ? raw.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '') : raw
  }

  async function main() {
    const args = process.argv.slice(2)
    const dryRun = args.includes('--dry-run')
    const regenerate = args.includes('--regenerate')
    const gradeArg = args.find(a => a.startsWith('--grade='))?.split('=')[1]
    const subjectArg = args.find(a => a.startsWith('--subject='))?.split('=')[1]
    const topicArg = args.find(a => a.startsWith('--topic='))?.split('=')[1]

    let query = supabase.from('questions').select('id, grade, subject, topic, question_text')
    if (!regenerate) query = query.is('image_svg', null)
    if (gradeArg) query = query.eq('grade', parseInt(gradeArg))
    if (subjectArg) query = query.eq('subject', subjectArg)
    if (topicArg) query = query.eq('topic', topicArg)

    const { data: questions, error } = await query.order('grade').order('subject').order('topic')
    if (error) { console.error('Query failed:', error.message); process.exit(1) }
    if (!questions || questions.length === 0) { console.log('No questions to process.'); return }

    console.log(`Processing ${questions.length} questions${dryRun ? ' (dry run)' : ''}...`)

    for (const q of questions) {
      if (dryRun) {
        console.log(`  – ${q.id} [${q.grade} ${q.subject} / ${q.topic}] would be processed`)
        continue
      }
      try {
        const svg = await generateImageForQuestion(q.id, q.grade, q.subject, q.question_text)
        if (svg === null) {
          console.log(`  – ${q.id} — skipped (null)`)
        } else {
          await supabase.from('questions').update({ image_svg: svg }).eq('id', q.id)
          console.log(`  ✓ ${q.id} — SVG generated (${svg.length} chars)`)
        }
        await new Promise(r => setTimeout(r, 500))
      } catch (e) {
        console.error(`  ✗ ${q.id} — ${(e as Error).message}`)
      }
    }
    console.log('\nDone.')
  }

  main().catch(e => { console.error(e); process.exit(1) })
  ```

- [ ] **Step 2: Smoke test with dry-run**

  ```bash
  npx tsx scripts/generate-images.ts --dry-run --grade=3 --subject=math --topic=fractions
  ```
  Expected: prints a list of question IDs that would be processed, no DB writes, no API calls.

- [ ] **Step 3: Run for a small subset to verify end-to-end**

  ```bash
  npx tsx scripts/generate-images.ts --grade=3 --subject=math --topic=fractions
  ```
  Expected: prints `✓ <id> — SVG generated` or `– <id> — skipped (null)` for each fractions question. Check one ID in Supabase Studio or with:
  ```bash
  npx supabase db query --local "SELECT id, LEFT(image_svg, 60) FROM questions WHERE topic = 'fractions' AND image_svg IS NOT NULL LIMIT 3;"
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add scripts/generate-images.ts
  git commit -m "feat: add generate-images backfill script for question SVGs"
  ```

---

## Task 8: Full test pass + run all tests

- [ ] **Step 1: Run complete test suite**

  ```bash
  npx vitest run
  ```
  Expected: all tests PASS. Note the count — it should be at least the previous count + 7 new tests (5 sanitizer + 2 schema).

- [ ] **Step 2: TypeScript check**

  ```bash
  npx tsc --noEmit
  ```
  Expected: no errors

- [ ] **Step 3: Seed the DB if needed**

  Only needed if you ran `db reset` in Task 1 and haven't re-seeded since. Check first:
  ```bash
  npx supabase db query --local "SELECT COUNT(*) FROM questions;"
  ```
  If count is 0, re-seed:
  ```bash
  npx tsx scripts/db-seed.ts
  ```

- [ ] **Step 4: Final commit if anything was missed**

  ```bash
  git status
  ```
  If any files are untracked or modified, add and commit them now.
