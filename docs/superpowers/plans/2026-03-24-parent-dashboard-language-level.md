# Parent Dashboard Language Level Progression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface per-topic language level progression (simplified → standard) in the parent dashboard via a new "Recent Milestones" card and per-topic badges on the progress chart.

**Architecture:** New DB migration adds `previous_level` + `changed_at` columns to `child_topic_levels`. Two new query functions (`getAllChildTopicLevels`, `getRecentMilestones`) are added to `lib/supabase/queries.ts`. `bumpTopicLevelIfEarned` is updated to write these columns on level changes. The dashboard page fetches both datasets and passes them to a new `MilestonesCard` component and the updated `ProgressChart`.

**Tech Stack:** TypeScript, Next.js 16 App Router (Server Components), Supabase JS client, Vitest, React Testing Library, shadcn/ui (`Card`, `CardContent`), Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-03-24-parent-dashboard-language-level-design.md`

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Create | `supabase/migrations/0008_topic_level_change_tracking.sql` | Add `previous_level`, `changed_at` columns + consistency constraint |
| Modify | `lib/supabase/queries.ts` | Update `bumpTopicLevelIfEarned`; export `getAllChildTopicLevels`, `getRecentMilestones`, `Milestone` type |
| Modify | `lib/supabase/queries.test.ts` | Add tests for new/updated query functions |
| Create | `components/dashboard/milestones-card.tsx` | New self-contained milestones card component |
| Create | `components/dashboard/milestones-card.test.tsx` | Component + helper tests |
| Modify | `components/dashboard/progress-chart.tsx` | Add optional `topicLevels` prop; render badge per topic |
| Modify | `app/(parent)/dashboard/page.tsx` | Import new functions/component; fetch + pass new props |

---

## Task 1: DB Migration — add `previous_level` and `changed_at`

**Files:**
- Create: `supabase/migrations/0008_topic_level_change_tracking.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/0008_topic_level_change_tracking.sql
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

- [ ] **Step 2: Apply the migration**

Run: `npx supabase db reset`
Expected: "Finished supabase db reset" with no errors. Existing rows gain two nullable columns — no data loss.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0008_topic_level_change_tracking.sql
git commit -m "feat: add previous_level and changed_at columns to child_topic_levels"
```

---

## Task 2: Update `bumpTopicLevelIfEarned` to write change history

**Files:**
- Modify: `lib/supabase/queries.ts:145-168`
- Modify: `lib/supabase/queries.test.ts`

The existing function has three upsert branches (promote, increment, demote) and two no-op branches. Add `previous_level` and `changed_at` to the promote and demote upserts only. The increment branch intentionally does NOT get these fields.

- [ ] **Step 1: Write failing tests**

Add to `lib/supabase/queries.test.ts` inside the existing `describe('bumpTopicLevelIfEarned', ...)` block, after the existing tests:

```ts
it('promotion upsert includes previous_level and changed_at', async () => {
  const { mockSb, upsertChain } = makeSelectThenUpsert([
    { topic: 'fractions', language_level: 'simplified', sessions_at_level: 1 },
  ])
  await bumpTopicLevelIfEarned(mockSb, 'child-1', 'math', {
    fractions: { correct: 9, total: 10 },
  })
  expect(upsertChain.upsert).toHaveBeenCalledWith(
    expect.objectContaining({
      language_level: 'standard',
      previous_level: 'simplified',
      changed_at: expect.any(String),
    }),
    expect.any(Object)
  )
})

it('demotion upsert includes previous_level and changed_at', async () => {
  const { mockSb, upsertChain } = makeSelectThenUpsert([
    { topic: 'fractions', language_level: 'standard', sessions_at_level: 0 },
  ])
  await bumpTopicLevelIfEarned(mockSb, 'child-1', 'math', {
    fractions: { correct: 3, total: 10 },
  })
  expect(upsertChain.upsert).toHaveBeenCalledWith(
    expect.objectContaining({
      language_level: 'simplified',
      previous_level: 'standard',
      changed_at: expect.any(String),
    }),
    expect.any(Object)
  )
})

