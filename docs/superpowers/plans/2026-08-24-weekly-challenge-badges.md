# Weekly Challenge Badges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a child redeem the code revealed by solving a Mystery Code puzzle (and auto-award for SOLdle solves and streak milestones) to trigger a badge-reveal animation, and give them a `/badges` page to see every badge they've earned.

**Architecture:** One new table (`child_badges`), one new pure-function module (`lib/weekly-challenge/badges.ts`) for badge content rules, one new route (`/api/weekly-challenge/redeem`) for the Mystery Code code-redemption step, badge-awarding added inline to the existing `/api/weekly-challenge/attempt` route for SOLdle and streak milestones, a new `<BadgeReveal>` component reusing the existing `canvas-confetti` pattern, and a new `/badges` gallery page.

**Tech Stack:** Next.js App Router, Supabase (Postgres + `@supabase/ssr`), Vitest, `canvas-confetti` (already a dependency).

**Spec:** `docs/superpowers/specs/2026-08-24-weekly-challenge-badges-design.md`

## Global Constraints

- No new badge artwork — badges are an emoji + title only, matching the app's existing emoji-driven visual language.
- Badges are a permanent collection keyed by `badge_key`; re-earning the same milestone (e.g. hitting a 5-week streak again after a reset) is a silent no-op, never a duplicate or a second animation.
- Mystery Code badges require the child to re-type the revealed code via `/api/weekly-challenge/redeem`. SOLdle and streak-milestone badges are awarded automatically at solve time inside `/api/weekly-challenge/attempt`.
- `MysteryCodeContent.questions[].revealsDigit` is already sent to the client in the puzzle's `content` JSON before it's solved (pre-existing behavior, out of scope to change here) — so deriving the full code client-side from `content` for a returning, already-solved child is not a new information leak.
- No badge-sharing, no leaderboard, no printable/physical redemption.

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Create | `supabase/migrations/0034_child_badges.sql` | `child_badges` table |
| Create | `lib/weekly-challenge/badges.ts` | `puzzleBadge()`, `streakMilestoneBadge()`, `BadgeAward` type |
| Create | `lib/weekly-challenge/badges.test.ts` | tests |
| Modify | `app/api/weekly-challenge/attempt/route.ts` | award SOLdle + streak badges, add `title` to puzzle select, return `newBadges` |
| Modify | `app/api/weekly-challenge/attempt/route.test.ts` | extend for `newBadges` |
| Create | `app/api/weekly-challenge/redeem/route.ts` | POST: verify code, award Mystery Code badge |
| Create | `app/api/weekly-challenge/redeem/route.test.ts` | tests |
| Create | `components/weekly-challenge/badge-reveal.tsx` | confetti + badge card, dismissible |
| Modify | `components/weekly-challenge/mystery-code.tsx` | redeem-code step + badge reveal |
| Modify | `components/weekly-challenge/soldle.tsx` | badge reveal from `newBadges` |
| Modify | `app/(parent)/challenge/page.tsx` | pass `alreadyRedeemed` to `MysteryCode`, add "My Badges" link |
| Create | `app/(parent)/badges/page.tsx` | badge gallery for the active child |

---

### Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/0034_child_badges.sql`

**Interfaces:**
- Produces: table `child_badges(id, child_id, badge_key, badge_type, band, title, emoji, earned_at)` with `UNIQUE(child_id, badge_key)` — read/written by Tasks 3, 4, and 9.

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/0034_child_badges.sql

CREATE TABLE child_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  badge_key text NOT NULL,
  badge_type text NOT NULL CHECK (badge_type IN ('puzzle', 'streak_milestone')),
  band text NOT NULL CHECK (band IN ('elementary', 'middle')),
  title text NOT NULL,
  emoji text NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(child_id, badge_key)
);

ALTER TABLE child_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "child_badges_own" ON child_badges
  FOR ALL USING (
    EXISTS (SELECT 1 FROM children WHERE id = child_badges.child_id AND parent_id = auth.uid())
  );

CREATE INDEX idx_child_badges_child ON child_badges(child_id);
```

- [ ] **Step 2: Apply the migration**

```bash
npx supabase db reset
```

Expected: migration applies cleanly, no errors. Existing tables/rows are unaffected.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0034_child_badges.sql
git commit -m "feat: add child_badges table"
```

---

### Task 2: Badge content rules

**Files:**
- Create: `lib/weekly-challenge/badges.ts`
- Test: `lib/weekly-challenge/badges.test.ts`

**Interfaces:**
- Consumes: `type Band` from `./band`.
- Produces: `type BadgeType = 'puzzle' | 'streak_milestone'`, `interface BadgeAward { badgeKey: string; badgeType: BadgeType; band: Band; title: string; emoji: string }`, `puzzleBadge(puzzleId: string, puzzleType: 'mystery_code' | 'soldle', title: string, band: Band): BadgeAward`, `streakMilestoneBadge(band: Band, currentStreak: number): BadgeAward | null` — used by Tasks 3 and 4.

- [ ] **Step 1: Write the failing test**

