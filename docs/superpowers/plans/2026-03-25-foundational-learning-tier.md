# Foundational Learning Tier Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "foundational" question tier for children with special needs — parent sets it per subject, system suggests promotion after 3 sessions at ≥80%, parent confirms.

**Architecture:** Extend the existing `child_topic_levels` two-tier system (`simplified ↔ standard`) to three tiers (`foundational → simplified → standard`). Foundational questions live in the `questions` table with `tier = 'foundational'`. A new `promotion_ready` flag on `child_topic_levels` drives the parent promotion UX without auto-advancing the child. Two new API routes handle parent-initiated level changes. The existing `bumpTopicLevelIfEarned` query function is extended to set `promotion_ready` instead of auto-promoting from foundational.

**Tech Stack:** Next.js 16 App Router, Supabase (Postgres + RLS), Vitest, TypeScript, shadcn/ui

**Prerequisite:** QG-1 (admin question management) must be deployed first. It provides `lib/curriculum/sol-curriculum.ts` and `lib/generation/generate-topic.ts` which this feature imports.

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Create | `supabase/migrations/0013_foundational_tier.sql` | Add `tier` to questions + questions_pending; extend language_level CHECK; add promotion_ready |
| Modify | `lib/supabase/queries.ts` | Extend all type signatures and logic for foundational tier |
| Modify (add tests) | `lib/supabase/queries.test.ts` | Tests for new foundational tier behaviour |
| Modify | `app/api/questions/route.ts` | Three-tier dominant-level derivation |
| Create | `app/api/questions/route.test.ts` | Tests for foundational tier serving |
| Create | `app/api/children/[id]/learning-level/route.ts` | Bulk-set all topics for a subject to a given tier |
| Create | `app/api/children/[id]/learning-level/route.test.ts` | Tests for learning-level route |
| Create | `app/api/children/[id]/promote/route.ts` | Confirm or dismiss promotion for a subject |
| Create | `app/api/children/[id]/promote/route.test.ts` | Tests for promote route |
| Modify | `lib/generation/generate-topic.ts` | Accept optional `tier` param; use foundational prompt |
| Modify | `components/admin/generate-review-client.tsx` | Add Tier selector to generate form |
| Modify | `app/api/admin/generate/route.ts` | Pass `tier` through to questions_pending insert |
| Modify | `app/(parent)/children/[childId]/edit/page.tsx` | Add Learning Level section |
| Modify | `app/(parent)/dashboard/page.tsx` | Query promotion-ready rows; render PromotionBanner |
| Create | `components/dashboard/promotion-banner.tsx` | Dismissible promotion suggestion banner |

---

## Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/0013_foundational_tier.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/0013_foundational_tier.sql

-- Add tier to the live questions table
ALTER TABLE questions
  ADD COLUMN tier text NOT NULL DEFAULT 'standard'
    CHECK (tier IN ('foundational', 'standard'));

-- Add tier to the staging questions_pending table (created by QG-1 migration 0011)
ALTER TABLE questions_pending
  ADD COLUMN tier text NOT NULL DEFAULT 'standard'
    CHECK (tier IN ('foundational', 'standard'));

-- Extend language_level check on child_topic_levels to include 'foundational'
-- (auto-generated constraint name from migration 0007)
ALTER TABLE child_topic_levels
  DROP CONSTRAINT child_topic_levels_language_level_check;

ALTER TABLE child_topic_levels
  ADD CONSTRAINT child_topic_levels_language_level_check
    CHECK (language_level IN ('foundational', 'simplified', 'standard'));

-- Add promotion_ready flag (set by app after 3 sessions >= 80%; cleared after parent acts)
ALTER TABLE child_topic_levels
  ADD COLUMN promotion_ready boolean NOT NULL DEFAULT false;
```

- [ ] **Step 2: Apply the migration**

```bash
npx supabase db reset
```

Expected: migration applies cleanly, no errors. Existing `questions` and `child_topic_levels` rows are unchanged (new columns default correctly).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0013_foundational_tier.sql
git commit -m "feat: add foundational tier migration"
```

---

## Task 2: Extend `lib/supabase/queries.ts`

All changes to type signatures, filters, and advancement logic live here. Write the tests first — they define exactly what the new behaviour must be.

**Files:**
- Modify: `lib/supabase/queries.ts`
- Modify: `lib/supabase/queries.test.ts`

- [ ] **Step 1: Add new failing tests to `lib/supabase/queries.test.ts`**

Add these tests at the end of the file (after the existing tests):

