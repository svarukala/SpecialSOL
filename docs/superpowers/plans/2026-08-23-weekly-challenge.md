# Weekly Challenge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a weekly puzzle (one per grade band) that each child solves independently on their own profile, tracked with a per-child streak, to re-engage existing families outside the Feb–Apr SOL season.

**Architecture:** Two new tables (`weekly_puzzles`, `weekly_puzzle_attempts`) plus per-band streak columns on `children`. Puzzle content/answer-checking is pure, testable TypeScript shared between a `MysteryCode` (Elementary) and `Soldle` (Middle) client component. A single `POST /api/weekly-challenge/attempt` route checks the answer, records the attempt, and updates the child's streak. Content is authored offline in a one-off script (no runtime AI calls) and reviewed directly in the DB before being scheduled, mirroring the existing `questions_pending` → `questions` workflow.

**Tech Stack:** Next.js App Router, Supabase (Postgres + `@supabase/ssr`), Vitest, Resend (existing `lib/email/*`).

**Spec:** `docs/superpowers/specs/2026-08-23-weekly-challenge-design.md`

## Global Constraints

- Grade band: `grade <= 5` → `elementary`, `grade >= 6` → `middle` (mirrors the existing `isMiddleSchool(grade) = grade >= 6` convention in `lib/generation/generate-topic.ts:7`).
- Puzzle content is shared per band; attempts and streaks are per **child**, not per family.
- Week boundary is Monday, America/New_York.
- No public leaderboard, no district/school tagging, no per-child puzzle content variation.
- No runtime/live AI generation — puzzle content is authored by hand in a batch script and reviewed via direct DB access before scheduling. No admin review UI is built.
- No mid-week reminder email in this pass — Monday-only.
- First batch: 4 weeks of Mystery Code (elementary) + 4 weeks of SOLdle (middle), inserted as `status='pending'` for manual review.

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Create | `supabase/migrations/0033_weekly_challenge.sql` | `weekly_puzzles`, `weekly_puzzle_attempts` tables + streak columns on `children` |
| Create | `lib/weekly-challenge/band.ts` | `gradeToBand()` |
| Create | `lib/weekly-challenge/band.test.ts` | tests |
| Create | `lib/weekly-challenge/week.ts` | `getCurrentWeekStartDate()` |
| Create | `lib/weekly-challenge/week.test.ts` | tests |
| Create | `lib/weekly-challenge/streak.ts` | `computeStreakUpdate()` |
| Create | `lib/weekly-challenge/streak.test.ts` | tests |
| Create | `lib/weekly-challenge/puzzle-types.ts` | content/solution/answer types + `checkMysteryCodeAnswers()`, `checkSoldleGuess()` |
| Create | `lib/weekly-challenge/puzzle-types.test.ts` | tests |
| Create | `app/api/weekly-challenge/attempt/route.ts` | POST: check answer, record attempt, update streak |
| Create | `app/api/weekly-challenge/attempt/route.test.ts` | tests |
| Create | `scripts/generate-weekly-challenge-batch.ts` | authors the first 8 puzzles into `weekly_puzzles` as `pending` |
| Create | `app/(parent)/challenge/page.tsx` | child selector + this-week's-puzzle resolution |
| Create | `components/weekly-challenge/mystery-code.tsx` | Elementary puzzle UI |
| Create | `components/weekly-challenge/soldle.tsx` | Middle puzzle UI |
| Modify | `lib/email/templates.ts` | add `weekly_challenge` template case |
| Modify | `lib/email/templates.test.ts` (create if absent) | test for new template |
| Modify | `app/api/admin/email/route.ts` | pass `childStreaks` through to `buildEmail` |

---

### Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/0033_weekly_challenge.sql`

**Interfaces:**
- Produces tables/columns every later task reads/writes: `weekly_puzzles(id, band, puzzle_type, week_start_date, title, content, solution, status, generated_at, reviewed_at, reviewed_by)`, `weekly_puzzle_attempts(id, child_id, puzzle_id, band, solved_at, attempt_count, created_at)`, and on `children`: `current_streak_elementary, best_streak_elementary, last_solved_week_elementary, current_streak_middle, best_streak_middle, last_solved_week_middle`.

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/0033_weekly_challenge.sql

CREATE TABLE weekly_puzzles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  band text NOT NULL CHECK (band IN ('elementary', 'middle')),
  puzzle_type text NOT NULL CHECK (puzzle_type IN ('mystery_code', 'soldle')),
  week_start_date date,
  title text NOT NULL,
  content jsonb NOT NULL,
  solution jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  generated_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES parents(id),
  CONSTRAINT review_columns_consistent CHECK (
    (reviewed_at IS NULL AND reviewed_by IS NULL) OR
    (reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL)
  )
);

CREATE UNIQUE INDEX idx_weekly_puzzles_band_week
  ON weekly_puzzles(band, week_start_date) WHERE week_start_date IS NOT NULL;

ALTER TABLE weekly_puzzles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "weekly_puzzles_admin_write" ON weekly_puzzles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM parents WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "weekly_puzzles_approved_read" ON weekly_puzzles
  FOR SELECT USING (status = 'approved');


CREATE TABLE weekly_puzzle_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  puzzle_id uuid NOT NULL REFERENCES weekly_puzzles(id) ON DELETE CASCADE,
  band text NOT NULL CHECK (band IN ('elementary', 'middle')),
  solved_at timestamptz,
  attempt_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(child_id, puzzle_id)
);

