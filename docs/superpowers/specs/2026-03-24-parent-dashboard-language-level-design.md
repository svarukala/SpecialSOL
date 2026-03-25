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
  ADD COLUMN changed_at timestamptz,
  ADD CONSTRAINT topic_level_change_columns_consistent
    CHECK (
      (previous_level IS NULL AND changed_at IS NULL) OR
      (previous_level IS NOT NULL AND changed_at IS NOT NULL)
    );
```

- Both columns are `NULL` for topics that have never changed level.
- PostgreSQL `CHECK` constraints pass for `NULL` values, so existing rows are unaffected.
- `previous_level` stores the level **before** the most recent change (not the current one).
- `changed_at` is set to `now()` whenever a promotion or demotion fires.
- Increment-only upserts (no level change) leave both columns untouched.

---

## Backend

### `bumpTopicLevelIfEarned` update (`lib/supabase/queries.ts`)

The existing code has five paths — three that upsert and two intentional no-ops. **Preserve all five paths.** Only add `previous_level` / `changed_at` to the three upsert paths using a conditional spread. Do not consolidate into a single upsert; the no-op paths must remain no-ops:

```
accuracy >= 0.8 && current == 'simplified' && sessions >= 2  → PROMOTE  (upsert + changeFields)
accuracy >= 0.8 && current == 'simplified' && sessions < 2   → INCREMENT (upsert, no changeFields)
accuracy >= 0.8 && current == 'standard'                     → NO-OP    (do nothing — preserve this)
accuracy < 0.5  && current == 'standard'                     → DEMOTE   (upsert + changeFields)
50% ≤ accuracy < 80%                                          → NO-OP    (do nothing — preserve this)
```

For the three upsert paths, use a conditional spread so absent keys are never set to `undefined` (Supabase serialises `undefined` as `null`, overwriting existing history):

```ts
const now = new Date().toISOString()

// Promote
await supabase.from('child_topic_levels').upsert({
  child_id: childId, subject, topic,
  language_level: 'standard', sessions_at_level: 0, updated_at: now,
  ...{ previous_level: 'simplified', changed_at: now },
}, { onConflict: 'child_id,subject,topic' })

// Increment (still working toward promotion)
await supabase.from('child_topic_levels').upsert({
  child_id: childId, subject, topic,
  language_level: 'simplified', sessions_at_level: newSessionsAtLevel, updated_at: now,
  // no previous_level / changed_at — not a level change
}, { onConflict: 'child_id,subject,topic' })

// Demote
await supabase.from('child_topic_levels').upsert({
  child_id: childId, subject, topic,
  language_level: 'simplified', sessions_at_level: 0, updated_at: now,
  ...{ previous_level: 'standard', changed_at: now },
}, { onConflict: 'child_id,subject,topic' })
```

No change to the existing `SELECT` (`topic, language_level, sessions_at_level`). The new columns are write-only from this function's perspective.

### New `getAllChildTopicLevels` query (`lib/supabase/queries.ts`)

A variant of `getChildTopicLevels` without the subject filter, for use in the dashboard where topics from all subjects are displayed together.

```ts
async function getAllChildTopicLevels(
  supabase: SupabaseClient,
  childId: string
): Promise<Record<string, 'simplified' | 'standard'>>
```

- Selects `topic, language_level` from `child_topic_levels` where `child_id = childId`.
- Returns a flat `Record<string, 'simplified' | 'standard'>` keyed by topic name alone.
- If two subjects share a topic name (e.g., "reading" in both), the last row returned wins. This is acceptable: the dashboard progress chart already uses a flat topic list with no subject disambiguation.
- Returns `{}` if no rows exist or on DB error (do not throw — mirror the pattern of `getChildTopicLevels`).
- Note: this query intentionally omits `subject` — the flat topic key is sufficient for badge display. `getRecentMilestones` is the only query that selects `subject` (needed for the milestones card label).
- **Known constraint:** if a child has a topic with the same name in both math and reading (unlikely but possible), the last row returned wins and one level is silently dropped. This is acceptable — the `ProgressChart` already uses a flat topic list with no subject field, so subject-scoped badge display is out of scope for this feature.

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

Implementation:
```ts
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