```ts
// ─── getQuestionsForSession — tier filtering ──────────────────────────────

describe('getQuestionsForSession — tier filtering', () => {
  function makeTierTrackingClient() {
    const eqCalls: Array<[string, unknown]> = []
    const client = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation(function (this: unknown, key: string, val: unknown) {
          eqCalls.push([key, val])
          return this
        }),
        not: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }
    return { client, eqCalls }
  }

  it('queries tier=foundational when languageLevel is foundational', async () => {
    const { client, eqCalls } = makeTierTrackingClient()
    await getQuestionsForSession(client as any, 3, 'math', 10, [], 'foundational')
    const tierCalls = eqCalls.filter(([k]) => k === 'tier')
    expect(tierCalls.length).toBeGreaterThan(0)
    expect(tierCalls.every(([, v]) => v === 'foundational')).toBe(true)
  })

  it('queries tier=standard when languageLevel is simplified', async () => {
    const { client, eqCalls } = makeTierTrackingClient()
    await getQuestionsForSession(client as any, 3, 'math', 10, [], 'simplified')
    const tierCalls = eqCalls.filter(([k]) => k === 'tier')
    expect(tierCalls.length).toBeGreaterThan(0)
    expect(tierCalls.every(([, v]) => v === 'standard')).toBe(true)
  })

  it('queries tier=standard when languageLevel is standard', async () => {
    const { client, eqCalls } = makeTierTrackingClient()
    await getQuestionsForSession(client as any, 3, 'math', 10, [], 'standard')
    const tierCalls = eqCalls.filter(([k]) => k === 'tier')
    expect(tierCalls.length).toBeGreaterThan(0)
    expect(tierCalls.every(([, v]) => v === 'standard')).toBe(true)
  })
})

// ─── bumpTopicLevelIfEarned — foundational tier ───────────────────────────

describe('bumpTopicLevelIfEarned — foundational tier', () => {
  it('sets promotion_ready=true after 3rd session at >=80% at foundational', async () => {
    const { mockSb, upsertChain } = makeSelectThenUpsert([
      { topic: 'fractions', language_level: 'foundational', sessions_at_level: 2, promotion_ready: false },
    ])
    await bumpTopicLevelIfEarned(mockSb, 'child-1', 'math', {
      fractions: { correct: 9, total: 10 },
    })
    expect(upsertChain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ language_level: 'foundational', promotion_ready: true }),
      expect.any(Object)
    )
  })

  it('does NOT change language_level when setting promotion_ready', async () => {
    const { mockSb, upsertChain } = makeSelectThenUpsert([
      { topic: 'fractions', language_level: 'foundational', sessions_at_level: 2, promotion_ready: false },
    ])
    await bumpTopicLevelIfEarned(mockSb, 'child-1', 'math', {
      fractions: { correct: 9, total: 10 },
    })
    expect(upsertChain.upsert).not.toHaveBeenCalledWith(
      expect.objectContaining({ language_level: 'simplified' }),
      expect.any(Object)
    )
  })

  it('increments sessions_at_level before reaching threshold without setting promotion_ready', async () => {
    const { mockSb, upsertChain } = makeSelectThenUpsert([
      { topic: 'fractions', language_level: 'foundational', sessions_at_level: 1, promotion_ready: false },
    ])
    await bumpTopicLevelIfEarned(mockSb, 'child-1', 'math', {
      fractions: { correct: 9, total: 10 },
    })
    expect(upsertChain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        language_level: 'foundational',
        sessions_at_level: 2,
        promotion_ready: false,
      }),
      expect.any(Object)
    )
  })

  it('does not demote from foundational even on very low accuracy', async () => {
    const { mockSb, upsertChain } = makeSelectThenUpsert([
      { topic: 'fractions', language_level: 'foundational', sessions_at_level: 0, promotion_ready: false },
    ])
    await bumpTopicLevelIfEarned(mockSb, 'child-1', 'math', {
      fractions: { correct: 2, total: 10 }, // 20% — would demote standard→simplified, but not foundational
    })
    expect(upsertChain.upsert).not.toHaveBeenCalled()
  })

  it('does nothing at foundational when accuracy is 50-79%', async () => {
    const { mockSb, upsertChain } = makeSelectThenUpsert([
      { topic: 'fractions', language_level: 'foundational', sessions_at_level: 0, promotion_ready: false },
    ])
    await bumpTopicLevelIfEarned(mockSb, 'child-1', 'math', {
      fractions: { correct: 6, total: 10 }, // 60%
    })
    expect(upsertChain.upsert).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run lib/supabase/queries.test.ts
```

Expected: FAIL — `'foundational'` is not assignable to the existing type; tier filter tests fail because the filter doesn't exist yet.

- [ ] **Step 3: Implement all changes to `lib/supabase/queries.ts`**

**Change 1 — `getQuestionsForSession` (lines 13–78):** Replace the function with the version below. The key change: add `.eq('tier', languageLevel === 'foundational' ? 'foundational' : 'standard')` in `buildQuery`, and extend the parameter type.