```typescript
// lib/weekly-challenge/badges.test.ts
import { describe, it, expect } from 'vitest'
import { puzzleBadge, streakMilestoneBadge } from './badges'

describe('puzzleBadge', () => {
  it('uses a key emoji for mystery_code', () => {
    const badge = puzzleBadge('puzzle-1', 'mystery_code', 'The Locker Code', 'elementary')
    expect(badge).toEqual({
      badgeKey: 'puzzle:puzzle-1',
      badgeType: 'puzzle',
      band: 'elementary',
      title: 'The Locker Code',
      emoji: '🗝️',
    })
  })

  it('uses a number emoji for soldle', () => {
    const badge = puzzleBadge('puzzle-2', 'soldle', 'Ratio Riddle', 'middle')
    expect(badge.emoji).toBe('🔢')
    expect(badge.badgeKey).toBe('puzzle:puzzle-2')
  })
})

describe('streakMilestoneBadge', () => {
  it('returns null below the first 5-week milestone', () => {
    expect(streakMilestoneBadge('elementary', 4)).toBeNull()
    expect(streakMilestoneBadge('elementary', 0)).toBeNull()
  })

  it('returns a bronze badge at a 5-week streak', () => {
    const badge = streakMilestoneBadge('elementary', 5)
    expect(badge).toEqual({
      badgeKey: 'streak:elementary:5',
      badgeType: 'streak_milestone',
      band: 'elementary',
      title: '5-Week Streak',
      emoji: '🥉',
    })
  })

  it('returns a silver badge at 10 and gold at 15', () => {
    expect(streakMilestoneBadge('middle', 10)?.emoji).toBe('🥈')
    expect(streakMilestoneBadge('middle', 15)?.emoji).toBe('🥇')
  })

  it('caps the tier at a trophy for 20+ week streaks', () => {
    expect(streakMilestoneBadge('middle', 20)?.emoji).toBe('🏆')
    expect(streakMilestoneBadge('middle', 35)?.emoji).toBe('🏆')
  })

  it('returns null for a streak that is not a multiple of 5', () => {
    expect(streakMilestoneBadge('elementary', 6)).toBeNull()
    expect(streakMilestoneBadge('elementary', 11)).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/weekly-challenge/badges.test.ts`
Expected: FAIL — module `./badges` does not exist.

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/weekly-challenge/badges.ts
import type { Band } from './band'

export type BadgeType = 'puzzle' | 'streak_milestone'

export interface BadgeAward {
  badgeKey: string
  badgeType: BadgeType
  band: Band
  title: string
  emoji: string
}

export function puzzleBadge(
  puzzleId: string,
  puzzleType: 'mystery_code' | 'soldle',
  title: string,
  band: Band
): BadgeAward {
  return {
    badgeKey: `puzzle:${puzzleId}`,
    badgeType: 'puzzle',
    band,
    title,
    emoji: puzzleType === 'mystery_code' ? '🗝️' : '🔢',
  }
}

const STREAK_TIER_EMOJI = ['🥉', '🥈', '🥇', '🏆']