it('increment upsert does NOT include previous_level or changed_at', async () => {
  const { mockSb, upsertChain } = makeSelectThenUpsert([
    { topic: 'fractions', language_level: 'simplified', sessions_at_level: 0 },
  ])
  await bumpTopicLevelIfEarned(mockSb, 'child-1', 'math', {
    fractions: { correct: 9, total: 10 },
  })
  const payload = upsertChain.upsert.mock.calls[0][0]
  expect(payload).not.toHaveProperty('previous_level')
  expect(payload).not.toHaveProperty('changed_at')
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/supabase/queries.test.ts`
Expected: The 3 new tests FAIL (properties not found).

- [ ] **Step 3: Update the promote branch in `lib/supabase/queries.ts`**

In the promote branch (currently lines 148–152), change the upsert to:

```ts
// was:
{ child_id: childId, subject, topic, language_level: 'standard', sessions_at_level: 0, updated_at: now }

// becomes:
{ child_id: childId, subject, topic, language_level: 'standard', sessions_at_level: 0, updated_at: now, previous_level: 'simplified', changed_at: now }
```

- [ ] **Step 4: Update the demote branch in `lib/supabase/queries.ts`**

In the demote branch (currently lines 163–166), change the upsert to:

```ts
// was:
{ child_id: childId, subject, topic, language_level: 'simplified', sessions_at_level: 0, updated_at: now }

// becomes:
{ child_id: childId, subject, topic, language_level: 'simplified', sessions_at_level: 0, updated_at: now, previous_level: 'standard', changed_at: now }
```

The increment branch (lines 155–158) is left unchanged — it must NOT include `previous_level` or `changed_at`.

- [ ] **Step 5: Run all tests to verify they pass**

Run: `npx vitest run lib/supabase/queries.test.ts`
Expected: ALL tests PASS (8 total — 5 existing + 3 new).

- [ ] **Step 6: Commit**

```bash
git add lib/supabase/queries.ts lib/supabase/queries.test.ts
git commit -m "feat: record previous_level and changed_at on topic level changes"
```

---

## Task 3: Add `getAllChildTopicLevels` query

**Files:**
- Modify: `lib/supabase/queries.ts`
- Modify: `lib/supabase/queries.test.ts`

- [ ] **Step 1: Write failing tests**

Add a new `describe` block to `lib/supabase/queries.test.ts`:

```ts
describe('getAllChildTopicLevels', () => {
  function makeChain(rows: Record<string, unknown>[]) {
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    }
    chain.then = (resolve: (v: unknown) => void) =>
      Promise.resolve({ data: rows, error: null }).then(resolve)
    return { from: vi.fn().mockReturnValue(chain) } as any
  }

  it('returns flat topic→level map from all subjects', async () => {
    const sb = makeChain([
      { topic: 'fractions', language_level: 'standard' },
      { topic: 'poetry', language_level: 'simplified' },
    ])
    const result = await getAllChildTopicLevels(sb, 'child-1')
    expect(result).toEqual({ fractions: 'standard', poetry: 'simplified' })
  })

  it('returns empty object when no rows exist', async () => {
    const sb = makeChain([])
    const result = await getAllChildTopicLevels(sb, 'child-1')
    expect(result).toEqual({})
  })

  it('returns empty object on DB error', async () => {
    const chain: any = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() }
    chain.then = (resolve: (v: unknown) => void) =>
      Promise.resolve({ data: null, error: { message: 'db error' } }).then(resolve)
    const sb = { from: vi.fn().mockReturnValue(chain) } as any
    const result = await getAllChildTopicLevels(sb, 'child-1')
    expect(result).toEqual({})
  })
})
```

Also add `getAllChildTopicLevels` to the import on line 3:
```ts
import { getQuestionsForSession, getChildTopicLevels, bumpTopicLevelIfEarned, getAllChildTopicLevels } from './queries'
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/supabase/queries.test.ts`
Expected: 3 new tests FAIL with "getAllChildTopicLevels is not a function".

- [ ] **Step 3: Implement `getAllChildTopicLevels` in `lib/supabase/queries.ts`**

Add after the existing `getChildTopicLevels` function:

```ts
export async function getAllChildTopicLevels(
  supabase: SupabaseClient,
  childId: string
): Promise<Record<string, 'simplified' | 'standard'>> {
  const { data } = await supabase
    .from('child_topic_levels')
    .select('topic, language_level')
    .eq('child_id', childId)
  if (!data) return {}
  return Object.fromEntries(
    data.map((r: { topic: string; language_level: string }) => [
      r.topic,
      r.language_level as 'simplified' | 'standard',
    ])
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/supabase/queries.test.ts`
Expected: ALL tests PASS (11 total).

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/queries.ts lib/supabase/queries.test.ts
git commit -m "feat: add getAllChildTopicLevels query"
```

---

## Task 4: Add `getRecentMilestones` query

**Files:**
- Modify: `lib/supabase/queries.ts`
- Modify: `lib/supabase/queries.test.ts`

- [ ] **Step 1: Write failing tests**

Add a new `describe` block to `lib/supabase/queries.test.ts`:

```ts
describe('getRecentMilestones', () => {
  const now = new Date().toISOString()

  function makeChain(rows: Record<string, unknown>[] | null, error: unknown = null) {
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    }
    chain.then = (resolve: (v: unknown) => void) =>
      Promise.resolve({ data: rows, error }).then(resolve)
    return { from: vi.fn().mockReturnValue(chain) } as any
  }

  it('returns empty array when no milestones in window', async () => {
    const sb = makeChain([])
    const result = await getRecentMilestones(sb, 'child-1')
    expect(result).toEqual([])
  })

  it('maps DB rows to Milestone objects with correct fields', async () => {
    const sb = makeChain([
      { subject: 'math', topic: 'fractions', language_level: 'standard', previous_level: 'simplified', changed_at: now },
      { subject: 'math', topic: 'division', language_level: 'simplified', previous_level: 'standard', changed_at: now },
    ])
    const result = await getRecentMilestones(sb, 'child-1')
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      subject: 'math', topic: 'fractions',
      fromLevel: 'simplified', toLevel: 'standard',
      changedAt: now, direction: 'promoted',
    })
    expect(result[1]).toEqual({
      subject: 'math', topic: 'division',
      fromLevel: 'standard', toLevel: 'simplified',
      changedAt: now, direction: 'demoted',
    })
  })

  it('returns empty array on DB error', async () => {
    const sb = makeChain(null, { message: 'db error' })
    const result = await getRecentMilestones(sb, 'child-1')
    expect(result).toEqual([])
  })
})
```

Also add `getRecentMilestones` and `Milestone` to the import:
```ts
import { getQuestionsForSession, getChildTopicLevels, bumpTopicLevelIfEarned, getAllChildTopicLevels, getRecentMilestones } from './queries'
import type { Milestone } from './queries'
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/supabase/queries.test.ts`
Expected: 3 new tests FAIL.

- [ ] **Step 3: Implement `getRecentMilestones` in `lib/supabase/queries.ts`**

Add the `Milestone` type and function after `getAllChildTopicLevels`:

```ts
export type Milestone = {
  subject: string
  topic: string
  fromLevel: 'simplified' | 'standard'
  toLevel: 'simplified' | 'standard'
  changedAt: string
  direction: 'promoted' | 'demoted'
}

export async function getRecentMilestones(
  supabase: SupabaseClient,
  childId: string
): Promise<Milestone[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from('child_topic_levels')
    .select('subject, topic, language_level, previous_level, changed_at')
    .eq('child_id', childId)
    .not('previous_level', 'is', null)
    .gte('changed_at', thirtyDaysAgo)
    .order('changed_at', { ascending: false })
    .limit(10)
  if (!data) return []
  return data.map((r: {
    subject: string; topic: string
    language_level: string; previous_level: string; changed_at: string
  }) => ({
    subject: r.subject,
    topic: r.topic,
    fromLevel: r.previous_level as 'simplified' | 'standard',
    toLevel: r.language_level as 'simplified' | 'standard',
    changedAt: r.changed_at,
    direction: r.language_level === 'standard' ? 'promoted' : 'demoted',
  }))
}
```

- [ ] **Step 4: Run all tests to verify they pass**

Run: `npx vitest run lib/supabase/queries.test.ts`
Expected: ALL tests PASS (14 total).

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/queries.ts lib/supabase/queries.test.ts
git commit -m "feat: add getRecentMilestones query and Milestone type"
```

---

## Task 5: Build `MilestonesCard` component

**Files:**
- Create: `components/dashboard/milestones-card.tsx`
- Create: `components/dashboard/milestones-card.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `components/dashboard/milestones-card.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { MilestonesCard } from './milestones-card'
import type { Milestone } from '@/lib/supabase/queries'

const promotion: Milestone = {
  subject: 'math', topic: 'fractions',
  fromLevel: 'simplified', toLevel: 'standard',
  changedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
  direction: 'promoted',
}
const demotion: Milestone = {
  subject: 'math', topic: 'division',
  fromLevel: 'standard', toLevel: 'simplified',
  changedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
  direction: 'demoted',
}

describe('MilestonesCard', () => {
  it('renders nothing when milestones array is empty', () => {
    const { container } = render(<MilestonesCard milestones={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders a promotion row with 🎉 and topic + subject', () => {
    render(<MilestonesCard milestones={[promotion]} />)
    expect(screen.getByText(/fractions/i)).toBeInTheDocument()
    expect(screen.getByText(/math/i)).toBeInTheDocument()
    expect(screen.getByText(/🎉/)).toBeInTheDocument()
  })

  it('renders a demotion row with ⚠️', () => {
    render(<MilestonesCard milestones={[demotion]} />)
    expect(screen.getByText(/division/i)).toBeInTheDocument()
    expect(screen.getByText(/⚠️/)).toBeInTheDocument()
  })

  it('shows relative time string for each milestone', () => {
    render(<MilestonesCard milestones={[promotion]} />)
    expect(screen.getByText(/days? ago/i)).toBeInTheDocument()
  })

  it('renders the card heading', () => {
    render(<MilestonesCard milestones={[promotion]} />)
    expect(screen.getByText(/recent milestones/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run components/dashboard/milestones-card.test.tsx`
Expected: FAIL with "Cannot find module './milestones-card'".

- [ ] **Step 3: Create `components/dashboard/milestones-card.tsx`**

```tsx
import { Card, CardContent } from '@/components/ui/card'
import type { Milestone } from '@/lib/supabase/queries'

function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return '1 day ago'
  return `${diffDays} days ago`
}

export function MilestonesCard({ milestones }: { milestones: Milestone[] }) {
  if (milestones.length === 0) return null
  return (
    <Card>
      <CardContent className="p-4">
        <p className="font-semibold mb-3">Recent Milestones</p>
        <ul className="space-y-2">
          {milestones.map((m, i) => (
            <li
              key={i}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                m.direction === 'promoted'
                  ? 'bg-green-500/10'
                  : 'bg-yellow-500/10'
              }`}
            >
              <span>
                {m.direction === 'promoted' ? '🎉' : '⚠️'}{' '}
                <strong>{m.topic}</strong>{' '}
                <span className="text-muted-foreground">({m.subject})</span>
                {' '}simplified → standard
              </span>
              <span className="text-muted-foreground ml-4 whitespace-nowrap">
                {formatRelativeTime(m.changedAt)}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run components/dashboard/milestones-card.test.tsx`
Expected: ALL 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/milestones-card.tsx components/dashboard/milestones-card.test.tsx
git commit -m "feat: add MilestonesCard component"
```

---

## Task 6: Add language level badges to `ProgressChart`

**Files:**
- Modify: `components/dashboard/progress-chart.tsx`

This is a purely presentational change — no new tests needed. The component receives an optional prop and renders a small badge inline.

- [ ] **Step 1: Update `components/dashboard/progress-chart.tsx`**

Replace the entire file with:

```tsx
interface TopicAccuracy { topic: string; accuracy: number }

function getColor(accuracy: number) {
  if (accuracy >= 0.80) return 'bg-green-500'
  if (accuracy >= 0.65) return 'bg-yellow-500'
  return 'bg-red-500'
}

export function ProgressChart({
  topics,
  topicLevels = {},
}: {
  topics: TopicAccuracy[]
  topicLevels?: Record<string, 'simplified' | 'standard'>
}) {
  if (topics.length === 0) {
    return <p className="text-muted-foreground text-sm">No data yet — complete some sessions to see progress.</p>
  }
  return (
    <div className="space-y-3">
      {topics.map(({ topic, accuracy }) => {
        const level = topicLevels[topic]
        return (
          <div key={topic} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium flex items-center gap-2">
                {topic}
                {level === 'standard' && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-green-500 text-white font-semibold">
                    STANDARD
                  </span>
                )}
                {level === 'simplified' && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
                    simplified
                  </span>
                )}
              </span>
              <span className="text-muted-foreground">{Math.round(accuracy * 100)}%</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${getColor(accuracy)}`}
                style={{ width: `${accuracy * 100}%` }}
                role="progressbar"
                aria-valuenow={Math.round(accuracy * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Run all tests to verify nothing broke**

Run: `npx vitest run`
Expected: ALL tests PASS.

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/progress-chart.tsx
git commit -m "feat: add language level badges to ProgressChart"
```

---

## Task 7: Wire everything into the dashboard page

**Files:**
- Modify: `app/(parent)/dashboard/page.tsx`

- [ ] **Step 1: Add imports at the top of `app/(parent)/dashboard/page.tsx`**

Add to the existing import block:

```ts
import { MilestonesCard } from '@/components/dashboard/milestones-card'
import { getAllChildTopicLevels, getRecentMilestones } from '@/lib/supabase/queries'
import type { Milestone } from '@/lib/supabase/queries'
```

- [ ] **Step 2: Add the two new fetches after the existing session/answer fetches**

After the `weakTopics` computation (currently the last data computation before `return`), add:

```ts
const [milestones, topicLevels] = await Promise.all([
  getRecentMilestones(supabase, activeChild.id).catch(() => [] as Milestone[]),
  getAllChildTopicLevels(supabase, activeChild.id).catch(() => ({} as Record<string, 'simplified' | 'standard'>)),
])
```

- [ ] **Step 3: Insert `MilestonesCard` and update `ProgressChart` in the JSX**

In the JSX `return`, make two changes:

**Change 1** — insert `<MilestonesCard>` between the stats grid closing `</div>` (line 110) and `<WeakAreasCallout>` (line 111):

```tsx
      </div>  {/* closes the grid grid-cols-3 div */}
      <MilestonesCard milestones={milestones} />
      <WeakAreasCallout topics={weakTopics} childName={activeChild.name} />
```

**Change 2** — update the `<ProgressChart>` call to pass `topicLevels` (line 114):

```tsx
        <ProgressChart topics={topicList} topicLevels={topicLevels} />
```

- [ ] **Step 4: Run all tests to verify nothing broke**

Run: `npx vitest run`
Expected: ALL tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/\(parent\)/dashboard/page.tsx
git commit -m "feat: show language level milestones and badges on parent dashboard"
```

---

## Task 8: Manual QA

- [ ] Start the dev server: `npm run dev`
- [ ] Open the dashboard. Verify the page loads without errors.
- [ ] With no `child_topic_levels` rows (new app): confirm `MilestonesCard` is hidden and `ProgressChart` shows no badges.
- [ ] To test with data: run `npx supabase db reset` then seed a test row directly in the Supabase Studio:
  ```sql
  INSERT INTO child_topic_levels (child_id, subject, topic, language_level, sessions_at_level, updated_at, previous_level, changed_at)
  VALUES ('<your-child-id>', 'math', 'fractions', 'standard', 0, now(), 'simplified', now() - interval '2 days');
  ```
  Then reload the dashboard — expect:
  - `MilestonesCard` visible with a 🎉 row for "fractions (math) — 2 days ago"
  - `ProgressChart` shows `[STANDARD]` badge next to "fractions" if it appears in recent session data
- [ ] Push to remote: `git push`