```ts
export async function getQuestionsForSession(
  supabase: SupabaseClient,
  grade: number,
  subject: string,
  count: number,
  excludeQuestionIds: string[] = [],
  languageLevel: 'foundational' | 'simplified' | 'standard' = 'simplified'
) {
  const easyTarget   = Math.round(count * 0.4)
  const mediumTarget = Math.round(count * 0.4)
  const hardTarget   = count - easyTarget - mediumTarget
  const tierFilter   = languageLevel === 'foundational' ? 'foundational' : 'standard'

  async function fetchTier(difficulty: number, target: number): Promise<Record<string, unknown>[]> {
    const buildQuery = (withSimplifiedFilter: boolean) => {
      let q = supabase
        .from('questions')
        .select('*')
        .eq('grade', grade)
        .eq('subject', subject)
        .eq('difficulty', difficulty)
        .eq('tier', tierFilter)
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

    // Fallback: no simplified_text filter (tier filter still applied via buildQuery)
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

  // Final safety: if completely empty, fall back to unrestricted (but still tier-filtered)
  if (combined.length === 0) {
    const { data, error } = await supabase
      .from('questions').select('*')
      .eq('grade', grade)
      .eq('subject', subject)
      .eq('tier', tierFilter)
      .limit(count * 3)
    if (error) throw error
    return (data ?? []).sort(() => Math.random() - 0.5).slice(0, count)
  }

  return combined.slice(0, count)
}
```

**Change 2 — `getChildTopicLevels` (lines 101–115):** Update the return type.

```ts
export async function getChildTopicLevels(
  supabase: SupabaseClient,
  childId: string,
  subject: string
): Promise<Record<string, 'foundational' | 'simplified' | 'standard'>> {
  const { data } = await supabase
    .from('child_topic_levels')
    .select('topic, language_level')
    .eq('child_id', childId)
    .eq('subject', subject)
  if (!data || data.length === 0) return {}
  return Object.fromEntries(
    data.map((row: { topic: string; language_level: string }) => [row.topic, row.language_level])
  ) as Record<string, 'foundational' | 'simplified' | 'standard'>
}
```

**Change 3 — `getAllChildTopicLevels` (lines 117–132):** Same type update.

```ts
export async function getAllChildTopicLevels(
  supabase: SupabaseClient,
  childId: string
): Promise<Record<string, 'foundational' | 'simplified' | 'standard'>> {
  const { data } = await supabase
    .from('child_topic_levels')
    .select('topic, language_level')
    .eq('child_id', childId)
  if (!data) return {}
  return Object.fromEntries(
    data.map((r: { topic: string; language_level: string }) => [
      r.topic,
      r.language_level as 'foundational' | 'simplified' | 'standard',
    ])
  )
}
```

**Change 4 — `Milestone` type and `getRecentMilestones` (lines 134–168):** Extend levels and direction logic.

```ts
export type Milestone = {
  subject: string
  topic: string
  fromLevel: 'foundational' | 'simplified' | 'standard'
  toLevel: 'foundational' | 'simplified' | 'standard'
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
  }) => {
    const to = r.language_level as 'foundational' | 'simplified' | 'standard'
    const from = r.previous_level as 'foundational' | 'simplified' | 'standard'
    const levelOrder = { foundational: 0, simplified: 1, standard: 2 }
    return {
      subject: r.subject,
      topic: r.topic,
      fromLevel: from,
      toLevel: to,
      changedAt: r.changed_at,
      direction: levelOrder[to] > levelOrder[from] ? 'promoted' : 'demoted',
    }
  })
}
```

**Change 5 — `bumpTopicLevelIfEarned` (lines 170–223):** Add `promotion_ready` to the select and levelMap, then add the foundational branch before the existing simplified/standard logic.

Replace the entire function:

```ts
export async function bumpTopicLevelIfEarned(
  supabase: SupabaseClient,
  childId: string,
  subject: string,
  topicAccuracy: Record<string, { correct: number; total: number }>
): Promise<void> {
  const fetchChain = supabase
    .from('child_topic_levels')
    .select('topic, language_level, sessions_at_level, promotion_ready')
    .eq('child_id', childId)
    .eq('subject', subject)
  const { data: existing } = await fetchChain

  type Level = 'foundational' | 'simplified' | 'standard'
  const levelMap: Record<string, { language_level: Level; sessions_at_level: number; promotion_ready: boolean }> =
    Object.fromEntries(
      (existing ?? []).map((r: { topic: string; language_level: string; sessions_at_level: number; promotion_ready: boolean }) => [
        r.topic,
        {
          language_level: r.language_level as Level,
          sessions_at_level: r.sessions_at_level,
          promotion_ready: r.promotion_ready ?? false,
        },
      ])
    )

  for (const [topic, { correct, total }] of Object.entries(topicAccuracy)) {
    if (total === 0) continue
    const accuracy = correct / total
    const current = levelMap[topic] ?? { language_level: 'simplified' as Level, sessions_at_level: 0, promotion_ready: false }
    const now = new Date().toISOString()

    // Foundational tier: parent-controlled entry and exit — never auto-promote or auto-demote
    if (current.language_level === 'foundational') {
      if (accuracy >= 0.8) {
        const newSessionsAtLevel = current.sessions_at_level + 1
        if (newSessionsAtLevel >= 3) {
          // Signal to parent that child is ready — do NOT change language_level
          await supabase.from('child_topic_levels').upsert(
            { child_id: childId, subject, topic, language_level: 'foundational', sessions_at_level: newSessionsAtLevel, promotion_ready: true, updated_at: now },
            { onConflict: 'child_id,subject,topic' }
          )
        } else {
          await supabase.from('child_topic_levels').upsert(
            { child_id: childId, subject, topic, language_level: 'foundational', sessions_at_level: newSessionsAtLevel, promotion_ready: false, updated_at: now },
            { onConflict: 'child_id,subject,topic' }
          )
        }
      }
      // 50–79%: no change; <50%: no demotion (parents chose foundational intentionally)
      continue
    }

    // Existing simplified ↔ standard logic (unchanged)
    if (accuracy >= 0.8) {
      const newSessionsAtLevel = current.sessions_at_level + 1
      if (newSessionsAtLevel >= 2 && current.language_level === 'simplified') {
        await supabase.from('child_topic_levels').upsert(
          { child_id: childId, subject, topic, language_level: 'standard', sessions_at_level: 0, updated_at: now, previous_level: 'simplified', changed_at: now },
          { onConflict: 'child_id,subject,topic' }
        )
      } else if (current.language_level === 'simplified') {
        await supabase.from('child_topic_levels').upsert(
          { child_id: childId, subject, topic, language_level: 'simplified', sessions_at_level: newSessionsAtLevel, updated_at: now },
          { onConflict: 'child_id,subject,topic' }
        )
      }
    } else if (accuracy < 0.5 && current.language_level === 'standard') {
      await supabase.from('child_topic_levels').upsert(
        { child_id: childId, subject, topic, language_level: 'simplified', sessions_at_level: 0, updated_at: now, previous_level: 'standard', changed_at: now },
        { onConflict: 'child_id,subject,topic' }
      )
    }
  }
}
```