ALTER TABLE weekly_puzzle_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "weekly_puzzle_attempts_own" ON weekly_puzzle_attempts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM children WHERE id = weekly_puzzle_attempts.child_id AND parent_id = auth.uid())
  );


ALTER TABLE children
  ADD COLUMN IF NOT EXISTS current_streak_elementary int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_streak_elementary    int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_solved_week_elementary date,
  ADD COLUMN IF NOT EXISTS current_streak_middle      int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_streak_middle         int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_solved_week_middle    date;

CREATE INDEX idx_weekly_puzzle_attempts_child ON weekly_puzzle_attempts(child_id);
```

- [ ] **Step 2: Apply the migration**

```bash
npx supabase db reset
```

Expected: migration applies cleanly, no errors. Existing tables/rows are unaffected.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0033_weekly_challenge.sql
git commit -m "feat: add weekly_puzzles and weekly_puzzle_attempts tables"
```

---

### Task 2: Grade band mapping

**Files:**
- Create: `lib/weekly-challenge/band.ts`
- Test: `lib/weekly-challenge/band.test.ts`

**Interfaces:**
- Produces: `type Band = 'elementary' | 'middle'`, `gradeToBand(grade: number): Band` — used by Tasks 6 and 8.

- [ ] **Step 1: Write the failing test**

```typescript
// lib/weekly-challenge/band.test.ts
import { describe, it, expect } from 'vitest'
import { gradeToBand } from './band'

describe('gradeToBand', () => {
  it('maps grades 3-5 to elementary', () => {
    expect(gradeToBand(3)).toBe('elementary')
    expect(gradeToBand(4)).toBe('elementary')
    expect(gradeToBand(5)).toBe('elementary')
  })

  it('maps grades 6-8 to middle', () => {
    expect(gradeToBand(6)).toBe('middle')
    expect(gradeToBand(7)).toBe('middle')
    expect(gradeToBand(8)).toBe('middle')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/weekly-challenge/band.test.ts`