export function streakMilestoneBadge(band: Band, currentStreak: number): BadgeAward | null {
  if (currentStreak <= 0 || currentStreak % 5 !== 0) return null

  const tierIndex = Math.min(currentStreak / 5 - 1, STREAK_TIER_EMOJI.length - 1)

  return {
    badgeKey: `streak:${band}:${currentStreak}`,
    badgeType: 'streak_milestone',
    band,
    title: `${currentStreak}-Week Streak`,
    emoji: STREAK_TIER_EMOJI[tierIndex],
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/weekly-challenge/badges.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/weekly-challenge/badges.ts lib/weekly-challenge/badges.test.ts
git commit -m "feat: add weekly-challenge badge content rules"
```

---

### Task 3: Award SOLdle + streak badges in the attempt route

**Files:**
- Modify: `app/api/weekly-challenge/attempt/route.ts`
- Modify: `app/api/weekly-challenge/attempt/route.test.ts`

**Interfaces:**
- Consumes: `puzzleBadge`, `streakMilestoneBadge`, `type BadgeAward` (Task 2).
- Produces: the route's JSON response gains `newBadges: BadgeAward[]` (empty when nothing new was earned) — consumed by Task 6 (Soldle component) and Task 6's sibling change to Mystery Code (which reads `newBadges` for streak badges earned at solve time, separately from the puzzle badge it gets via `/redeem`).

- [ ] **Step 1: Write the failing test additions**

Add these two tests to the existing `describe('POST /api/weekly-challenge/attempt', ...)` block in `app/api/weekly-challenge/attempt/route.test.ts` (keep all existing tests as-is):

```typescript
  it('awards a puzzle badge on a first-time soldle solve', async () => {
    const puzzle = {
      id: 'puzzle-3',
      band: 'middle',
      puzzle_type: 'soldle',
      title: 'Ratio Riddle',
      week_start_date: CURRENT_WEEK,
      content: { concept: 'ratio', clue: 'clue', min: 1, max: 100, maxGuesses: 6 },
      solution: { target: 42 },
    }
    const { client } = makeClient({
      child: { id: 'child-1', grade: 7 },
      puzzle,
      existingAttempt: null,
      parentStreak: {},
    })
    vi.mocked(createClient).mockResolvedValue(client as any)

    const req = new NextRequest('http://localhost/api/weekly-challenge/attempt', {
      method: 'POST',
      body: JSON.stringify({ childId: 'child-1', puzzleId: 'puzzle-3', soldleGuess: 42 }),
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.newBadges).toContainEqual(
      expect.objectContaining({ badgeKey: 'puzzle:puzzle-3', badgeType: 'puzzle', emoji: '🔢' })
    )
  })

  it('returns an empty newBadges array when no badge is earned', async () => {
    const puzzle = {
      id: 'puzzle-1',
      band: 'elementary',
      puzzle_type: 'mystery_code',
      title: 'The Locker Code',
      week_start_date: CURRENT_WEEK,
      content: {
        codeLabel: '2-digit code',
        questions: [{ prompt: '2+2?', choices: ['3', '4'], correctIndex: 1, revealsDigit: '7' }],
      },
      solution: { code: '7' },
    }
    const { client } = makeClient({
      child: { id: 'child-1', grade: 4 },
      puzzle,
      existingAttempt: null,
      parentStreak: {},
    })
    vi.mocked(createClient).mockResolvedValue(client as any)

    const req = new NextRequest('http://localhost/api/weekly-challenge/attempt', {
      method: 'POST',
      body: JSON.stringify({ childId: 'child-1', puzzleId: 'puzzle-1', mysteryAnswerIndexes: [0] }),
    })
    const res = await POST(req)
    const body = await res.json()

    expect(body.solved).toBe(false)
    expect(body.newBadges).toEqual([])
  })
```

Also update the `makeClient` helper in that file to handle the `child_badges` table, since the route will now write to it:

```typescript
      if (table === 'child_badges') {
        return {
          upsert: vi.fn().mockResolvedValue({ error: null }),
        }
      }
```

Add that branch inside the existing `from: vi.fn().mockImplementation((table: string) => { ... })` function, alongside the `children` / `weekly_puzzles` / `weekly_puzzle_attempts` branches.

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx vitest run app/api/weekly-challenge/attempt/route.test.ts`
Expected: the two new tests FAIL (`body.newBadges` is `undefined`); the existing tests still PASS.

- [ ] **Step 3: Update the route implementation**

Replace the full contents of `app/api/weekly-challenge/attempt/route.ts` with:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { gradeToBand } from '@/lib/weekly-challenge/band'
import { getCurrentWeekStartDate } from '@/lib/weekly-challenge/week'
import { computeStreakUpdate, type StreakState } from '@/lib/weekly-challenge/streak'
import { puzzleBadge, streakMilestoneBadge, type BadgeAward } from '@/lib/weekly-challenge/badges'
import {
  checkMysteryCodeAnswers,
  checkSoldleGuess,
  type MysteryCodeContent,
  type SoldleContent,
  type SoldleSolution,
} from '@/lib/weekly-challenge/puzzle-types'

interface AttemptBody {
  childId: string
  puzzleId: string
  mysteryAnswerIndexes?: number[]
  soldleGuess?: number
}

async function awardBadge(
  supabase: Awaited<ReturnType<typeof createClient>>,
  childId: string,
  badge: BadgeAward
) {
  const { error } = await supabase.from('child_badges').upsert(
    {
      child_id: childId,
      badge_key: badge.badgeKey,
      badge_type: badge.badgeType,
      band: badge.band,
      title: badge.title,
      emoji: badge.emoji,
    },
    { onConflict: 'child_id,badge_key', ignoreDuplicates: true }
  )
  return !error
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { childId, puzzleId, mysteryAnswerIndexes, soldleGuess } = await req.json() as AttemptBody

  const { data: child } = await supabase
    .from('children')
    .select('id, grade')
    .eq('id', childId)
    .eq('parent_id', user.id)
    .single()
  if (!child) return NextResponse.json({ error: 'Child not found' }, { status: 404 })

  const currentWeek = getCurrentWeekStartDate()

  const { data: puzzle } = await supabase
    .from('weekly_puzzles')
    .select('id, band, puzzle_type, title, week_start_date, content, solution')
    .eq('id', puzzleId)
    .eq('status', 'approved')
    .eq('week_start_date', currentWeek)
    .single()
  if (!puzzle) return NextResponse.json({ error: 'Puzzle not found' }, { status: 404 })

  const band = gradeToBand(child.grade)
  if (band !== puzzle.band) return NextResponse.json({ error: 'Wrong band' }, { status: 403 })

  const { data: existingAttempt } = await supabase
    .from('weekly_puzzle_attempts')
    .select('solved_at, attempt_count')
    .eq('child_id', childId)
    .eq('puzzle_id', puzzleId)
    .maybeSingle()

  const wasAlreadySolved = Boolean(existingAttempt?.solved_at)
  const priorAttemptCount = existingAttempt?.attempt_count ?? 0

  let solved = false
  let revealedCode: string | undefined
  let feedback: 'correct' | 'too_low' | 'too_high' | undefined

  if (puzzle.puzzle_type === 'mystery_code') {
    const result = checkMysteryCodeAnswers(puzzle.content as MysteryCodeContent, mysteryAnswerIndexes ?? [])
    solved = result.solved
    revealedCode = result.revealedCode
  } else {
    const content = puzzle.content as SoldleContent

    if (!wasAlreadySolved && priorAttemptCount >= content.maxGuesses) {
      return NextResponse.json({ error: 'Out of guesses for this week' }, { status: 403 })
    }
    if (
      typeof soldleGuess !== 'number' ||
      !Number.isInteger(soldleGuess) ||
      soldleGuess < content.min ||
      soldleGuess > content.max
    ) {
      return NextResponse.json({ error: 'Invalid guess' }, { status: 400 })
    }

    feedback = checkSoldleGuess(puzzle.solution as SoldleSolution, soldleGuess)
    solved = feedback === 'correct'
  }

  const attemptCount = priorAttemptCount + 1
  const isFirstSolve = solved && !wasAlreadySolved

  await supabase.from('weekly_puzzle_attempts').upsert(
    {
      child_id: childId,
      puzzle_id: puzzleId,
      band,
      attempt_count: attemptCount,
      solved_at: wasAlreadySolved ? existingAttempt!.solved_at : (solved ? new Date().toISOString() : null),
    },
    { onConflict: 'child_id,puzzle_id' }
  )

  const newBadges: BadgeAward[] = []

  if (isFirstSolve && puzzle.puzzle_type === 'soldle') {
    const badge = puzzleBadge(puzzle.id, 'soldle', puzzle.title as string, band)
    if (await awardBadge(supabase, childId, badge)) newBadges.push(badge)
  }

  let currentStreak: number | undefined
  let bestStreak: number | undefined

  if (isFirstSolve) {
    const currentCol = band === 'elementary' ? 'current_streak_elementary' : 'current_streak_middle'
    const bestCol = band === 'elementary' ? 'best_streak_elementary' : 'best_streak_middle'
    const lastCol = band === 'elementary' ? 'last_solved_week_elementary' : 'last_solved_week_middle'

    const { data: streakRow } = await supabase
      .from('children')
      .select(`${currentCol}, ${bestCol}, ${lastCol}`)
      .eq('id', childId)
      .single()

    const priorState: StreakState = {
      currentStreak: (streakRow as any)?.[currentCol] ?? 0,
      bestStreak: (streakRow as any)?.[bestCol] ?? 0,
      lastSolvedWeek: (streakRow as any)?.[lastCol] ?? null,
    }

    const updated = computeStreakUpdate(priorState, currentWeek)
    currentStreak = updated.currentStreak
    bestStreak = updated.bestStreak

    await supabase
      .from('children')
      .update({
        [currentCol]: updated.currentStreak,
        [bestCol]: updated.bestStreak,
        [lastCol]: updated.lastSolvedWeek,
      })
      .eq('id', childId)

    const streakBadge = streakMilestoneBadge(band, updated.currentStreak)
    if (streakBadge && (await awardBadge(supabase, childId, streakBadge))) {
      newBadges.push(streakBadge)
    }
  }

  return NextResponse.json({
    solved,
    attemptCount,
    ...(revealedCode !== undefined ? { revealedCode } : {}),
    ...(feedback !== undefined ? { feedback } : {}),
    ...(currentStreak !== undefined ? { currentStreak, bestStreak } : {}),
    newBadges,
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run app/api/weekly-challenge/attempt/route.test.ts`
Expected: PASS (8 tests — the 6 existing plus the 2 new ones)

- [ ] **Step 5: Commit**

```bash
git add app/api/weekly-challenge/attempt/route.ts app/api/weekly-challenge/attempt/route.test.ts
git commit -m "feat: award soldle and streak-milestone badges on solve"
```

---

### Task 4: Redeem route (Mystery Code)

**Files:**
- Create: `app/api/weekly-challenge/redeem/route.ts`
- Test: `app/api/weekly-challenge/redeem/route.test.ts`

**Interfaces:**
- Consumes: `puzzleBadge` (Task 2), `gradeToBand` (existing), `getCurrentWeekStartDate` (existing), `createClient` from `@/lib/supabase/server`.
- Produces: `POST` handler at `/api/weekly-challenge/redeem`. Request body: `{ childId: string; puzzleId: string; code: string }`. Response: `{ badge: BadgeAward }` on success, `{ error: string }` with 400/403/404 on failure — consumed by Task 6 (Mystery Code component).

- [ ] **Step 1: Write the failing test**

```typescript
// app/api/weekly-challenge/redeem/route.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'

const CURRENT_WEEK = '2026-08-24'

function makeClient(opts: {
  child: { id: string; grade: number } | null
  puzzle: Record<string, unknown> | null
  attempt: Record<string, unknown> | null
}) {
  const upsertBadgeMock = vi.fn().mockResolvedValue({ error: null })

  const client = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'parent-1' } } }) },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'children') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: opts.child, error: null }),
        }
      }
      if (table === 'weekly_puzzles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: opts.puzzle, error: null }),
        }
      }
      if (table === 'weekly_puzzle_attempts') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: opts.attempt, error: null }),
        }
      }
      if (table === 'child_badges') {
        return { upsert: upsertBadgeMock }
      }
      throw new Error(`Unexpected table: ${table}`)
    }),
  }
  return { client, upsertBadgeMock }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(new Date(`${CURRENT_WEEK}T15:00:00Z`))
})

