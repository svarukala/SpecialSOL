# Plan: VA SOL Released Tests → SolPrep Questions

## What we're working with

VDOE publishes released SOL tests as **PDFs** on [scorecard.doe.virginia.gov](https://www.scorecard.doe.virginia.gov/testing/sol/released_tests/index.shtml) and aggregated on [solpass.org](https://www.solpass.org/released.php). Available years vary by grade/subject — roughly 2010–2024.

The database already has `source = 'doe_released' | 'ai_generated'` in both `questions` and `questions_pending`. The infrastructure is half-built.

### Key challenges
- PDFs are **mixed** — some are text-selectable, others are scanned images
- **Reading tests have passages** — 2–4 passages per test, each with 8–12 questions (schema has no concept of a passage yet)
- **Math has diagrams** — graphs, number lines, geometric figures (need image handling)
- Older tests reference **prior SOL standards** — some questions won't align to current 2023 standards
- Answer keys are sometimes **embedded**, sometimes a **separate PDF**

---

## Phase 1 — Discovery & Download Script
*New script: `scripts/download-sol-tests.ts`*

Crawl the VDOE released tests index, find all PDFs for grades 3–8, Math and Reading, for all available years. Download and organize locally:

```
data/sol-pdfs/
  grade-3/math/2022-spring.pdf
  grade-3/math/2019-spring.pdf
  grade-3/reading/2022-spring.pdf
  ...
```

Also download any separate answer key PDFs. Idempotent — skip already-downloaded files.

**Output:** ~60–100 PDFs covering grades 3–8, both subjects, multiple years.

---

## Phase 2 — PDF Extraction Pipeline
*New script: `scripts/extract-sol-questions.ts`*

Two-pass strategy:

**Pass A — Text extraction** (`pdf-parse` npm package)
For text-selectable PDFs: parse question number, question text, A/B/C/D choices, and match against the answer key. Fast and cheap.

**Pass B — AI vision fallback** (Claude API with `image` content blocks)
For scanned/image PDFs or questions with diagrams: send page images to Claude and prompt it to return structured JSON:
```json
{
  "question_text": "...",
  "choices": [{"id":"A","text":"...","is_correct":false}, ...],
  "has_diagram": true,
  "diagram_description": "...",
  "sol_standard": "3.2a",
  "calculator_allowed": false
}
```

**Reading passages** — extracted as a block, stored in a new `passage` field (see Phase 3 schema change), then linked to all questions that reference it.

**Output:** Structured JSON per grade/subject/year, ready for import.

---

## Phase 3 — Schema Changes
*New migration: `0015_sol_source_enhancements.sql`*

```sql
-- Track which year's released test a question came from
ALTER TABLE questions ADD COLUMN source_year int;        -- e.g. 2022
ALTER TABLE questions ADD COLUMN source_test text;       -- e.g. "Spring 2022 Grade 4 Math"

-- Reading passage support
ALTER TABLE questions ADD COLUMN reading_passage text;   -- full passage text, nullable
                                                         -- same passage repeated across
                                                         -- all questions that reference it

-- Same additions to questions_pending
ALTER TABLE questions_pending ADD COLUMN source_year int;
ALTER TABLE questions_pending ADD COLUMN source_test text;
ALTER TABLE questions_pending ADD COLUMN reading_passage text;
```

Also add `source` to the TypeScript `Question` interface in `lib/practice/question-types.ts`:
```ts
source: 'doe_released' | 'ai_generated'
source_year?: number
```

---

## Phase 4 — Import & Review Script
*New script: `scripts/import-sol-questions.ts`*

1. Deduplicate against existing questions (fuzzy match on `question_text`)
2. Map extracted data to schema fields (`grade`, `subject`, `topic`, `difficulty`, `sol_standard`)
3. Set `source = 'doe_released'`, `source_year`, `source_test`
4. Insert into `questions_pending` with `status = 'pending'` for admin review
5. Log summary: `X new, Y duplicates skipped, Z flagged for manual review`

The existing admin approve workflow handles the rest — no new review UI needed.

---

## Phase 5 — Session Source Preference

Add a collapsible "Advanced" option in `SubjectModePicker` — defaults to "All questions":
- **All** (default)
- **VA SOL Released Years** — only `doe_released`
- **AI Generated** — only `ai_generated`

Preference passed to `/api/questions` as a new `source` query param and applied in `getQuestionsForSession()`. Stored as a session-level choice (not saved to child profile).

---

## Phase 6 — Subtle Question Label

In `QuestionCard`, add a small source badge in the top-right corner:

| Source | Badge |
|--------|-------|
| `doe_released` | `SOL Released · 2022` (muted blue pill) |
| `ai_generated` | `AI Generated` (muted gray pill) |

Parents can toggle badge visibility in settings if distracting during a session.

---

## Phase 7 — Reading Passage Display

When `reading_passage` is present, `QuestionCard` shows the passage in a scrollable panel above the question — matching real SOL test layout. Passage text respects simplified/bionic reading accommodations.

---

## Suggested Build Order

| Step | Effort | Unlocks |
|------|--------|---------|
| 1. Download script | Small | Real PDFs to work with |
| 2. PDF extractor (text pass) | Medium | Bulk of text-based questions |
| 3. Schema migration | Small | Source year, passage field |
| 4. AI vision pass | Medium | Image-heavy PDFs, diagrams |
| 5. Import + dedup script | Medium | Questions into pending queue |
| 6. Source filter in API + picker | Small | Parent can choose source |
| 7. Question badge in card | Small | Visible labeling |
| 8. Reading passage display | Medium | Full reading test support |

## Biggest Risk

PDF quality from older tests (pre-2015 may be scanned images). **Mitigation:** prioritize 2019–2024 tests first — these are fully digital and text-selectable.

## Legal Note

VA DOE released tests are published for public use — no copyright concerns for educational use.

## References
- [Released Tests & Item Sets — VDOE](https://www.doe.virginia.gov/teaching-learning-assessment/student-assessment/sol-practice-items-all-subjects/released-tests-item-sets-all-subjects)
- [SOLPass Released Tests](https://www.solpass.org/released.php)
- [VDOE Scorecard Released Tests Index](https://www.scorecard.doe.virginia.gov/testing/sol/released_tests/index.shtml)