Expected: FAIL — `./band` has no exported member `gradeToBand` (module doesn't exist yet).

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/weekly-challenge/band.ts
export type Band = 'elementary' | 'middle'

export function gradeToBand(grade: number): Band {
  return grade <= 5 ? 'elementary' : 'middle'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/weekly-challenge/band.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/weekly-challenge/band.ts lib/weekly-challenge/band.test.ts
git commit -m "feat: add grade-to-band mapping for weekly challenge"
```

---

### Task 3: Current week start date

**Files:**
- Create: `lib/weekly-challenge/week.ts`
- Test: `lib/weekly-challenge/week.test.ts`

**Interfaces:**
- Produces: `getCurrentWeekStartDate(now?: Date): string` (returns `YYYY-MM-DD` for the Monday of `now`'s America/New_York week) — used by Task 8 (page) and Task 7 (batch script, to pick the first unscheduled Monday).

- [ ] **Step 1: Write the failing test**

```typescript
// lib/weekly-challenge/week.test.ts
import { describe, it, expect } from 'vitest'
import { getCurrentWeekStartDate } from './week'

describe('getCurrentWeekStartDate', () => {
  it('returns the same date when given a Monday', () => {
    // 2026-08-24 is a Monday
    const monday = new Date('2026-08-24T15:00:00Z')
    expect(getCurrentWeekStartDate(monday)).toBe('2026-08-24')
  })

  it('returns the preceding Monday when given a midweek date', () => {
    // 2026-08-26 is a Wednesday
    const wednesday = new Date('2026-08-26T15:00:00Z')
    expect(getCurrentWeekStartDate(wednesday)).toBe('2026-08-24')
  })

  it('returns the preceding Monday when given a Sunday', () => {
    // 2026-08-30 is a Sunday, week started 2026-08-24
    const sunday = new Date('2026-08-30T15:00:00Z')
    expect(getCurrentWeekStartDate(sunday)).toBe('2026-08-24')
  })

  it('handles a New York evening date that is still the same NY calendar day', () => {
    // 2026-08-24 23:30 UTC is 2026-08-24 19:30 America/New_York (EDT, UTC-4) — still Monday
    const lateUtc = new Date('2026-08-24T23:30:00Z')
    expect(getCurrentWeekStartDate(lateUtc)).toBe('2026-08-24')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/weekly-challenge/week.test.ts`
Expected: FAIL — module `./week` does not exist.

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/weekly-challenge/week.ts

/** Returns YYYY-MM-DD for the Monday of `now`'s America/New_York calendar week. */
export function getCurrentWeekStartDate(now: Date = new Date()): string {
  const nyDateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now) // 'YYYY-MM-DD'

  const nyDate = new Date(`${nyDateStr}T00:00:00Z`)
  const dayOfWeek = nyDate.getUTCDay() // 0=Sun, 1=Mon, ... 6=Sat
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  nyDate.setUTCDate(nyDate.getUTCDate() - diffToMonday)
  return nyDate.toISOString().slice(0, 10)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/weekly-challenge/week.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/weekly-challenge/week.ts lib/weekly-challenge/week.test.ts
git commit -m "feat: add current-week-start-date helper for weekly challenge"
```

---

### Task 4: Streak update logic

**Files:**
- Create: `lib/weekly-challenge/streak.ts`
- Test: `lib/weekly-challenge/streak.test.ts`

**Interfaces:**
- Produces: `interface StreakState { currentStreak: number; bestStreak: number; lastSolvedWeek: string | null }` and `computeStreakUpdate(state: StreakState, weekStartDate: string): StreakState` — used by Task 6 (attempt route).

- [ ] **Step 1: Write the failing test**

```typescript
// lib/weekly-challenge/streak.test.ts
import { describe, it, expect } from 'vitest'
import { computeStreakUpdate } from './streak'

describe('computeStreakUpdate', () => {
  it('starts a streak at 1 on the first-ever solve', () => {
    const result = computeStreakUpdate(
      { currentStreak: 0, bestStreak: 0, lastSolvedWeek: null },
      '2026-08-24'
    )
    expect(result).toEqual({ currentStreak: 1, bestStreak: 1, lastSolvedWeek: '2026-08-24' })
  })

  it('increments the streak when solved exactly 7 days after the last solve', () => {
    const result = computeStreakUpdate(
      { currentStreak: 3, bestStreak: 3, lastSolvedWeek: '2026-08-24' },
      '2026-08-31'
    )
    expect(result).toEqual({ currentStreak: 4, bestStreak: 4, lastSolvedWeek: '2026-08-31' })
  })

  it('resets to 1 when there is a gap longer than 7 days', () => {
    const result = computeStreakUpdate(
      { currentStreak: 4, bestStreak: 4, lastSolvedWeek: '2026-08-24' },
      '2026-09-14'
    )
    expect(result).toEqual({ currentStreak: 1, bestStreak: 4, lastSolvedWeek: '2026-09-14' })
  })

  it('keeps bestStreak at its prior max after a reset', () => {
    const result = computeStreakUpdate(
      { currentStreak: 1, bestStreak: 10, lastSolvedWeek: '2026-08-24' },
      '2026-09-14'
    )
    expect(result.bestStreak).toBe(10)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/weekly-challenge/streak.test.ts`
Expected: FAIL — module `./streak` does not exist.

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/weekly-challenge/streak.ts

export interface StreakState {
  currentStreak: number
  bestStreak: number
  lastSolvedWeek: string | null
}

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000

function isExactlyOneWeekBefore(prev: string, next: string): boolean {
  const prevMs = new Date(`${prev}T00:00:00Z`).getTime()
  const nextMs = new Date(`${next}T00:00:00Z`).getTime()
  return nextMs - prevMs === ONE_WEEK_MS
}

export function computeStreakUpdate(state: StreakState, weekStartDate: string): StreakState {
  const isConsecutive = state.lastSolvedWeek !== null && isExactlyOneWeekBefore(state.lastSolvedWeek, weekStartDate)
  const currentStreak = isConsecutive ? state.currentStreak + 1 : 1
  return {
    currentStreak,
    bestStreak: Math.max(state.bestStreak, currentStreak),
    lastSolvedWeek: weekStartDate,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/weekly-challenge/streak.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/weekly-challenge/streak.ts lib/weekly-challenge/streak.test.ts
git commit -m "feat: add weekly-challenge streak update logic"
```

---

### Task 5: Puzzle types and answer checking

**Files:**
- Create: `lib/weekly-challenge/puzzle-types.ts`
- Test: `lib/weekly-challenge/puzzle-types.test.ts`

**Interfaces:**
- Produces: `MysteryCodeQuestion`, `MysteryCodeContent`, `MysteryCodeSolution`, `checkMysteryCodeAnswers(content: MysteryCodeContent, answerIndexes: number[]): { correctCount: number; solved: boolean; revealedCode: string }`; `SoldleContent`, `SoldleSolution`, `SoldleFeedback = 'correct' | 'too_low' | 'too_high'`, `checkSoldleGuess(solution: SoldleSolution, guess: number): SoldleFeedback`. Used by Task 6 (attempt route) and Tasks 9/10 (components).

- [ ] **Step 1: Write the failing test**

```typescript
// lib/weekly-challenge/puzzle-types.test.ts
import { describe, it, expect } from 'vitest'
import { checkMysteryCodeAnswers, checkSoldleGuess, type MysteryCodeContent } from './puzzle-types'

const content: MysteryCodeContent = {
  codeLabel: '3-digit code',
  questions: [
    { prompt: 'What is 6 x 7?', choices: ['42', '36', '48'], correctIndex: 0, revealsDigit: '4' },
    { prompt: 'Which word means "happy"?', choices: ['sad', 'joyful', 'tired'], correctIndex: 1, revealsDigit: '2' },
    { prompt: 'What is 100 - 15?', choices: ['85', '75', '95'], correctIndex: 0, revealsDigit: '9' },
  ],
}

describe('checkMysteryCodeAnswers', () => {
  it('reveals the full code and marks solved when every answer is correct', () => {
    const result = checkMysteryCodeAnswers(content, [0, 1, 0])
    expect(result).toEqual({ correctCount: 3, solved: true, revealedCode: '429' })
  })

  it('reveals a partial code with underscores for wrong answers', () => {
    const result = checkMysteryCodeAnswers(content, [0, 2, 0])
    expect(result).toEqual({ correctCount: 2, solved: false, revealedCode: '4_9' })
  })
})

describe('checkSoldleGuess', () => {
  it('returns correct when the guess matches the target', () => {
    expect(checkSoldleGuess({ target: 42 }, 42)).toBe('correct')
  })

  it('returns too_low when the guess is below the target', () => {
    expect(checkSoldleGuess({ target: 42 }, 30)).toBe('too_low')
  })

  it('returns too_high when the guess is above the target', () => {
    expect(checkSoldleGuess({ target: 42 }, 50)).toBe('too_high')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/weekly-challenge/puzzle-types.test.ts`
Expected: FAIL — module `./puzzle-types` does not exist.

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/weekly-challenge/puzzle-types.ts

export interface MysteryCodeQuestion {
  prompt: string
  choices: string[]
  correctIndex: number
  revealsDigit: string
}

export interface MysteryCodeContent {
  codeLabel: string
  questions: MysteryCodeQuestion[]
}

export interface MysteryCodeSolution {
  code: string
}

export interface MysteryCodeResult {
  correctCount: number
  solved: boolean
  revealedCode: string
}

export function checkMysteryCodeAnswers(
  content: MysteryCodeContent,
  answerIndexes: number[]
): MysteryCodeResult {
  let correctCount = 0
  let revealedCode = ''

  content.questions.forEach((q, i) => {
    if (answerIndexes[i] === q.correctIndex) {
      correctCount += 1
      revealedCode += q.revealsDigit
    } else {
      revealedCode += '_'
    }
  })

  return { correctCount, solved: correctCount === content.questions.length, revealedCode }
}

export interface SoldleContent {
  concept: string
  clue: string
  min: number
  max: number
  maxGuesses: number
}

export interface SoldleSolution {
  target: number
}

export type SoldleFeedback = 'correct' | 'too_low' | 'too_high'

export function checkSoldleGuess(solution: SoldleSolution, guess: number): SoldleFeedback {
  if (guess === solution.target) return 'correct'
  return guess < solution.target ? 'too_low' : 'too_high'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/weekly-challenge/puzzle-types.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/weekly-challenge/puzzle-types.ts lib/weekly-challenge/puzzle-types.test.ts
git commit -m "feat: add weekly-challenge puzzle content types and answer checking"
```

---

### Task 6: Attempt API route

**Files:**
- Create: `app/api/weekly-challenge/attempt/route.ts`
- Test: `app/api/weekly-challenge/attempt/route.test.ts`

**Interfaces:**
- Consumes: `gradeToBand` (Task 2), `computeStreakUpdate`/`StreakState` (Task 4), `checkMysteryCodeAnswers`/`checkSoldleGuess`/`MysteryCodeContent`/`SoldleContent`/`SoldleSolution` (Task 5), `createClient` from `@/lib/supabase/server`.
- Produces: `POST` handler at `/api/weekly-challenge/attempt`. Request body: `{ childId: string; puzzleId: string; mysteryAnswerIndexes?: number[]; soldleGuess?: number }`. Response: `{ solved: boolean; attemptCount: number; revealedCode?: string; feedback?: 'correct' | 'too_low' | 'too_high'; currentStreak?: number; bestStreak?: number }` — consumed by Tasks 9/10 (components).

- [ ] **Step 1: Write the failing test**

```typescript
// app/api/weekly-challenge/attempt/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'

function makeClient(opts: {
  child: { id: string; grade: number } | null
  puzzle: Record<string, unknown> | null
  existingAttempt: Record<string, unknown> | null
  parentStreak: Record<string, unknown>
}) {
  const upsertAttemptMock = vi.fn().mockResolvedValue({ error: null })
  const updateChildMock = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })

  const client = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'parent-1' } } }) },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'children') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: opts.child, error: null }),
          update: updateChildMock,
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
          maybeSingle: vi.fn().mockResolvedValue({ data: opts.existingAttempt, error: null }),
          upsert: upsertAttemptMock,
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    }),
  }
  return { client, upsertAttemptMock, updateChildMock }
}

beforeEach(() => vi.clearAllMocks())

describe('POST /api/weekly-challenge/attempt', () => {
  it('solves a mystery_code puzzle on the first correct attempt and updates the streak', async () => {
    const puzzle = {
      id: 'puzzle-1',
      band: 'elementary',
      puzzle_type: 'mystery_code',
      week_start_date: '2026-08-24',
      content: {
        codeLabel: '2-digit code',
        questions: [
          { prompt: '2+2?', choices: ['3', '4'], correctIndex: 1, revealsDigit: '7' },
          { prompt: '5+5?', choices: ['10', '9'], correctIndex: 0, revealsDigit: '3' },
        ],
      },
      solution: { code: '73' },
    }
    const { client, upsertAttemptMock, updateChildMock } = makeClient({
      child: { id: 'child-1', grade: 4 },
      puzzle,
      existingAttempt: null,
      parentStreak: {},
    })
    vi.mocked(createClient).mockResolvedValue(client as any)

    const req = new NextRequest('http://localhost/api/weekly-challenge/attempt', {
      method: 'POST',
      body: JSON.stringify({ childId: 'child-1', puzzleId: 'puzzle-1', mysteryAnswerIndexes: [1, 0] }),
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.solved).toBe(true)
    expect(body.revealedCode).toBe('73')
    expect(upsertAttemptMock).toHaveBeenCalledWith(
      expect.objectContaining({ child_id: 'child-1', puzzle_id: 'puzzle-1', attempt_count: 1 }),
      expect.objectContaining({ onConflict: 'child_id,puzzle_id' })
    )
    expect(updateChildMock).toHaveBeenCalledWith(
      expect.objectContaining({
        current_streak_elementary: 1,
        best_streak_elementary: 1,
        last_solved_week_elementary: '2026-08-24',
      })
    )
  })

  it('returns 404 when the child does not belong to the caller', async () => {
    const { client } = makeClient({ child: null, puzzle: null, existingAttempt: null, parentStreak: {} })
    vi.mocked(createClient).mockResolvedValue(client as any)

    const req = new NextRequest('http://localhost/api/weekly-challenge/attempt', {
      method: 'POST',
      body: JSON.stringify({ childId: 'child-1', puzzleId: 'puzzle-1', mysteryAnswerIndexes: [0] }),
    })
    const res = await POST(req)
    expect(res.status).toBe(404)
  })

  it('does not re-update the streak on a repeat solve of an already-solved puzzle', async () => {
    const puzzle = {
      id: 'puzzle-1',
      band: 'elementary',
      puzzle_type: 'mystery_code',
      content: { codeLabel: '1-digit code', questions: [{ prompt: '1+1?', choices: ['2'], correctIndex: 0, revealsDigit: '9' }] },
      solution: { code: '9' },
    }
    const { client, upsertAttemptMock, updateChildMock } = makeClient({
      child: { id: 'child-1', grade: 4 },
      puzzle,
      existingAttempt: { solved_at: '2026-08-24T12:00:00Z', attempt_count: 1 },
      parentStreak: {},
    })
    vi.mocked(createClient).mockResolvedValue(client as any)

    const req = new NextRequest('http://localhost/api/weekly-challenge/attempt', {
      method: 'POST',
      body: JSON.stringify({ childId: 'child-1', puzzleId: 'puzzle-1', mysteryAnswerIndexes: [0] }),
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.solved).toBe(true)
    expect(upsertAttemptMock).toHaveBeenCalledWith(
      expect.objectContaining({ attempt_count: 2 }),
      expect.anything()
    )
    expect(updateChildMock).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/api/weekly-challenge/attempt/route.test.ts`
Expected: FAIL — `./route` does not exist.

- [ ] **Step 3: Write minimal implementation**

```typescript
// app/api/weekly-challenge/attempt/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { gradeToBand } from '@/lib/weekly-challenge/band'
import { computeStreakUpdate, type StreakState } from '@/lib/weekly-challenge/streak'
import {
  checkMysteryCodeAnswers,
  checkSoldleGuess,
  type MysteryCodeContent,
  type SoldleSolution,
} from '@/lib/weekly-challenge/puzzle-types'

interface AttemptBody {
  childId: string
  puzzleId: string
  mysteryAnswerIndexes?: number[]
  soldleGuess?: number
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

  const { data: puzzle } = await supabase
    .from('weekly_puzzles')
    .select('id, band, puzzle_type, content, solution')
    .eq('id', puzzleId)
    .eq('status', 'approved')
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

  let solved = false
  let revealedCode: string | undefined
  let feedback: 'correct' | 'too_low' | 'too_high' | undefined

  if (puzzle.puzzle_type === 'mystery_code') {
    const result = checkMysteryCodeAnswers(puzzle.content as MysteryCodeContent, mysteryAnswerIndexes ?? [])
    solved = result.solved
    revealedCode = result.revealedCode
  } else {
    feedback = checkSoldleGuess(puzzle.solution as SoldleSolution, soldleGuess ?? NaN)
    solved = feedback === 'correct'
  }

  const attemptCount = (existingAttempt?.attempt_count ?? 0) + 1
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

    const { data: weekRow } = await supabase
      .from('weekly_puzzles')
      .select('week_start_date')
      .eq('id', puzzleId)
      .single()

    const updated = computeStreakUpdate(priorState, weekRow!.week_start_date as string)
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
  }

  return NextResponse.json({
    solved,
    attemptCount,
    ...(revealedCode !== undefined ? { revealedCode } : {}),
    ...(feedback !== undefined ? { feedback } : {}),
    ...(currentStreak !== undefined ? { currentStreak, bestStreak } : {}),
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/api/weekly-challenge/attempt/route.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add app/api/weekly-challenge/attempt/route.ts app/api/weekly-challenge/attempt/route.test.ts
git commit -m "feat: add weekly-challenge attempt API route"
```

---

### Task 7: Content generation script (first batch)

**Files:**
- Create: `scripts/generate-weekly-challenge-batch.ts`

**Interfaces:**
- Consumes: `MysteryCodeContent`, `MysteryCodeSolution`, `SoldleContent`, `SoldleSolution` types (Task 5) for shape-checking the hardcoded content at compile time.
- Produces: 8 rows in `weekly_puzzles` with `status='pending'`, ready for manual review. No `week_start_date` is set — that's assigned during review (Task's manual step below), consistent with the spec's "review happens via direct DB access" decision.

- [ ] **Step 1: Write the script**

```typescript
// scripts/generate-weekly-challenge-batch.ts
/**
 * generate-weekly-challenge-batch.ts
 *
 * Authors the first batch of weekly challenge puzzles (4 weeks Mystery
 * Code for Elementary, 4 weeks SOLdle for Middle) and inserts them into
 * weekly_puzzles as status='pending'. No AI API call — content is
 * hand-authored here, matching the project's zero-runtime-AI-cost
 * approach for this feature.
 *
 * Run:
 *   set -a && source .env.prod && npx tsx scripts/generate-weekly-challenge-batch.ts
 *
 * After running, review pending rows directly in Supabase, set
 * week_start_date (Mondays) on the ones you approve, and flip
 * status to 'approved'.
 */

import { createClient } from '@supabase/supabase-js'
import type { MysteryCodeContent, MysteryCodeSolution, SoldleContent, SoldleSolution } from '../lib/weekly-challenge/puzzle-types'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const db = createClient(url, key, { auth: { persistSession: false } })

const mysteryCodePuzzles: { title: string; content: MysteryCodeContent; solution: MysteryCodeSolution }[] = [
  {
    title: 'The Locker Code',
    content: {
      codeLabel: '3-digit code',
      questions: [
        { prompt: 'What is 8 x 6?', choices: ['46', '48', '54'], correctIndex: 1, revealsDigit: '4' },
        { prompt: 'Which word is a synonym for "brave"?', choices: ['scared', 'courageous', 'quiet'], correctIndex: 1, revealsDigit: '1' },
        { prompt: 'What is 900 - 350?', choices: ['550', '650', '450'], correctIndex: 0, revealsDigit: '9' },
      ],
    },
    solution: { code: '419' },
  },
  {
    title: 'The Treasure Map Code',
    content: {
      codeLabel: '3-digit code',
      questions: [
        { prompt: 'What fraction is shaded if 3 of 4 equal parts are colored in?', choices: ['1/4', '3/4', '4/3'], correctIndex: 1, revealsDigit: '7' },
        { prompt: 'Which sentence uses correct punctuation?', choices: ['Where are you going', 'Where are you going.', 'Where are you going?'], correctIndex: 2, revealsDigit: '2' },
        { prompt: 'What is 7 x 9?', choices: ['62', '63', '56'], correctIndex: 1, revealsDigit: '6' },
      ],
    },
    solution: { code: '726' },
  },
  {
    title: "The Robot's Password",
    content: {
      codeLabel: '3-digit code',
      questions: [
        { prompt: 'What is the perimeter of a square with sides of 5 cm?', choices: ['20 cm', '25 cm', '10 cm'], correctIndex: 0, revealsDigit: '5' },
        { prompt: 'Which word means the opposite of "ancient"?', choices: ['old', 'modern', 'historic'], correctIndex: 1, revealsDigit: '8' },
        { prompt: 'What is 144 divided by 12?', choices: ['11', '12', '13'], correctIndex: 1, revealsDigit: '3' },
      ],
    },
    solution: { code: '583' },
  },
  {
    title: 'The Secret Garden Gate',
    content: {
      codeLabel: '3-digit code',
      questions: [
        { prompt: 'Round 428 to the nearest hundred.', choices: ['400', '430', '500'], correctIndex: 0, revealsDigit: '6' },
        { prompt: 'Which word is spelled correctly?', choices: ['recieve', 'receive', 'receeve'], correctIndex: 1, revealsDigit: '0' },
        { prompt: 'What is 15 x 4?', choices: ['45', '50', '60'], correctIndex: 2, revealsDigit: '4' },
      ],
    },
    solution: { code: '604' },
  },
]

const soldlePuzzles: { title: string; content: SoldleContent; solution: SoldleSolution }[] = [
  {
    title: 'Ratio Riddle',
    content: {
      concept: 'ratio',
      clue: 'In a bag of marbles, the ratio of red to blue is 3:2. If there are 20 blue marbles, guess the number of red marbles.',
      min: 1,
      max: 100,
      maxGuesses: 6,
    },
    solution: { target: 30 },
  },
  {
    title: 'Percent Puzzle',
    content: {
      concept: 'percent',
      clue: 'A shirt originally costs $40. After a discount, it costs $30. Guess the discount percentage.',
      min: 1,
      max: 100,
      maxGuesses: 6,
    },
    solution: { target: 25 },
  },
  {
    title: 'Coordinate Clue',
    content: {
      concept: 'coordinate plane',
      clue: 'A point is reflected over the x-axis from (4, 7). Guess the y-coordinate of the reflected point (enter it as a positive number, then think about the sign).',
      min: -50,
      max: 50,
      maxGuesses: 6,
    },
    solution: { target: -7 },
  },
  {
    title: 'Probability Puzzle',
    content: {
      concept: 'probability',
      clue: 'A spinner has 8 equal sections, 2 of which are red. If you spin 40 times, guess about how many times you would expect red.',
      min: 1,
      max: 40,
      maxGuesses: 6,
    },
    solution: { target: 10 },
  },
]

async function main() {
  console.log(`Inserting ${mysteryCodePuzzles.length} Mystery Code (elementary) puzzles...`)
  for (const p of mysteryCodePuzzles) {
    const { error } = await db.from('weekly_puzzles').insert({
      band: 'elementary',
      puzzle_type: 'mystery_code',
      title: p.title,
      content: p.content,
      solution: p.solution,
      status: 'pending',
    })
    if (error) console.error(`FAILED (${p.title}): ${error.message}`)
    else console.log(`  ✓ ${p.title}`)
  }

  console.log(`\nInserting ${soldlePuzzles.length} SOLdle (middle) puzzles...`)
  for (const p of soldlePuzzles) {
    const { error } = await db.from('weekly_puzzles').insert({
      band: 'middle',
      puzzle_type: 'soldle',
      title: p.title,
      content: p.content,
      solution: p.solution,
      status: 'pending',
    })
    if (error) console.error(`FAILED (${p.title}): ${error.message}`)
    else console.log(`  ✓ ${p.title}`)
  }

  console.log('\nDone. Review pending rows in weekly_puzzles, set week_start_date, and flip status to approved.')
}

main()
```

- [ ] **Step 2: Run the script against your dev/prod database**

```bash
set -a && source .env.prod && npx tsx scripts/generate-weekly-challenge-batch.ts
```

Expected: console logs 8 `✓` lines, no `FAILED` lines.

- [ ] **Step 3: Verify the rows landed as pending**

Run this query in the Supabase SQL editor (or via `psql`):

```sql
SELECT band, puzzle_type, title, status FROM weekly_puzzles ORDER BY band, puzzle_type;
```

Expected: 8 rows, all `status = 'pending'`.

- [ ] **Step 4: Commit**

```bash
git add scripts/generate-weekly-challenge-batch.ts
git commit -m "feat: add first batch of weekly challenge puzzles (pending review)"
```

---

### Task 8: Challenge page

**Files:**
- Create: `app/(parent)/challenge/page.tsx`

**Interfaces:**
- Consumes: `gradeToBand` (Task 2), `getCurrentWeekStartDate` (Task 3), `createClient` from `@/lib/supabase/server`, `MysteryCode` (Task 9), `Soldle` (Task 10).
- Produces: the `/challenge` route. Server component, no exported functions consumed elsewhere.

- [ ] **Step 1: Write the page**

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

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">This Week&apos;s Challenge</h1>

      {children.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {children.map((child) => (
            <Link
              key={child.id}
              href={`/challenge?childId=${child.id}`}
              className={`flex flex-col items-center gap-1 rounded-xl border px-4 py-3 text-sm font-medium transition-colors shrink-0 ${
                child.id === activeChild.id
                  ? 'border-primary bg-primary/10'
                  : 'border-muted hover:bg-muted/50'
              }`}
            >
              <span className="text-2xl">{child.avatar ?? '🌟'}</span>
              <span>{child.name}</span>
            </Link>
          ))}
        </div>
      )}

      {(childStreak as any)?.[currentCol] > 0 && (
        <p className="text-sm text-muted-foreground">
          🔥 {activeChild.name}&apos;s streak: {(childStreak as any)[currentCol]} week{(childStreak as any)[currentCol] === 1 ? '' : 's'}
        </p>
      )}

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

- [ ] **Step 2: Manually verify in the dev server**

```bash
npm run dev
```

Visit `/challenge` while logged in as a parent with a child in a band that has an `approved` puzzle for the current `week_start_date` (set one via the SQL editor first, per Task 7 Step 3). Expected: puzzle renders; with no matching puzzle, the "check back soon" message renders instead.

- [ ] **Step 3: Commit**

```bash
git add "app/(parent)/challenge/page.tsx"
git commit -m "feat: add weekly challenge page"
```

---

### Task 9: Mystery Code component (Elementary)

**Files:**
- Create: `components/weekly-challenge/mystery-code.tsx`

**Interfaces:**
- Consumes: `MysteryCodeContent` (Task 5), calls `POST /api/weekly-challenge/attempt` (Task 6) with `{ childId, puzzleId, mysteryAnswerIndexes }`.
- Produces: `<MysteryCode childId puzzleId title content alreadySolved />` — consumed by Task 8.

- [ ] **Step 1: Write the component**

```tsx
// components/weekly-challenge/mystery-code.tsx
'use client'

import { useState } from 'react'
import type { MysteryCodeContent } from '@/lib/weekly-challenge/puzzle-types'

interface Props {
  childId: string
  puzzleId: string
  title: string
  content: MysteryCodeContent
  alreadySolved: boolean
}

export function MysteryCode({ childId, puzzleId, title, content, alreadySolved }: Props) {
  const [answers, setAnswers] = useState<(number | null)[]>(content.questions.map(() => null))
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ solved: boolean; revealedCode: string } | null>(null)

  const solved = alreadySolved || result?.solved
  const canSubmit = !solved && answers.every((a) => a !== null) && !submitting

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const res = await fetch('/api/weekly-challenge/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId, puzzleId, mysteryAnswerIndexes: answers }),
      })
      const body = await res.json()
      setResult({ solved: body.solved, revealedCode: body.revealedCode })
    } finally {
      setSubmitting(false)
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
        <p className="text-lg font-bold text-primary">
          🎉 Solved! The code was {result?.revealedCode}.
        </p>
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
    </div>
  )
}
```

- [ ] **Step 2: Manually verify in the dev server**

With the dev server running and a `mystery_code` puzzle approved for the current week, load `/challenge` and answer all three questions. Expected: choosing all correct answers and submitting shows the "Solved!" state with the full code; a wrong combination shows the partial code with underscores and stays interactive.

- [ ] **Step 3: Commit**

```bash
git add components/weekly-challenge/mystery-code.tsx
git commit -m "feat: add Mystery Code puzzle component"
```

---

### Task 10: SOLdle component (Middle)

**Files:**
- Create: `components/weekly-challenge/soldle.tsx`

**Interfaces:**
- Consumes: `SoldleContent` (Task 5), calls `POST /api/weekly-challenge/attempt` (Task 6) with `{ childId, puzzleId, soldleGuess }`.
- Produces: `<Soldle childId puzzleId title content alreadySolved />` — consumed by Task 8.

- [ ] **Step 1: Write the component**

```tsx
// components/weekly-challenge/soldle.tsx
'use client'

import { useState } from 'react'
import type { SoldleContent } from '@/lib/weekly-challenge/puzzle-types'

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
      setHistory((prev) => [...prev, { guess, feedback: body.feedback }])
      setGuessValue('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5 rounded-xl border p-5">
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
            className="rounded-lg border px-3 py-1.5 text-sm w-32"
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
    </div>
  )
}
```

- [ ] **Step 2: Manually verify in the dev server**

With a `soldle` puzzle approved for the current week, load `/challenge` for a middle-school child, submit a few guesses. Expected: too-low/too-high feedback accumulates in a list, guessing the exact target shows the "Solved!" state, and guesses stop being accepted after `maxGuesses`.

- [ ] **Step 3: Commit**

```bash
git add components/weekly-challenge/soldle.tsx
git commit -m "feat: add SOLdle puzzle component"
```

---

### Task 11: Monday email template

**Files:**
- Modify: `lib/email/templates.ts`
- Create (if it doesn't already exist) or modify: `lib/email/templates.test.ts`
- Modify: `app/api/admin/email/route.ts`

**Interfaces:**
- Consumes: existing `buildEmail(template, data)` shape in `lib/email/templates.ts`.
- Produces: `TemplateType` gains `'weekly_challenge'`; `TemplateData` gains `childStreaks?: { name: string; streak: number }[]`. `Recipient` in `app/api/admin/email/route.ts` gains `childStreaks?: { name: string; streak: number }[]` and passes it through to `buildEmail`.

- [ ] **Step 1: Check for an existing templates test file**

```bash
test -f lib/email/templates.test.ts && echo exists || echo missing
```

If `missing`, Step 2 creates it fresh; if `exists`, Step 2 adds to it.

- [ ] **Step 2: Write the failing test**

```typescript
// lib/email/templates.test.ts
import { describe, it, expect } from 'vitest'
import { buildEmail } from './templates'

describe('buildEmail weekly_challenge', () => {
  it('links to /challenge and lists each child with a streak', () => {
    const { subject, html } = buildEmail('weekly_challenge', {
      childNames: ['Maya', 'Ben'],
      childStreaks: [
        { name: 'Maya', streak: 3 },
        { name: 'Ben', streak: 0 },
      ],
    })

    expect(subject).toContain("This week's challenge")
    expect(html).toContain('solprep.app/challenge')
    expect(html).toContain('Maya')
    expect(html).toContain('3 week')
  })

  it('omits the streak line for a child with no streak yet', () => {
    const { html } = buildEmail('weekly_challenge', {
      childNames: ['Ben'],
      childStreaks: [{ name: 'Ben', streak: 0 }],
    })
    expect(html).not.toContain('0 week')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run lib/email/templates.test.ts`
Expected: FAIL — `buildEmail` throws `Unknown template: weekly_challenge` (the `default` case in the existing switch).

- [ ] **Step 4: Extend the template**

In `lib/email/templates.ts`, extend the type and data interfaces:

```typescript
export type TemplateType =
  | 'no_children'
  | 'no_sessions'
  | 'never_completed'
  | 'single_session'
  | 'inactive_14d'
  | 'inactive_30d'
  | 'paused_session'
  | 'summer_update_may2025'
  | 'weekly_challenge'

interface TemplateData {
  childNames?: string[]
  lastSessionDate?: string
  childStreaks?: { name: string; streak: number }[]
}
```

Add a new `case` inside the `switch (template)` block in `buildEmail`, right before `default:`:

```typescript
    case 'weekly_challenge': {
      const streakLines = (data.childStreaks ?? [])
        .filter((c) => c.streak > 0)
        .map((c) => `<li style="padding: 4px 0;">🔥 <strong>${c.name}</strong>: ${c.streak} week${c.streak === 1 ? '' : 's'} in a row</li>`)
        .join('')

      return {
        subject: "This week's challenge is live!",
        html: layout(`
          <p>Hi,</p>
          <p>A new Weekly Challenge is up for ${child} — a fun puzzle to solve together, no pressure, just a few minutes.</p>
          ${streakLines ? `<ul style="list-style: none; padding: 0; margin: 20px 0;">${streakLines}</ul>` : ''}
          <p style="margin: 28px 0;">
            <a href="https://solprep.app/challenge" style="background: #1a1a1a; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px;">Solve this week's challenge →</a>
          </p>
          <p style="margin-top: 24px;">— Sri</p>
        `),
      }
    }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run lib/email/templates.test.ts`
Expected: PASS (2 tests, plus any pre-existing tests in the file still passing)

- [ ] **Step 6: Wire `childStreaks` through the admin send endpoint**

In `app/api/admin/email/route.ts`, extend the `Recipient` interface:

```typescript
interface Recipient {
  parentId: string
  parentEmail: string
  childNames?: string[]
  lastSessionDate?: string
  childStreaks?: { name: string; streak: number }[]
}
```

And pass it through in the `buildEmail` call inside the `for (const r of recipients)` loop:

```typescript
      const { subject, html } = buildEmail(template, {
        childNames: r.childNames,
        lastSessionDate: r.lastSessionDate,
        childStreaks: r.childStreaks,
      })
```

- [ ] **Step 7: Run the full test suite to confirm nothing else broke**

```bash
npx vitest run
```

Expected: all tests pass, including the pre-existing `app/api/admin/email/*` tests if any exist.

- [ ] **Step 8: Commit**

```bash
git add lib/email/templates.ts lib/email/templates.test.ts app/api/admin/email/route.ts
git commit -m "feat: add weekly challenge Monday email template"
```

---

## After This Plan

- Send the first Monday email manually via the existing `/api/admin/email` endpoint (same way `summer_update_may2025` was sent) once puzzles are approved and scheduled — no new send mechanism was built, per the spec's decision to keep this manual for the first pass.
- Automating weekly release/email scheduling, an admin review UI, and the (deferred) public leaderboard are all explicitly out of scope here — see the spec's "Explicitly out of scope for this pass" section.