afterEach(() => {
  vi.useRealTimers()
})

const puzzle = {
  id: 'puzzle-1',
  band: 'elementary',
  puzzle_type: 'mystery_code',
  title: 'The Locker Code',
  week_start_date: CURRENT_WEEK,
  solution: { code: '419' },
}

describe('POST /api/weekly-challenge/redeem', () => {
  it('awards the puzzle badge when the code matches and the puzzle was solved', async () => {
    const { client, upsertBadgeMock } = makeClient({
      child: { id: 'child-1', grade: 4 },
      puzzle,
      attempt: { solved_at: '2026-08-24T12:00:00Z' },
    })
    vi.mocked(createClient).mockResolvedValue(client as any)

    const req = new NextRequest('http://localhost/api/weekly-challenge/redeem', {
      method: 'POST',
      body: JSON.stringify({ childId: 'child-1', puzzleId: 'puzzle-1', code: '419' }),
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.badge).toEqual(
      expect.objectContaining({ badgeKey: 'puzzle:puzzle-1', title: 'The Locker Code', emoji: '🗝️' })
    )
    expect(upsertBadgeMock).toHaveBeenCalledWith(
      expect.objectContaining({ child_id: 'child-1', badge_key: 'puzzle:puzzle-1' }),
      expect.objectContaining({ onConflict: 'child_id,badge_key' })
    )
  })

  it('returns 400 when the code is wrong', async () => {
    const { client, upsertBadgeMock } = makeClient({
      child: { id: 'child-1', grade: 4 },
      puzzle,
      attempt: { solved_at: '2026-08-24T12:00:00Z' },
    })
    vi.mocked(createClient).mockResolvedValue(client as any)

    const req = new NextRequest('http://localhost/api/weekly-challenge/redeem', {
      method: 'POST',
      body: JSON.stringify({ childId: 'child-1', puzzleId: 'puzzle-1', code: '000' }),
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe('incorrect_code')
    expect(upsertBadgeMock).not.toHaveBeenCalled()
  })

  it('returns 404 when the child has not solved the puzzle yet', async () => {
    const { client } = makeClient({
      child: { id: 'child-1', grade: 4 },
      puzzle,
      attempt: null,
    })
    vi.mocked(createClient).mockResolvedValue(client as any)

    const req = new NextRequest('http://localhost/api/weekly-challenge/redeem', {
      method: 'POST',
      body: JSON.stringify({ childId: 'child-1', puzzleId: 'puzzle-1', code: '419' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(404)
  })

  it('returns 404 when the puzzle is not approved for the current week', async () => {
    const { client } = makeClient({
      child: { id: 'child-1', grade: 4 },
      puzzle: null,
      attempt: null,
    })
    vi.mocked(createClient).mockResolvedValue(client as any)

    const req = new NextRequest('http://localhost/api/weekly-challenge/redeem', {
      method: 'POST',
      body: JSON.stringify({ childId: 'child-1', puzzleId: 'old-puzzle', code: '419' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(404)
  })

  it('is idempotent when redeeming an already-claimed badge again', async () => {
    const { client, upsertBadgeMock } = makeClient({
      child: { id: 'child-1', grade: 4 },
      puzzle,
      attempt: { solved_at: '2026-08-24T12:00:00Z' },
    })
    vi.mocked(createClient).mockResolvedValue(client as any)

    const req = new NextRequest('http://localhost/api/weekly-challenge/redeem', {
      method: 'POST',
      body: JSON.stringify({ childId: 'child-1', puzzleId: 'puzzle-1', code: '419' }),
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.badge.badgeKey).toBe('puzzle:puzzle-1')
    expect(upsertBadgeMock).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/api/weekly-challenge/redeem/route.test.ts`
Expected: FAIL — `./route` does not exist.

- [ ] **Step 3: Write the implementation**

```typescript
// app/api/weekly-challenge/redeem/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { gradeToBand } from '@/lib/weekly-challenge/band'
import { getCurrentWeekStartDate } from '@/lib/weekly-challenge/week'
import { puzzleBadge } from '@/lib/weekly-challenge/badges'
import type { MysteryCodeSolution } from '@/lib/weekly-challenge/puzzle-types'

interface RedeemBody {
  childId: string
  puzzleId: string
  code: string
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { childId, puzzleId, code } = await req.json() as RedeemBody

  const { data: child } = await supabase
    .from('children')
    .select('id, grade')
    .eq('id', childId)
    .eq('parent_id', user.id)
    .single()
  if (!child) return NextResponse.json({ error: 'Child not found' }, { status: 404 })

  const currentWeek = getCurrentWeekStartDate()

  const { data: puzzle } = await supabase
    .from('weekly_puzzles')
    .select('id, band, puzzle_type, title, week_start_date, solution')
    .eq('id', puzzleId)
    .eq('status', 'approved')
    .eq('week_start_date', currentWeek)
    .eq('puzzle_type', 'mystery_code')
    .single()
  if (!puzzle) return NextResponse.json({ error: 'Puzzle not found' }, { status: 404 })

  const band = gradeToBand(child.grade)
  if (band !== puzzle.band) return NextResponse.json({ error: 'Wrong band' }, { status: 403 })

  const { data: attempt } = await supabase
    .from('weekly_puzzle_attempts')
    .select('solved_at')
    .eq('child_id', childId)
    .eq('puzzle_id', puzzleId)
    .maybeSingle()
  if (!attempt?.solved_at) return NextResponse.json({ error: 'Not solved yet' }, { status: 404 })

  const solution = puzzle.solution as MysteryCodeSolution
  if (typeof code !== 'string' || code.trim() !== solution.code) {
    return NextResponse.json({ error: 'incorrect_code' }, { status: 400 })
  }

  const badge = puzzleBadge(puzzle.id, 'mystery_code', puzzle.title as string, band)

  await supabase.from('child_badges').upsert(
    {
      child_id: childId,
      badge_key: badge.badgeKey,
      badge_type: badge.badgeType,
      band: badge.band,
      title: badge.title,
      emoji: badge.emoji,
    },
    { onConflict: 'child_id,badge_key', ignoreDuplicates: true }
  )

  return NextResponse.json({ badge })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/api/weekly-challenge/redeem/route.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add app/api/weekly-challenge/redeem/route.ts app/api/weekly-challenge/redeem/route.test.ts
git commit -m "feat: add weekly-challenge code redemption route"
```

---

### Task 5: BadgeReveal component

**Files:**
- Create: `components/weekly-challenge/badge-reveal.tsx`

**Interfaces:**
- Consumes: `type BadgeAward` (Task 2), dynamically imports `canvas-confetti` (same pattern as `components/practice/session-complete.tsx`).
- Produces: `<BadgeReveal badge={BadgeAward} onDismiss={() => void} />` — consumed by Task 6 (both puzzle components).

- [ ] **Step 1: Write the component**

```tsx
// components/weekly-challenge/badge-reveal.tsx
'use client'

import { useEffect } from 'react'
import type { BadgeAward } from '@/lib/weekly-challenge/badges'

interface Props {
  badge: BadgeAward
  onDismiss: () => void
}

async function fireBadgeConfetti() {
  const confetti = (await import('canvas-confetti')).default
  confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } })
}

export function BadgeReveal({ badge, onDismiss }: Props) {
  useEffect(() => {
    fireBadgeConfetti()
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-background rounded-2xl border p-8 max-w-xs w-full text-center space-y-3 shadow-xl">
        <div className="text-6xl">{badge.emoji}</div>
        <p className="text-lg font-bold">Badge earned!</p>
        <p className="text-sm text-muted-foreground">{badge.title}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="mt-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold"
        >
          Nice!
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Manually verify with the dev server**

There's no standalone route for this component yet — Task 6 wires it in. Skip manual verification until then.

- [ ] **Step 3: Commit**

```bash
git add components/weekly-challenge/badge-reveal.tsx
git commit -m "feat: add badge reveal component"
```

---

### Task 6: Wire badges into Mystery Code and SOLdle components

**Files:**
- Modify: `components/weekly-challenge/mystery-code.tsx`
- Modify: `components/weekly-challenge/soldle.tsx`

**Interfaces:**
- Consumes: `BadgeReveal` (Task 5), `type BadgeAward` (Task 2), the `newBadges` field on `/api/weekly-challenge/attempt` responses (Task 3), the new `/api/weekly-challenge/redeem` route (Task 4).
- Produces: `MysteryCode` gains a new required prop `alreadyRedeemed: boolean` — consumed by Task 7 (`/challenge/page.tsx`).

- [ ] **Step 1: Replace `components/weekly-challenge/mystery-code.tsx`**

```tsx
// components/weekly-challenge/mystery-code.tsx
'use client'

import { useState } from 'react'
import type { MysteryCodeContent } from '@/lib/weekly-challenge/puzzle-types'
import type { BadgeAward } from '@/lib/weekly-challenge/badges'
import { BadgeReveal } from './badge-reveal'

interface Props {
  childId: string
  puzzleId: string
  title: string
  content: MysteryCodeContent
  alreadySolved: boolean
  alreadyRedeemed: boolean
}

export function MysteryCode({ childId, puzzleId, title, content, alreadySolved, alreadyRedeemed }: Props) {
  const [answers, setAnswers] = useState<(number | null)[]>(content.questions.map(() => null))
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ solved: boolean; revealedCode: string } | null>(null)
  const [redeemCode, setRedeemCode] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const [redeemError, setRedeemError] = useState<string | null>(null)
  const [redeemed, setRedeemed] = useState(alreadyRedeemed)
  const [badgeQueue, setBadgeQueue] = useState<BadgeAward[]>([])

  const solved = alreadySolved || result?.solved
  const canSubmit = !solved && answers.every((a) => a !== null) && !submitting
  // Every revealsDigit is already present in `content` before solving (pre-existing
  // behavior), so recomputing the full code for a returning, already-solved child
  // is not a new information leak.
  const fullCode = content.questions.map((q) => q.revealsDigit).join('')
  const displayCode = result?.revealedCode ?? (alreadySolved ? fullCode : undefined)

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const res = await fetch('/api/weekly-challenge/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId, puzzleId, mysteryAnswerIndexes: answers }),
      })
      const body = await res.json()
      if (res.ok) {
        setResult({ solved: body.solved, revealedCode: body.revealedCode })
        if (body.newBadges?.length) setBadgeQueue((prev) => [...prev, ...body.newBadges])
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRedeem() {
    setRedeeming(true)
    setRedeemError(null)
    try {
      const res = await fetch('/api/weekly-challenge/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId, puzzleId, code: redeemCode }),
      })
      const body = await res.json()
      if (res.ok) {
        setRedeemed(true)
        setBadgeQueue((prev) => [...prev, body.badge])
      } else {
        setRedeemError("That's not quite right — check the code above.")
      }
    } finally {
      setRedeeming(false)
    }
  }

  return (
    <div className="space-y-5 rounded-xl border p-5">
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">
          Answer all {content.questions.length} questions to reveal the {content.codeLabel}.
        </p>
      </div>

      {solved ? (
        <div className="space-y-4">
          <p className="text-lg font-bold text-primary">
            🎉 Solved! The code was {displayCode}.
          </p>
          {!redeemed && (
            <div className="space-y-2">
              <label className="text-sm font-medium block">Enter your code to claim the badge</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={redeemCode}
                  onChange={(e) => setRedeemCode(e.target.value)}
                  className="rounded-lg border px-3 py-1.5 text-sm w-32"
                  placeholder="Code"
                />
                <button
                  type="button"
                  onClick={handleRedeem}
                  disabled={redeeming || !redeemCode}
                  className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  {redeeming ? 'Checking...' : 'Redeem'}
                </button>
              </div>
              {redeemError && <p className="text-sm text-red-600">{redeemError}</p>}
            </div>
          )}
          {redeemed && <p className="text-sm text-muted-foreground">🏅 Badge claimed!</p>}
        </div>
      ) : (
        <>
          {content.questions.map((q, qi) => (
            <div key={qi} className="space-y-2">
              <p className="text-sm font-medium">{q.prompt}</p>
              <div className="flex flex-wrap gap-2">
                {q.choices.map((choice, ci) => (
                  <button
                    key={ci}
                    type="button"
                    onClick={() =>
                      setAnswers((prev) => prev.map((a, i) => (i === qi ? ci : a)))
                    }
                    className={`rounded-lg border px-3 py-1.5 text-sm ${
                      answers[qi] === ci ? 'border-primary bg-primary/10' : 'border-muted'
                    }`}
                  >
                    {choice}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {result && !result.solved && (
            <p className="text-sm text-muted-foreground">
              Partial code: {result.revealedCode} — try again!
            </p>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {submitting ? 'Checking...' : 'Submit answers'}
          </button>
        </>
      )}

      {badgeQueue.length > 0 && (
        <BadgeReveal
          badge={badgeQueue[0]}
          onDismiss={() => setBadgeQueue((prev) => prev.slice(1))}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Replace `components/weekly-challenge/soldle.tsx`**

```tsx
// components/weekly-challenge/soldle.tsx
'use client'

import { useState } from 'react'
import type { SoldleContent } from '@/lib/weekly-challenge/puzzle-types'
import type { BadgeAward } from '@/lib/weekly-challenge/badges'
import { BadgeReveal } from './badge-reveal'

interface Props {
  childId: string
  puzzleId: string
  title: string
  content: SoldleContent
  alreadySolved: boolean
}

interface GuessRecord {
  guess: number
  feedback: 'correct' | 'too_low' | 'too_high'
}

export function Soldle({ childId, puzzleId, title, content, alreadySolved }: Props) {
  const [guessValue, setGuessValue] = useState('')
  const [history, setHistory] = useState<GuessRecord[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [badgeQueue, setBadgeQueue] = useState<BadgeAward[]>([])

  const solved = alreadySolved || history.some((h) => h.feedback === 'correct')
  const outOfGuesses = history.length >= content.maxGuesses && !solved
  const canGuess = !solved && !outOfGuesses && guessValue !== '' && !submitting

  async function handleGuess() {
    const guess = Number(guessValue)
    if (Number.isNaN(guess)) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/weekly-challenge/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId, puzzleId, soldleGuess: guess }),
      })
      const body = await res.json()
      if (res.ok) {
        setHistory((prev) => [...prev, { guess, feedback: body.feedback }])
        setGuessValue('')
        if (body.newBadges?.length) setBadgeQueue((prev) => [...prev, ...body.newBadges])
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5 rounded-xl border border-border p-5">
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{content.clue}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Guess a number between {content.min} and {content.max}. {content.maxGuesses - history.length} guesses left.
        </p>
      </div>

      <ul className="space-y-1">
        {history.map((h, i) => (
          <li key={i} className="text-sm">
            {h.guess} —{' '}
            {h.feedback === 'correct' ? '🎉 Correct!' : h.feedback === 'too_low' ? '⬆️ Too low' : '⬇️ Too high'}
          </li>
        ))}
      </ul>

      {solved ? (
        <p className="text-lg font-bold text-primary">🎉 Solved!</p>
      ) : outOfGuesses ? (
        <p className="text-sm text-muted-foreground">Out of guesses for this week — see you next Monday!</p>
      ) : (
        <div className="flex gap-2">
          <input
            type="number"
            value={guessValue}
            onChange={(e) => setGuessValue(e.target.value)}
            className="rounded-lg border border-border px-3 py-1.5 text-sm w-32"
            placeholder="Your guess"
          />
          <button
            type="button"
            onClick={handleGuess}
            disabled={!canGuess}
            className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {submitting ? 'Checking...' : 'Guess'}
          </button>
        </div>
      )}

      {badgeQueue.length > 0 && (
        <BadgeReveal
          badge={badgeQueue[0]}
          onDismiss={() => setBadgeQueue((prev) => prev.slice(1))}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Run the full weekly-challenge test suite**

Run: `npx vitest run lib/weekly-challenge app/api/weekly-challenge`
Expected: still PASS — component changes don't have their own test files in this codebase's existing pattern (no component tests exist for `mystery-code.tsx`/`soldle.tsx` today), but this confirms nothing in the routes/lib layer regressed.

Also run: `npx tsc --noEmit` and confirm no new errors reference `mystery-code.tsx`, `soldle.tsx`, or `badge-reveal.tsx`. `MysteryCode` now requires `alreadyRedeemed` — this will show a type error at its call site in `app/(parent)/challenge/page.tsx` until Task 7 updates that file; that's expected at this point in the plan.

- [ ] **Step 4: Commit**

```bash
git add components/weekly-challenge/mystery-code.tsx components/weekly-challenge/soldle.tsx
git commit -m "feat: wire badge redemption and reveal into puzzle components"
```

---

### Task 7: Wire `alreadyRedeemed` and a "My Badges" link into the challenge page

**Files:**
- Modify: `app/(parent)/challenge/page.tsx`

**Interfaces:**
- Consumes: updated `MysteryCode` props (Task 6).
- Produces: no new exports — this is a leaf page.

- [ ] **Step 1: Replace `app/(parent)/challenge/page.tsx`**

```tsx
// app/(parent)/challenge/page.tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { gradeToBand } from '@/lib/weekly-challenge/band'
import { getCurrentWeekStartDate } from '@/lib/weekly-challenge/week'
import { MysteryCode } from '@/components/weekly-challenge/mystery-code'
import { Soldle } from '@/components/weekly-challenge/soldle'
import type { MysteryCodeContent, SoldleContent } from '@/lib/weekly-challenge/puzzle-types'

export default async function ChallengePage({
  searchParams,
}: {
  searchParams: Promise<{ childId?: string }>
}) {
  const { childId: selectedId } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: children } = await supabase
    .from('children')
    .select('id, name, grade, avatar')
    .eq('parent_id', user.id)
    .order('created_at')

  if (!children || children.length === 0) redirect('/children/new')

  const activeChild = children.find((c) => c.id === selectedId) ?? children[0]
  const band = gradeToBand(activeChild.grade)
  const weekStartDate = getCurrentWeekStartDate()

  const { data: puzzle } = await supabase
    .from('weekly_puzzles')
    .select('id, puzzle_type, title, content')
    .eq('band', band)
    .eq('status', 'approved')
    .eq('week_start_date', weekStartDate)
    .maybeSingle()

  const currentCol = band === 'elementary' ? 'current_streak_elementary' : 'current_streak_middle'
  const { data: childStreak } = await supabase
    .from('children')
    .select(currentCol)
    .eq('id', activeChild.id)
    .single()

  const { data: attempt } = puzzle
    ? await supabase
        .from('weekly_puzzle_attempts')
        .select('solved_at, attempt_count')
        .eq('child_id', activeChild.id)
        .eq('puzzle_id', puzzle.id)
        .maybeSingle()
    : { data: null }

  const { data: existingBadge } = puzzle
    ? await supabase
        .from('child_badges')
        .select('id')
        .eq('child_id', activeChild.id)
        .eq('badge_key', `puzzle:${puzzle.id}`)
        .maybeSingle()
    : { data: null }

  const streakCount = (childStreak as Record<string, number> | null)?.[currentCol] ?? 0

  return (
    <main className="max-w-lg mx-auto p-6 space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          🧩 Weekly Challenge
        </h1>
        <p className="text-sm text-muted-foreground">
          One puzzle a week, no pressure — just a few fun minutes.
        </p>
      </div>

      {children.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {children.map((child) => (
            <Link
              key={child.id}
              href={`/challenge?childId=${child.id}`}
              className={`inline-flex items-center rounded-lg border px-3 h-8 text-sm font-medium transition-colors whitespace-nowrap ${
                child.id === activeChild.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background hover:bg-muted'
              }`}
            >
              {child.name}
            </Link>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        {streakCount > 0 ? (
          <p className="text-sm text-muted-foreground">
            🔥 {activeChild.name}&apos;s streak: {streakCount} week{streakCount === 1 ? '' : 's'}
          </p>
        ) : <span />}
        <Link href={`/badges?childId=${activeChild.id}`} className="text-sm text-primary hover:underline">
          🏅 My Badges
        </Link>
      </div>

      {!puzzle ? (
        <p className="text-sm text-muted-foreground">
          No challenge is live for {activeChild.name} this week yet — check back soon!
        </p>
      ) : puzzle.puzzle_type === 'mystery_code' ? (
        <MysteryCode
          childId={activeChild.id}
          puzzleId={puzzle.id}
          title={puzzle.title}
          content={puzzle.content as MysteryCodeContent}
          alreadySolved={Boolean(attempt?.solved_at)}
          alreadyRedeemed={Boolean(existingBadge)}
        />
      ) : (
        <Soldle
          childId={activeChild.id}
          puzzleId={puzzle.id}
          title={puzzle.title}
          content={puzzle.content as SoldleContent}
          alreadySolved={Boolean(attempt?.solved_at)}
        />
      )}
    </main>
  )
}
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: the `MysteryCode` call-site error from Task 6 Step 3 is now gone. No new errors in weekly-challenge files.

- [ ] **Step 3: Manually verify in the dev server**

```bash
npm run dev
```

Visit `/challenge` as a parent with a child who has an approved Mystery Code puzzle for the current week. Solve it, confirm the "Enter your code to claim the badge" box appears, type the correct code, confirm confetti + the badge card appear. Reload the page — confirm the "already claimed" state shows instead of the redeem box (no code re-entry offered once redeemed).

- [ ] **Step 4: Commit**

```bash
git add "app/(parent)/challenge/page.tsx"
git commit -m "feat: wire alreadyRedeemed and add My Badges link to challenge page"
```

---

### Task 8: Badges gallery page

**Files:**
- Create: `app/(parent)/badges/page.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`.
- Produces: the `/badges` route. Server component, no exported functions consumed elsewhere.

- [ ] **Step 1: Write the page**

```tsx
// app/(parent)/badges/page.tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

interface ChildBadge {
  id: string
  badge_key: string
  badge_type: 'puzzle' | 'streak_milestone'
  title: string
  emoji: string
  earned_at: string
}

export default async function BadgesPage({
  searchParams,
}: {
  searchParams: Promise<{ childId?: string }>
}) {
  const { childId: selectedId } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: children } = await supabase
    .from('children')
    .select('id, name')
    .eq('parent_id', user.id)
    .order('created_at')

  if (!children || children.length === 0) redirect('/children/new')

  const activeChild = children.find((c) => c.id === selectedId) ?? children[0]

  const { data: badges } = await supabase
    .from('child_badges')
    .select('id, badge_key, badge_type, title, emoji, earned_at')
    .eq('child_id', activeChild.id)
    .order('earned_at', { ascending: false })

  const puzzleBadges = (badges as ChildBadge[] | null)?.filter((b) => b.badge_type === 'puzzle') ?? []
  const streakBadges = (badges as ChildBadge[] | null)?.filter((b) => b.badge_type === 'streak_milestone') ?? []

  function BadgeGrid({ items }: { items: ChildBadge[] }) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {items.map((b) => (
          <div key={b.id} className="flex flex-col items-center gap-1 rounded-xl border border-border p-3 text-center">
            <span className="text-3xl">{b.emoji}</span>
            <span className="text-xs font-medium">{b.title}</span>
            <span className="text-[10px] text-muted-foreground">
              {new Date(b.earned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <main className="max-w-lg mx-auto p-6 space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold flex items-center gap-2">🏅 My Badges</h1>
        <p className="text-sm text-muted-foreground">Badges {activeChild.name} has earned from the Weekly Challenge.</p>
      </div>

      {children.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {children.map((child) => (
            <Link
              key={child.id}
              href={`/badges?childId=${child.id}`}
              className={`inline-flex items-center rounded-lg border px-3 h-8 text-sm font-medium transition-colors whitespace-nowrap ${
                child.id === activeChild.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background hover:bg-muted'
              }`}
            >
              {child.name}
            </Link>
          ))}
        </div>
      )}

      {puzzleBadges.length === 0 && streakBadges.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No badges yet —{' '}
          <Link href={`/challenge?childId=${activeChild.id}`} className="text-primary hover:underline">
            solve this week&apos;s challenge
          </Link>{' '}
          to earn your first one!
        </p>
      ) : (
        <div className="space-y-6">
          {puzzleBadges.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold">Puzzle Badges</h2>
              <BadgeGrid items={puzzleBadges} />
            </section>
          )}
          {streakBadges.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold">Streak Badges</h2>
              <BadgeGrid items={streakBadges} />
            </section>
          )}
        </div>
      )}
    </main>
  )
}
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: no errors referencing `app/(parent)/badges/page.tsx`.

- [ ] **Step 3: Manually verify in the dev server**

Visit `/badges` for a child with earned badges — confirm the grid renders grouped correctly. Visit `/badges` for a child with none — confirm the empty state and its link to `/challenge` work.

- [ ] **Step 4: Commit**

```bash
git add "app/(parent)/badges/page.tsx"
git commit -m "feat: add badges gallery page"
```

---

## After This Plan

- Run the full test suite (`npx vitest run`) and `npx tsc --noEmit` one more time to confirm nothing regressed across the whole app, not just the weekly-challenge files.
- Apply `supabase/migrations/0034_child_badges.sql` to the production database (same manual step as `0033_weekly_challenge.sql` was applied).
- No admin UI changes are needed — badges are earned automatically through existing approved puzzles; nothing to review/approve.