- [ ] **Step 4: Run tests to confirm all pass**

```bash
npx vitest run lib/supabase/queries.test.ts
```

Expected: all existing tests still pass, all new foundational tier tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/queries.ts lib/supabase/queries.test.ts
git commit -m "feat: extend queries for foundational tier — tier filter, promotion_ready logic"
```

---

## Task 3: Extend Questions API Route

**Files:**
- Modify: `app/api/questions/route.ts`
- Create: `app/api/questions/route.test.ts`

- [ ] **Step 1: Write the failing test**

Create `app/api/questions/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/queries', () => ({
  getQuestionsForSession: vi.fn().mockResolvedValue([]),
  getRecentSessionQuestionIds: vi.fn().mockResolvedValue([]),
  getChildTopicLevels: vi.fn().mockResolvedValue({}),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  }),
}))

import { getChildTopicLevels, getQuestionsForSession } from '@/lib/supabase/queries'

beforeEach(() => vi.clearAllMocks())

describe('GET /api/questions — dominant language level derivation', () => {
  it('derives foundational when majority topics are foundational', async () => {
    vi.mocked(getChildTopicLevels).mockResolvedValue({
      fractions: 'foundational',
      multiplication: 'foundational',
      geometry: 'simplified',
    })
    const req = new NextRequest('http://localhost/api/questions?grade=3&subject=math&childId=child-1')
    await GET(req)
    expect(getQuestionsForSession).toHaveBeenCalledWith(
      expect.anything(), 3, 'math', expect.any(Number), expect.any(Array), 'foundational'
    )
  })

  it('derives standard when majority topics are standard', async () => {
    vi.mocked(getChildTopicLevels).mockResolvedValue({
      fractions: 'standard',
      multiplication: 'standard',
      geometry: 'simplified',
    })
    const req = new NextRequest('http://localhost/api/questions?grade=3&subject=math&childId=child-1')
    await GET(req)
    expect(getQuestionsForSession).toHaveBeenCalledWith(
      expect.anything(), 3, 'math', expect.any(Number), expect.any(Array), 'standard'
    )
  })

  it('defaults to simplified when no topics exist', async () => {
    vi.mocked(getChildTopicLevels).mockResolvedValue({})
    const req = new NextRequest('http://localhost/api/questions?grade=3&subject=math&childId=child-1')
    await GET(req)
    expect(getQuestionsForSession).toHaveBeenCalledWith(
      expect.anything(), 3, 'math', expect.any(Number), expect.any(Array), 'simplified'
    )
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx vitest run app/api/questions/route.test.ts
```

Expected: FAIL — `'foundational'` not assignable, `getQuestionsForSession` called with wrong level.

- [ ] **Step 3: Implement the change in `app/api/questions/route.ts`**

Replace the `languageLevel` derivation block (lines 17–27):

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
    // else: simplified (default — covers ties and mixed levels)
  }
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npx vitest run app/api/questions/route.test.ts
```

Expected: all 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/api/questions/route.ts app/api/questions/route.test.ts
git commit -m "feat: extend questions route for three-tier language level derivation"
```

---

## Task 4: Learning-Level API Route

**Files:**
- Create: `app/api/children/[id]/learning-level/route.ts`
- Create: `app/api/children/[id]/learning-level/route.test.ts`

- [ ] **Step 1: Write the failing test**

Create `app/api/children/[id]/learning-level/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/curriculum/sol-curriculum', () => ({
  getTopicsForGradeSubject: vi.fn().mockReturnValue([
    { name: 'fractions', solStandard: '3.2', description: 'desc' },
    { name: 'geometry', solStandard: '3.12', description: 'desc' },
  ]),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { getTopicsForGradeSubject } from '@/lib/curriculum/sol-curriculum'

function makeClient(childData: unknown, upsertError: unknown = null) {
  const upsertMock = vi.fn().mockResolvedValue({ error: upsertError })
  const client = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'parent-1' } } }) },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'children') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: childData, error: null }),
        }
      }
      return { upsert: upsertMock }
    }),
  }
  return { client, upsertMock }
}