const { data } = await supabase
  .from('child_topic_levels')
  .select('subject, topic, language_level, previous_level, changed_at')
  .eq('child_id', childId)
  .not('previous_level', 'is', null)
  .gte('changed_at', thirtyDaysAgo)
  .order('changed_at', { ascending: false })
  .limit(10)  // safety cap; not expected to be hit given the 2-session promotion threshold
```

Map each row to a `Milestone`:
- `fromLevel` = `previous_level`
- `toLevel` = `language_level`
- `direction` = `toLevel === 'standard' ? 'promoted' : 'demoted'`

Returns `[]` on error or no results.

---

## Dashboard Page (`app/(parent)/dashboard/page.tsx`)

After the existing session/answer fetches (which depend on `childId` resolution), add two new parallel fetches:

```ts
const [milestones, topicLevels] = await Promise.all([
  getRecentMilestones(supabase, childId).catch(() => [] as Milestone[]),
  getAllChildTopicLevels(supabase, childId).catch(() => ({} as Record<string, 'simplified' | 'standard'>)),
])
```

Error fallback is explicit: both default to empty (array or object) so the dashboard renders normally if either call fails. Both are passed as props to the components below.

The new `Promise.all` is independent of the existing session/answer fetches and runs after `childId` is resolved. No refactoring of existing fetches is needed.

---

## UI Components

### New: `components/dashboard/milestones-card.tsx`

Insert between the closing `</div>` of the 3-stat grid (line 110) and `<WeakAreasCallout>` (line 111) in `dashboard/page.tsx`. The resulting order is:

```tsx
{/* stats grid */}
<div className="grid grid-cols-3 gap-4"> ... </div>

{/* NEW — milestones card */}
<MilestonesCard milestones={milestones} />

<WeakAreasCallout topics={weakTopics} childName={activeChild.name} />
<div>
  <h2 className="font-semibold mb-3">Progress by Topic</h2>
  <ProgressChart topics={topicList} topicLevels={topicLevels} />
</div>
```

`MilestonesCard` is a bare self-contained element — no wrapper div needed at the call site. It renders its own card chrome and heading internally.

**Important:** the existing `<ProgressChart topics={topicList} />` call on line 114 must be updated to `<ProgressChart topics={topicList} topicLevels={topicLevels} />`. Without this update the `topicLevels` prop defaults to `{}` and badges silently do not appear.

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
- Relative timestamps computed with plain JS (`Date.now() - new Date(changedAt).getTime()`), no extra library.
- Card is hidden entirely when `milestones.length === 0` — no clutter for new users.

### Modified: `components/dashboard/progress-chart.tsx`

Receives `topicLevels: Record<string, 'simplified' | 'standard'>` as a new optional prop (defaults to `{}`). Each topic row gains a small badge after the topic name:

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
| Create | `components/dashboard/milestones-card.test.tsx` | Component tests for MilestonesCard |
| Modify | `components/dashboard/progress-chart.tsx` | Add language level badge per topic |

---

## Error Handling

- Both new Supabase calls use `.catch(() => fallback)` in the dashboard page, so a failure returns an empty array/object and the dashboard renders without milestones or badges.
- Core accuracy/session data is completely unaffected by failures in these new calls.
- Both new calls are covered by existing RLS: parents can only read their own children's records.

## Testing

- Unit tests for `getRecentMilestones`: returns `[]` when no changes in window, returns correct `direction`/`fromLevel`/`toLevel` fields when data present, returns `[]` on DB error.
- Unit tests for `getAllChildTopicLevels`: returns `{}` when no rows, returns flat record keyed by topic.
- Unit tests for updated `bumpTopicLevelIfEarned`: promotion upsert includes `previous_level: 'simplified'`, `changed_at`, and `updated_at`; demotion upsert includes `previous_level: 'standard'`, `changed_at`, and `updated_at`; increment-only path omits `previous_level` and `changed_at`.
- Component tests for `MilestonesCard` in `components/dashboard/milestones-card.test.tsx`: verify promotion/demotion row rendering, relative timestamp output, and empty-array → hidden card behaviour.
- No new E2E tests — dashboard rendering is covered by manual QA.
