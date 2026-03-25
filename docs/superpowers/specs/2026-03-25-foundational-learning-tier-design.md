# Foundational Learning Tier Design

**Date:** 2026-03-25

## Goal

Add a "foundational" question tier below the existing simplified level to support children with special needs. Parents set a child to foundational per subject; the system suggests promotion after consistent strong performance; parents confirm before the child advances.

## Context

The app currently has a two-tier language progression per child per topic:

- `simplified` — questions show `simplified_text`, serving as the default starting level
- `standard` — questions show `question_text`, unlocked after 2 sessions at ≥ 80% accuracy

Both tiers draw from the same `questions` table. Advancement is automatic via `bumpTopicLevelIfEarned` in `lib/supabase/queries.ts`.

Some children with special needs struggle even at the simplified level. This feature introduces a third tier — `foundational` — with AI-generated questions using much simpler language (short sentences, single concept, Grade 1–2 vocabulary, concrete scenarios). The SOL standard and answer format (multiple choice, true/false, etc.) remain the same.

**Dependencies:** This feature depends on QG-1 (admin question management) being deployed first, which provides `lib/curriculum/sol-curriculum.ts` (used here to enumerate topics for bulk-set operations).

---

## Schema Changes

### Migration `0013_foundational_tier.sql`

```sql
-- Add tier to questions table
ALTER TABLE questions
  ADD COLUMN tier text NOT NULL DEFAULT 'standard'
    CHECK (tier IN ('foundational', 'standard'));

-- Extend language_level check on child_topic_levels
ALTER TABLE child_topic_levels
  DROP CONSTRAINT child_topic_levels_language_level_check;

ALTER TABLE child_topic_levels
  ADD CONSTRAINT child_topic_levels_language_level_check
    CHECK (language_level IN ('foundational', 'simplified', 'standard'));

-- Add promotion_ready flag
ALTER TABLE child_topic_levels
  ADD COLUMN promotion_ready boolean NOT NULL DEFAULT false;
```

**Existing rows:** All existing `questions` rows default to `tier = 'standard'`. All existing `child_topic_levels` rows default to `promotion_ready = false`. No data migration needed.

---

## Foundational Question Generation

### `lib/generation/generate-topic.ts` (modify)

Add an optional `tier: 'foundational' | 'standard'` parameter (default `'standard'`). When `'foundational'`, the Claude prompt is prefixed with additional instructions:

- Sentences must be 10 words or fewer
- One concept per question — no compound ideas
- Use Grade 1–2 vocabulary only
- Use concrete, relatable, everyday scenarios
- Do not populate `simplified_text` — the field must be `null` for foundational questions; the foundational `question_text` is already the simplest form

The SOL standard, subject, topic, grade, answer format, and choices structure are unchanged.

### Admin generate form — `components/admin/generate-review-client.tsx` (modify)

Add a **Tier** selector (Standard / Foundational) to the generation controls. Defaults to Standard. When Foundational is selected, the `POST /api/admin/generate` request body includes `{ tier: 'foundational' }`.

### `app/api/admin/generate/route.ts` (modify)

Accept optional `tier` in the request body (default `'standard'`). Pass `tier` to `generateTopic`. On bulk insert into `questions_pending`, include `tier` in each row. On approve, `tier` propagates from `questions_pending` to `questions`.

**Note:** The `questions_pending` table created in QG-1 does not have a `tier` column. Migration `0013` must also add it:

```sql
ALTER TABLE questions_pending
  ADD COLUMN tier text NOT NULL DEFAULT 'standard'
    CHECK (tier IN ('foundational', 'standard'));
```

---

## Question Serving

### `lib/supabase/queries.ts` — `getQuestionsForSession` (modify)

Extend the `languageLevel` parameter type from `'simplified' | 'standard'` to `'foundational' | 'simplified' | 'standard'`.

When `languageLevel === 'foundational'`: filter `.eq('tier', 'foundational')`. No `simplified_text` filter is applied (foundational questions have `simplified_text = NULL`).

When `languageLevel === 'simplified'` or `'standard'`: filter `.eq('tier', 'standard')` (existing behaviour preserved). The fallback unrestricted query also adds `.eq('tier', 'standard')` to prevent foundational questions leaking into standard sessions.