beforeEach(() => vi.clearAllMocks())

describe('POST /api/children/[id]/learning-level', () => {
  it('bulk-upserts all topics for the subject to foundational', async () => {
    const { client, upsertMock } = makeClient({ id: 'child-1', grade: 3 })
    vi.mocked(createClient).mockResolvedValue(client as any)

    const req = new NextRequest('http://localhost/api/children/child-1/learning-level', {
      method: 'POST',
      body: JSON.stringify({ subject: 'math', tier: 'foundational' }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'child-1' }) })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.updated).toBe(2) // 2 topics in mock

    expect(upsertMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ topic: 'fractions', language_level: 'foundational', sessions_at_level: 0, promotion_ready: false }),
        expect.objectContaining({ topic: 'geometry', language_level: 'foundational', sessions_at_level: 0, promotion_ready: false }),
      ]),
      expect.any(Object)
    )
  })

  it('returns 404 when child does not belong to parent', async () => {
    const { client } = makeClient(null)
    vi.mocked(createClient).mockResolvedValue(client as any)

    const req = new NextRequest('http://localhost/api/children/other-child/learning-level', {
      method: 'POST',
      body: JSON.stringify({ subject: 'math', tier: 'foundational' }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'other-child' }) })
    expect(res.status).toBe(404)
  })

  it('returns 400 for unknown subject', async () => {
    const { client } = makeClient({ id: 'child-1', grade: 3 })
    vi.mocked(createClient).mockResolvedValue(client as any)
    vi.mocked(getTopicsForGradeSubject).mockReturnValue([])

    const req = new NextRequest('http://localhost/api/children/child-1/learning-level', {
      method: 'POST',
      body: JSON.stringify({ subject: 'science', tier: 'foundational' }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'child-1' }) })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'unknown_subject' })
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx vitest run "app/api/children/\[id\]/learning-level/route.test.ts"
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create the route**

Create `app/api/children/[id]/learning-level/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTopicsForGradeSubject } from '@/lib/curriculum/sol-curriculum'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: childId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: child } = await supabase
    .from('children')
    .select('id, grade')
    .eq('id', childId)
    .eq('parent_id', user.id)
    .single()
  if (!child) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { subject, tier } = await req.json()

  const topics = getTopicsForGradeSubject(child.grade, subject as 'math' | 'reading')
  if (topics.length === 0) {
    return NextResponse.json({ error: 'unknown_subject' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const rows = topics.map((t) => ({
    child_id: childId,
    subject,
    topic: t.name,
    language_level: tier,
    sessions_at_level: 0,
    promotion_ready: false,
    updated_at: now,
  }))

  const { error } = await supabase
    .from('child_topic_levels')
    .upsert(rows, { onConflict: 'child_id,subject,topic' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ updated: rows.length })
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npx vitest run "app/api/children/\[id\]/learning-level/route.test.ts"
```

Expected: all 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add "app/api/children/[id]/learning-level/route.ts" "app/api/children/[id]/learning-level/route.test.ts"
git commit -m "feat: add learning-level API route — bulk-set subject tier for a child"
```

---

## Task 5: Promote API Route

**Files:**
- Create: `app/api/children/[id]/promote/route.ts`
- Create: `app/api/children/[id]/promote/route.test.ts`

- [ ] **Step 1: Write the failing test**

Create `app/api/children/[id]/promote/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'

function makeClient(childData: unknown, topicLevelRows: unknown[]) {
  const upsertMock = vi.fn().mockResolvedValue({ error: null })
  const topicChain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    upsert: upsertMock,
  }
  topicChain.then = (resolve: (v: unknown) => void) =>
    Promise.resolve({ data: topicLevelRows, error: null }).then(resolve)

  const client = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'parent-1' } } }) },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'children') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: childData, error: null }),
        }
      }
      return topicChain
    }),
  }
  return { client, upsertMock }
}

beforeEach(() => vi.clearAllMocks())

