# Parent Dashboard — Language Level Progression Design

**Date:** 2026-03-24

## Goal

Surface the existing `child_topic_levels` language-level progression system (simplified → standard) in the parent dashboard so parents can see current levels per topic and celebrate (or respond to) level changes.

## Context

The app already tracks per-child, per-topic language levels in the `child_topic_levels` table. The `bumpTopicLevelIfEarned` function promotes a child to 'standard' after 2 sessions ≥ 80% accuracy and demotes back to 'simplified' if accuracy drops below 50% at standard. This data is consumed server-side only — parents currently have no visibility into it.

---

## Schema Change

New migration `0008_topic_level_change_tracking.sql` adds two nullable columns to `child_topic_levels`:

```sql
ALTER TABLE child_topic_levels
  ADD COLUMN previous_level text
    CHECK (previous_level IN ('simplified', 'standard')),
  ADD COLUMN changed_at timestamptz;
```

- Both columns are `NULL` for topics that have never changed level.
- `previous_level` stores the level **before** the most recent change (not the current one).
- `changed_at` is set to `now()` whenever a promotion or demotion fires.
- Increment-only upserts (no level change) leave both columns untouched.

---

## Backend

### `bumpTopicLevelIfEarned` update (`lib/supabase/queries.ts`)

When a level change fires (promote or demote), the upsert payload gains two fields:

```ts
// Promotion
{ language_level: 'standard', previous_level: 'simplified', changed_at: new Date().toISOString(), sessions_at_level: 0 }

// Demotion
{ language_level: 'simplified', previous_level: 'standard', changed_at: new Date().toISOString(), sessions_at_level: 0 }
```

Increment-only upserts (no level change) omit `previous_level` and `changed_at`.

### New `getRecentMilestones` query (`lib/supabase/queries.ts`)

```ts
type Milestone = {
  subject: string
  topic: string
  fromLevel: 'simplified' | 'standard'
  toLevel: 'simplified' | 'standard'
  changedAt: string
  direction: 'promoted' | 'demoted'
}

async function getRecentMilestones(
  supabase: SupabaseClient,
  childId: string
): Promise<Milestone[]>
```

- Queries `child_topic_levels` for rows where `changed_at >= now() - interval '30 days'` and `previous_level IS NOT NULL`.
- Returns results sorted newest-first.
- Returns `[]` if no changes in the last 30 days.

### `getChildTopicLevels` — no change

Already returns `Record<string, 'simplified' | 'standard'>` for all topics of a given subject. Reused as-is for the per-topic badge display. Called without subject filter from the dashboard to get levels across all subjects.

---

## Dashboard Page (`app/(parent)/dashboard/page.tsx`)

Two new parallel fetches for the selected child:

```ts
const [milestones, topicLevels] = await Promise.all([
  getRecentMilestones(supabase, childId),
  getAllChildTopicLevels(supabase, childId),  // new variant, no subject filter
])
```

Both are passed as props to the components below.

---

## UI Components

### New: `components/dashboard/milestones-card.tsx`

Placed between the stats grid and the weak-areas callout.

**Populated state:**
```
┌─ Recent Milestones ──────────────────────────────────────┐
│  🎉  Fractions (math)   simplified → standard   2 days ago │
│  ⚠️   Division (math)    standard → simplified   5 days ago │
└─────────────────────────────────────────────────────────────┘
```

- Promotion rows: green-tinted background, 🎉 icon.
- Demotion rows: amber-tinted background, ⚠️ icon.
- Topic name includes subject in parentheses (since child may practice both math and reading).
- Relative timestamps computed with plain JS (`Date.now() - changedAt`), no extra library.
- Card is hidden entirely when `milestones.length === 0` (no clutter for new users).

### Modified: `components/dashboard/progress-chart.tsx`

Receives `topicLevels: Record<string, 'simplified' | 'standard'>` as a new prop. Each topic row gains a small badge after the topic name:

```
Fractions   ████████░░  82%   [STANDARD]
Division    ████░░░░░░  41%   [simplified]
Decimals    ██████░░░░  61%
```

- `STANDARD` badge: green background, white text.
- `simplified` badge: neutral/gray background, muted text.
- Topics with no entry in `topicLevels` (never triggered a level bump) show no badge — no false signal.

---

## Files

| Action | File | Purpose |
|--------|------|---------|
| Create | `supabase/migrations/0008_topic_level_change_tracking.sql` | Add `previous_level`, `changed_at` columns |
| Modify | `lib/supabase/queries.ts` | Update `bumpTopicLevelIfEarned`; add `getRecentMilestones`; add `getAllChildTopicLevels` |
| Modify | `lib/supabase/queries.test.ts` | Tests for updated function and new queries |
| Modify | `app/(parent)/dashboard/page.tsx` | Fetch milestones + topic levels; pass to components |
| Create | `components/dashboard/milestones-card.tsx` | New milestones card component |
| Modify | `components/dashboard/progress-chart.tsx` | Add language level badge per topic |

---

## Error Handling

- If `getRecentMilestones` or `getAllChildTopicLevels` fails, the dashboard degrades gracefully — milestones card is not rendered and badges are omitted. Core accuracy data is unaffected.
- Both new Supabase calls are covered by existing RLS: parents can only read their own children's records.

## Testing

- Unit tests for `getRecentMilestones`: returns empty array when no changes, returns correct direction/fields when data present.
- Unit tests for updated `bumpTopicLevelIfEarned`: promotion sets `previous_level = 'simplified'` and `changed_at`; demotion sets `previous_level = 'standard'` and `changed_at`; increment-only path does not set either.
- No new E2E tests — dashboard rendering is covered by manual QA.
