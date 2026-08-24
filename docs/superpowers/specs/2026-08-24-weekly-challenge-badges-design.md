# Weekly Challenge Badges — Design Spec

**Goal:** Let a child redeem the code revealed by solving a Weekly Challenge puzzle to trigger a badge-reveal animation, and give them a page to see every badge they've earned. Add streak-milestone badges (every 5-week streak) as a second, automatically-awarded badge type.

**Depends on:** the existing Weekly Challenge feature (`lib/weekly-challenge/*`, `app/api/weekly-challenge/attempt/route.ts`, `components/weekly-challenge/*`, `app/(parent)/challenge/page.tsx`) and `supabase/migrations/0033_weekly_challenge.sql`.

**Tech stack:** Next.js App Router, Supabase (Postgres + `@supabase/ssr`), Vitest, `canvas-confetti` (already a dependency, already used in `components/practice/session-complete.tsx`).

## Global Constraints

- No new badge artwork/asset pipeline — badges are represented as an emoji + title, matching the emoji-driven visual language already used throughout the app (session tiers, summer activities, streak fire emoji).
- Badges are a permanent collection: re-earning the same milestone after a streak reset does not create a duplicate or a second animation moment — it's a silent no-op.
- Mystery Code badges require the child to re-type the revealed code (a deliberate second step). SOLdle and streak-milestone badges are awarded automatically at solve time, since SOLdle has no natural "code" to re-enter.
- No badge-sharing, no leaderboard, no printable/physical redemption — collection is purely in-app.

## Data Model

One new table, no changes to existing tables:

```sql
-- supabase/migrations/0034_child_badges.sql

CREATE TABLE child_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  badge_key text NOT NULL,       -- 'puzzle:<puzzle_id>' or 'streak:<band>:<multiple>'
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

`badge_key` is the idempotency key: inserting with `ON CONFLICT (child_id, badge_key) DO NOTHING` makes awarding safe to attempt repeatedly without duplicating a badge or re-triggering its animation server-side. `band` is stored for display grouping/filtering on the badges page without a join.

## Badge Content Rules (pure function, testable in isolation)

New file `lib/weekly-challenge/badges.ts`:

- `puzzleBadge(puzzleId: string, puzzleType: 'mystery_code' | 'soldle', title: string, band: Band): BadgeAward` — `badge_key: `puzzle:${puzzleId}``, `emoji: puzzleType === 'mystery_code' ? '🗝️' : '🔢'`, `title` passed through from the puzzle's own title (e.g. "The Secret Garden Gate").
- `streakMilestoneBadge(band: Band, currentStreak: number): BadgeAward | null` — returns `null` unless `currentStreak > 0 && currentStreak % 5 === 0`. Tier emoji from `['🥉', '🥈', '🥇', '🏆']` indexed by `min(currentStreak / 5 - 1, 3)` (caps at 🏆 for 20+ weeks). `badge_key: `streak:${band}:${currentStreak}``, `title: `${currentStreak}-Week Streak``.

`BadgeAward = { badgeKey: string; badgeType: 'puzzle' | 'streak_milestone'; band: Band; title: string; emoji: string }`.

## Redemption Flow

**SOLdle and streak badges (automatic):** inside the existing `POST /api/weekly-challenge/attempt` handler in `app/api/weekly-challenge/attempt/route.ts`:
- When `puzzle.puzzle_type === 'soldle'` and `solved` is true on this call, award `puzzleBadge(...)` right after the existing upsert.
- Inside the existing `isFirstSolve` block (applies to both puzzle types), after `computeStreakUpdate`, check `streakMilestoneBadge(band, updated.currentStreak)`; if non-null, award it.
- Both awards insert into `child_badges` with `.upsert(..., { onConflict: 'child_id,badge_key', ignoreDuplicates: true })` (or insert + swallow the unique-violation) — belt-and-suspenders against double-award on retried requests.
- The route's JSON response gains `newBadges: BadgeAward[]` (empty array when nothing new was earned this call).

**Mystery Code (manual redeem):** solving no longer awards a badge directly. A new route, `app/api/weekly-challenge/redeem/route.ts`:
- `POST` body: `{ childId: string; puzzleId: string; code: string }`.
- Verifies the child belongs to the caller (same pattern as `/attempt`), fetches the puzzle (must be `status = 'approved'` and the current week, same `.eq('week_start_date', getCurrentWeekStartDate())` guard as `/attempt` — a stale/future puzzle can't be redeemed either), and verifies `weekly_puzzle_attempts.solved_at` is set for this child+puzzle (404 if never solved — you can't redeem a code you haven't earned).
- Compares `code.trim()` against `puzzle.solution.code` server-side (never trusts a client-supplied "this is correct" flag).
- On match: upserts `puzzleBadge(...)` (`onConflict: 'child_id,badge_key', ignoreDuplicates: true`) and returns `{ badge: BadgeAward }` either way — redeeming a correct code twice (e.g. a page refresh mid-animation) is idempotent and returns the same badge without erroring, it just doesn't imply a second animation was "earned." On mismatch: `400 { error: 'incorrect_code' }` — no attempt-count tracking needed here since there's no server-enforced limit on redemption tries (unlike SOLdle's guess cap, retyping a code wrong just means try again).

## UI

**`components/weekly-challenge/badge-reveal.tsx`** — new component: `<BadgeReveal badge={BadgeAward} onDismiss={() => void} />`. On mount, fires the same `canvas-confetti` burst pattern as `session-complete.tsx`'s `fireConfetti('light')`, shows the emoji large + title in a centered card, dismissed by a "Nice!" button or auto-advance. A parent component queues multiple awarded badges (e.g. a streak badge + puzzle badge from the same request) and shows them one at a time.

**`components/weekly-challenge/mystery-code.tsx`** changes: after `result.solved` is true, render a small form — "Enter your code to claim the badge" input + submit button — instead of immediately treating the puzzle as fully done. Submitting calls `/api/weekly-challenge/redeem`; success renders `<BadgeReveal>`; `400 incorrect_code` shows an inline "That's not quite right — check the code above" message and lets them retry.

**`components/weekly-challenge/soldle.tsx`** changes: reads `newBadges` from the existing `/attempt` response and renders `<BadgeReveal>` (queued) when non-empty, right after the "Solved!" state appears.

**New page `app/(parent)/badges/page.tsx`**: same child-selector pattern as `/challenge` and `/spelling-bee`. Fetches all `child_badges` rows for the active child, grouped into "Puzzle Badges" and "Streak Badges" sections, each rendered as an emoji + title + earned-date grid. Empty state: "No badges yet — solve this week's challenge to earn your first one!" linking to `/challenge`. `/challenge` page gets a small "🏅 My Badges" link near the streak line.

## Testing

- `lib/weekly-challenge/badges.test.ts` — pure function tests: puzzle badge emoji per type, streak milestone null below 5 / at 5 / at 10 / tier cap at 20+.
- `app/api/weekly-challenge/redeem/route.test.ts` — mirrors the `/attempt` test style: success awards badge, wrong code returns 400, redeeming before solving returns 404, redeeming a stale-week puzzle returns 404, re-redeeming an already-earned badge returns the existing badge without erroring (idempotent).
- `app/api/weekly-challenge/attempt/route.test.ts` — extend existing tests to assert `newBadges` appears on a SOLdle solve and on a streak-milestone-crossing solve, and is empty otherwise.