describe('POST /api/children/[id]/promote', () => {
  it('advances language_level foundational→simplified on confirm', async () => {
    const { client, upsertMock } = makeClient(
      { id: 'child-1' },
      [{ topic: 'fractions', language_level: 'foundational' }, { topic: 'geometry', language_level: 'foundational' }]
    )
    vi.mocked(createClient).mockResolvedValue(client as any)

    const req = new NextRequest('http://localhost/api/children/child-1/promote', {
      method: 'POST',
      body: JSON.stringify({ subject: 'math', action: 'confirm' }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'child-1' }) })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ affected: 2 })
    expect(upsertMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ language_level: 'simplified', promotion_ready: false, sessions_at_level: 0 }),
      ]),
      expect.any(Object)
    )
  })

  it('clears promotion_ready and resets sessions without changing level on dismiss', async () => {
    const { client, upsertMock } = makeClient(
      { id: 'child-1' },
      [{ topic: 'fractions', language_level: 'foundational' }]
    )
    vi.mocked(createClient).mockResolvedValue(client as any)

    const req = new NextRequest('http://localhost/api/children/child-1/promote', {
      method: 'POST',
      body: JSON.stringify({ subject: 'math', action: 'dismiss' }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'child-1' }) })

    expect(res.status).toBe(200)
    expect(upsertMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ language_level: 'foundational', promotion_ready: false, sessions_at_level: 0 }),
      ]),
      expect.any(Object)
    )
  })

  it('returns 409 when no promotion-ready rows exist', async () => {
    const { client } = makeClient({ id: 'child-1' }, [])
    vi.mocked(createClient).mockResolvedValue(client as any)

    const req = new NextRequest('http://localhost/api/children/child-1/promote', {
      method: 'POST',
      body: JSON.stringify({ subject: 'math', action: 'confirm' }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'child-1' }) })
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: 'not_ready' })
  })

  it('returns 404 when child does not belong to parent', async () => {
    const { client } = makeClient(null, [])
    vi.mocked(createClient).mockResolvedValue(client as any)

    const req = new NextRequest('http://localhost/api/children/child-1/promote', {
      method: 'POST',
      body: JSON.stringify({ subject: 'math', action: 'confirm' }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'child-1' }) })
    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx vitest run "app/api/children/\[id\]/promote/route.test.ts"
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create the route**

Create `app/api/children/[id]/promote/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const NEXT_LEVEL: Record<string, string> = {
  foundational: 'simplified',
  simplified: 'standard',
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: childId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: child } = await supabase
    .from('children')
    .select('id')
    .eq('id', childId)
    .eq('parent_id', user.id)
    .single()
  if (!child) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { subject, action } = await req.json()

  const { data: readyRows } = await supabase
    .from('child_topic_levels')
    .select('topic, language_level')
    .eq('child_id', childId)
    .eq('subject', subject)
    .eq('promotion_ready', true)

  if (!readyRows || readyRows.length === 0) {
    return NextResponse.json({ error: 'not_ready' }, { status: 409 })
  }

  const now = new Date().toISOString()
  let updates: Record<string, unknown>[]

  if (action === 'confirm') {
    updates = readyRows.map((row: { topic: string; language_level: string }) => ({
      child_id: childId,
      subject,
      topic: row.topic,
      language_level: NEXT_LEVEL[row.language_level] ?? 'simplified',
      sessions_at_level: 0,
      promotion_ready: false,
      previous_level: row.language_level,
      changed_at: now,
      updated_at: now,
    }))
  } else {
    // dismiss — clear the flag and reset counter without changing level
    updates = readyRows.map((row: { topic: string; language_level: string }) => ({
      child_id: childId,
      subject,
      topic: row.topic,
      language_level: row.language_level,
      sessions_at_level: 0,
      promotion_ready: false,
      updated_at: now,
    }))
  }

  const { error } = await supabase
    .from('child_topic_levels')
    .upsert(updates, { onConflict: 'child_id,subject,topic' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ affected: readyRows.length })
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npx vitest run "app/api/children/\[id\]/promote/route.test.ts"
```

Expected: all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add "app/api/children/[id]/promote/route.ts" "app/api/children/[id]/promote/route.test.ts"
git commit -m "feat: add promote API route — confirm or dismiss subject promotion for a child"
```

---

## Task 6: Admin Generate Form Tier Selector

**Prerequisite:** QG-1 must be deployed. Files `lib/generation/generate-topic.ts`, `components/admin/generate-review-client.tsx`, and `app/api/admin/generate/route.ts` already exist.

**Files:**
- Modify: `lib/generation/generate-topic.ts`
- Modify: `components/admin/generate-review-client.tsx`
- Modify: `app/api/admin/generate/route.ts`

No TDD for these UI/prompt changes — test manually.

- [ ] **Step 1: Extend `lib/generation/generate-topic.ts` with optional `tier` param**

Add `tier?: 'foundational' | 'standard'` to the function signature. When `tier === 'foundational'`, prepend foundational instructions to the system prompt.

Find the function signature (currently `async function generateTopic(grade, subject, topic)`) and update:

```ts
export async function generateTopic(
  grade: number,
  subject: 'math' | 'reading',
  topic: SolTopic,
  tier: 'foundational' | 'standard' = 'standard'
): Promise<GeneratedQuestion[]>
```

Find where the system prompt / instructions are built. Add this block before the existing prompt when `tier === 'foundational'`:

```ts
const foundationalInstructions = tier === 'foundational'
  ? `IMPORTANT: These questions are for children with special needs. You MUST follow these rules:
- Every sentence must be 10 words or fewer.
- Each question tests exactly ONE concept — no compound ideas.
- Use only Grade 1–2 vocabulary. No subject-specific jargon unless it is the core concept being tested.
- Use concrete, everyday scenarios (sharing food, counting objects, reading a sign).
- The simplified_text field must be null — do not populate it.
- All other fields (answer_type, choices, hints, difficulty, sol_standard) follow the normal format.\n\n`
  : ''
```

Prepend `foundationalInstructions` to the system prompt string.

- [ ] **Step 2: Add `tier` state and selector to `generate-review-client.tsx`**

In `GenerateReviewClient`, add to the state section:

```ts
const [tier, setTier] = useState<'standard' | 'foundational'>('standard')
```

In the generation controls JSX, add a Tier selector after the Topic select and before the Generate button:

```tsx
<div>
  <div className="text-xs font-medium text-gray-500 mb-1">Tier</div>
  <select
    value={tier}
    onChange={(e) => setTier(e.target.value as 'standard' | 'foundational')}
    className="border border-gray-300 rounded px-2 py-1 text-sm bg-white w-32"
  >
    <option value="standard">Standard</option>
    <option value="foundational">Foundational</option>
  </select>
</div>
```

In the generate button's click handler, include `tier` in the request body:

```ts
body: JSON.stringify({ grade, subject, topic, tier }),
```

- [ ] **Step 3: Pass `tier` through `app/api/admin/generate/route.ts`**

In the route, extract `tier` from the request body (default `'standard'`):

```ts
const { grade, subject, topic, tier = 'standard' } = await req.json()
```

Pass `tier` to `generateTopic`:

```ts
const questions = await generateTopic(grade, subject, solTopic, tier)
```

Include `tier` in the `questions_pending` bulk insert — add `tier` to each row object:

```ts
const rows = questions.map((q) => ({ ...q, tier, status: 'pending' }))
```

- [ ] **Step 4: Manual verification**

Open the admin generate page (`/admin/generate`). Verify the Tier selector appears. Select "Foundational", choose a grade/subject/topic, click Generate. Confirm questions appear in the pending queue. Open one — verify the question text is noticeably simpler and `simplified_text` is empty/null.

- [ ] **Step 5: Commit**

```bash
git add lib/generation/generate-topic.ts components/admin/generate-review-client.tsx app/api/admin/generate/route.ts
git commit -m "feat: add foundational tier support to admin question generation"
```

---

## Task 7: Edit Child Page — Learning Level Section

**Files:**
- Modify: `app/(parent)/children/[childId]/edit/page.tsx`

No automated tests — manual QA.

- [ ] **Step 1: Add state and data fetching**

At the top of `EditChildPage`, add new state after the existing state declarations:

```ts
const [topicLevels, setTopicLevels] = useState<Array<{
  subject: string
  topic: string
  language_level: string
  promotion_ready: boolean
}>>([])
const [levelLoading, setLevelLoading] = useState(false)
```

Inside the existing `load()` function (in the `useEffect`), after fetching child data, add:

```ts
const { data: levels } = await supabase
  .from('child_topic_levels')
  .select('subject, topic, language_level, promotion_ready')
  .eq('child_id', childId)
setTopicLevels(levels ?? [])
```

- [ ] **Step 2: Add helper functions and handlers**

Add these functions inside `EditChildPage`, before `handleSubmit`:

```ts
function subjectIsFoundational(subject: string) {
  const rows = topicLevels.filter((r) => r.subject === subject)
  if (rows.length === 0) return false
  return rows.filter((r) => r.language_level === 'foundational').length > rows.length / 2
}

function subjectHasPromotionReady(subject: string) {
  return topicLevels.some((r) => r.subject === subject && r.promotion_ready)
}

async function refreshTopicLevels() {
  const supabase = createClient()
  const { data } = await supabase
    .from('child_topic_levels')
    .select('subject, topic, language_level, promotion_ready')
    .eq('child_id', childId)
  setTopicLevels(data ?? [])
}

async function handleSetLearningLevel(subject: string, tier: 'foundational' | 'simplified') {
  setLevelLoading(true)
  await fetch(`/api/children/${childId}/learning-level`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject, tier }),
  })
  await refreshTopicLevels()
  setLevelLoading(false)
}