### `lib/supabase/queries.ts` — `getChildTopicLevels` and `getAllChildTopicLevels` (modify)

Extend return type from `Record<string, 'simplified' | 'standard'>` to `Record<string, 'foundational' | 'simplified' | 'standard'>`.

### `lib/supabase/queries.ts` — `Milestone` type (modify)

Extend `fromLevel` and `toLevel` to include `'foundational'`. Update `direction` logic: `'foundational' → 'simplified'` is `promoted`; `'simplified' → 'foundational'` is `demoted`.

### `app/api/questions/route.ts` (modify)

Extend the dominant-level derivation to handle three tiers. New logic:

```ts
type LanguageLevel = 'foundational' | 'simplified' | 'standard'
let languageLevel: LanguageLevel = 'simplified'
if (childId) {
  const topicLevels = await getChildTopicLevels(supabase, childId, subject)
  const levels = Object.values(topicLevels)
  if (levels.length > 0) {
    const foundationalCount = levels.filter((l) => l === 'foundational').length
    const standardCount = levels.filter((l) => l === 'standard').length
    if (foundationalCount > levels.length / 2) languageLevel = 'foundational'
    else if (standardCount > levels.length / 2) languageLevel = 'standard'
    // else: simplified (default)
  }
}
```

---

## Progress Tracking

### `lib/supabase/queries.ts` — `bumpTopicLevelIfEarned` (modify)

Extend to handle the `foundational` level. Key difference from `simplified → standard`: foundational advancement requires parent confirmation — the function never directly advances from `foundational` to `simplified`. Instead it sets `promotion_ready = true`.

New behaviour at `foundational` level:
- Accuracy ≥ 80%: increment `sessions_at_level`. When `sessions_at_level` reaches 3, set `promotion_ready = true` (do not change `language_level`).
- Accuracy < 50%: no demotion — parents chose foundational intentionally; only they can change it.
- 50–79%: no change.

Existing `simplified → standard` auto-promotion logic is unchanged.

---

## API Routes

All new routes verify the child belongs to the authenticated parent before acting.

### `POST /api/children/[id]/learning-level`

**Body:** `{ subject: string, tier: 'foundational' | 'simplified' }`

Sets all topics for the given subject/grade to the specified language level. Uses `SOL_CURRICULUM` from `lib/curriculum/sol-curriculum.ts` to enumerate all topics for the child's grade + subject. Bulk-upserts `child_topic_levels` rows with `language_level = tier`, `sessions_at_level = 0`, `promotion_ready = false`.

Setting `tier = 'simplified'` resets the subject out of foundational (parent removes the accommodation).

Returns 200 with `{ updated: number }` (count of topics upserted).

### `POST /api/children/[id]/promote`

**Body:** `{ subject: string, action: 'confirm' | 'dismiss' }`

**confirm:** For all `child_topic_levels` rows where `child_id = id`, `subject = subject`, and `promotion_ready = true` — advance `language_level` one tier (`foundational → simplified` or `simplified → standard`), set `sessions_at_level = 0`, set `promotion_ready = false`. Records `previous_level` and `changed_at` for milestone tracking.

**dismiss:** For all matching `promotion_ready = true` rows — set `promotion_ready = false`, `sessions_at_level = 0` (threshold resets; child must earn it again). Does not change `language_level`.

Returns 200 with `{ affected: number }`.

Returns 409 if no `promotion_ready = true` rows exist for that subject.

---

## Parent UX

### Child Edit Page — `app/(parent)/children/[childId]/edit/page.tsx` (modify)

Add a "Learning Level" section below accommodations. The section shows one row per subject (Math, Reading). Each row displays:

- Current level for the subject (derived as the most common `language_level` across that subject's topics — or "Mixed" if split)
- If not foundational: a **"Set to Foundational"** button
- If foundational: a **"Remove Foundational"** button (resets to simplified)
- If any topic in the subject has `promotion_ready = true`: a **"Ready to move up →"** badge with a **Promote** and **Not yet** button

The edit page fetches `child_topic_levels` for the child on load (new fetch alongside the existing children fetch). Buttons call `POST /api/children/[id]/learning-level` and `POST /api/children/[id]/promote` respectively.

### Dashboard — `app/(parent)/dashboard/page.tsx` (modify)

Add a query for promotion-ready topics across all children:

```ts
const { data: promotionReady } = await supabase
  .from('child_topic_levels')
  .select('child_id, subject, language_level')
  .in('child_id', children.map((c) => c.id))
  .eq('promotion_ready', true)
```

If any rows are found, render a `<PromotionBanner>` component above the child selector.

### `components/dashboard/promotion-banner.tsx` (create)

Dismissible banner. Shows one entry per (child, subject) pair that has promotion-ready topics. Example: *"Emma is ready to move up in Math — she's been scoring well at the foundational level."* Each entry has **Promote** and **Not yet** buttons calling `POST /api/children/[id]/promote`.

After confirming or dismissing, the banner entry disappears (optimistic removal from local state).

---

## Error Handling

| Scenario | Behaviour |
|----------|-----------|
| `POST /api/children/[id]/learning-level` for unknown subject | 400 `{ error: 'unknown_subject' }` |
| `POST /api/children/[id]/promote` with no promotion-ready rows | 409 `{ error: 'not_ready' }` |
| Child does not belong to authenticated parent | 404 on all child routes |
| No foundational questions exist for a grade/subject | Session serves an empty set; client shows "No questions available" (existing fallback behaviour) |
| Foundational questions not yet generated for a topic | Same as above — existing empty-pool fallback |

---

## Testing

- **Unit:** `bumpTopicLevelIfEarned` — assert `promotion_ready = true` is set after 3 sessions at ≥ 80% at foundational; assert `language_level` is NOT changed; assert no demotion below foundational
- **Unit:** `getQuestionsForSession` — assert `tier = 'foundational'` filter applied when `languageLevel = 'foundational'`; assert `tier = 'standard'` filter applied for simplified/standard
- **API:** `POST /api/children/[id]/learning-level` — assert all topics for subject upserted to foundational; assert 404 for wrong child; assert 400 for unknown subject
- **API:** `POST /api/children/[id]/promote` (confirm) — assert language_level advanced one tier, sessions_at_level reset, promotion_ready cleared
- **API:** `POST /api/children/[id]/promote` (dismiss) — assert promotion_ready cleared, sessions_at_level reset, language_level unchanged; assert 409 when no rows are promotion-ready
- **API:** `GET /api/questions` — assert foundational tier questions returned for a child at foundational level
- **No component tests** — manual QA sufficient for parent UI

---

## Files

| Action | File | Purpose |
|--------|------|---------|
| Create | `supabase/migrations/0013_foundational_tier.sql` | Add `tier` to `questions` + `questions_pending`; extend `language_level` CHECK; add `promotion_ready` to `child_topic_levels` |
| Modify | `lib/generation/generate-topic.ts` | Accept optional `tier` param; use foundational prompt when `tier = 'foundational'` |
| Modify | `components/admin/generate-review-client.tsx` | Add Tier selector to generate form |
| Modify | `app/api/admin/generate/route.ts` | Pass `tier` through to `questions_pending` insert |
| Modify | `lib/supabase/queries.ts` | Extend `getQuestionsForSession`, `getChildTopicLevels`, `getAllChildTopicLevels`, `Milestone` type, `bumpTopicLevelIfEarned` for foundational tier |
| Modify | `app/api/questions/route.ts` | Extend dominant-level derivation for three tiers |
| Create | `app/api/children/[id]/learning-level/route.ts` | Bulk-set all topics for a subject to a given tier |
| Create | `app/api/children/[id]/promote/route.ts` | Confirm or dismiss promotion for a subject |
| Modify | `app/(parent)/children/[childId]/edit/page.tsx` | Add Learning Level section with foundational toggle and promotion confirm |
| Modify | `app/(parent)/dashboard/page.tsx` | Query promotion-ready rows across all children; render PromotionBanner |
| Create | `components/dashboard/promotion-banner.tsx` | Dismissible promotion suggestion banner |
| Create | `lib/supabase/queries.test.ts` additions | Unit tests for foundational tier in `bumpTopicLevelIfEarned` and `getQuestionsForSession` |
| Create | `app/api/children/[id]/learning-level/route.test.ts` | API tests for learning-level route |
| Create | `app/api/children/[id]/promote/route.test.ts` | API tests for promote route |
| Create | `app/api/questions/route.test.ts` additions | API test for foundational tier question serving |