async function handlePromote(subject: string, action: 'confirm' | 'dismiss') {
  setLevelLoading(true)
  await fetch(`/api/children/${childId}/promote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject, action }),
  })
  await refreshTopicLevels()
  setLevelLoading(false)
}
```

- [ ] **Step 3: Add the Learning Level section to the form JSX**

Add this section inside the `<form>` after the Accommodations section (before the Save Changes button):

```tsx
<div className="space-y-3">
  <Label className="text-base font-semibold">Learning Level</Label>
  <p className="text-sm text-muted-foreground">
    Foundational questions use simpler language for children who need extra support.
  </p>
  {(['math', 'reading'] as const).map((subject) => {
    const isFoundational = subjectIsFoundational(subject)
    const hasPromotion = subjectHasPromotionReady(subject)
    return (
      <div key={subject} className="flex flex-col gap-2 p-3 border rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium capitalize">{subject}</span>
          {isFoundational ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                Foundational
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={levelLoading}
                onClick={() => handleSetLearningLevel(subject, 'simplified')}
              >
                Remove
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={levelLoading}
              onClick={() => handleSetLearningLevel(subject, 'foundational')}
            >
              Set to Foundational
            </Button>
          )}
        </div>
        {hasPromotion && (
          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded p-2">
            <span className="text-xs text-green-700 font-medium">Ready to move up →</span>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                disabled={levelLoading}
                onClick={() => handlePromote(subject, 'confirm')}
              >
                Promote
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={levelLoading}
                onClick={() => handlePromote(subject, 'dismiss')}
              >
                Not yet
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  })}
</div>
```

- [ ] **Step 4: Manual verification**

Open `/children/[childId]/edit`. Verify the Learning Level section appears with Math and Reading rows. Click "Set to Foundational" for Math — verify the button changes to "Foundational" badge + Remove. Set one child's topic levels to `promotion_ready = true` in the DB directly (via Supabase Studio) — verify "Ready to move up" appears and the Promote/Not yet buttons work.

- [ ] **Step 5: Commit**

```bash
git add "app/(parent)/children/[childId]/edit/page.tsx"
git commit -m "feat: add Learning Level section to edit child page"
```

---

## Task 8: Dashboard Promotion Banner

**Files:**
- Create: `components/dashboard/promotion-banner.tsx`
- Modify: `app/(parent)/dashboard/page.tsx`

No automated tests — manual QA.

- [ ] **Step 1: Create `components/dashboard/promotion-banner.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

type PromotionRow = { child_id: string; subject: string; language_level: string }
type Child = { id: string; name: string; avatar: string }

interface Props {
  children: Child[]
  promotionReady: PromotionRow[]
}

export function PromotionBanner({ children, promotionReady }: Props) {
  // Deduplicate to unique (child_id, subject) pairs — multiple topics per subject count as one
  const pairs = [...new Map(
    promotionReady.map((r) => [`${r.child_id}:${r.subject}`, r])
  ).values()]

  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  async function handleAction(childId: string, subject: string, action: 'confirm' | 'dismiss') {
    await fetch(`/api/children/${childId}/promote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, action }),
    })
    setDismissed((prev) => new Set([...prev, `${childId}:${subject}`]))
  }

  const visible = pairs.filter((p) => !dismissed.has(`${p.child_id}:${p.subject}`))
  if (visible.length === 0) return null

  return (
    <div className="space-y-2">
      {visible.map((row) => {
        const child = children.find((c) => c.id === row.child_id)
        if (!child) return null
        return (
          <Card key={`${row.child_id}:${row.subject}`} className="border-green-200 bg-green-50">
            <CardContent className="flex items-center justify-between py-3 px-4">
              <p className="text-sm">
                <span className="mr-1">{child.avatar}</span>
                <strong>{child.name}</strong> is ready to move up in{' '}
                <strong className="capitalize">{row.subject}</strong> — scoring well at the foundational level.
              </p>
              <div className="flex gap-2 ml-4 shrink-0">
                <Button
                  size="sm"
                  onClick={() => handleAction(row.child_id, row.subject, 'confirm')}
                >
                  Promote
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleAction(row.child_id, row.subject, 'dismiss')}
                >
                  Not yet
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Modify `app/(parent)/dashboard/page.tsx`**

After the existing `children` fetch (around line 22), add:

```ts
// Fetch promotion-ready topics across all children
const { data: promotionReadyRows } = children && children.length > 0
  ? await supabase
      .from('child_topic_levels')
      .select('child_id, subject, language_level')
      .in('child_id', children.map((c) => c.id))
      .eq('promotion_ready', true)
  : { data: [] }
```

Add the import at the top of the file:

```ts
import { PromotionBanner } from '@/components/dashboard/promotion-banner'
```

In the JSX return, insert `<PromotionBanner>` between the "Add Child" link and the child selector row (after the `<h1>` block and before the `<div className="flex gap-3...">` child cards):

```tsx
{promotionReadyRows && promotionReadyRows.length > 0 && (
  <PromotionBanner
    children={children}
    promotionReady={promotionReadyRows}
  />
)}
```

- [ ] **Step 3: Run the full test suite to make sure nothing regressed**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 4: Manual verification**

Set a child's topic to `promotion_ready = true` in Supabase Studio. Open `/dashboard` — verify the green banner appears with the child's name and subject. Click "Promote" — verify banner disappears and the topic level advances in the DB. Set it again — click "Not yet" — verify banner disappears and level is unchanged.

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/promotion-banner.tsx "app/(parent)/dashboard/page.tsx"
git commit -m "feat: add promotion banner to dashboard for foundational tier ready-to-promote"
```

---

## Final Verification

- [ ] Run the full test suite one last time

```bash
npx vitest run
```

Expected: all tests pass.
