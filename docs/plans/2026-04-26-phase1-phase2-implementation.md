# Phase 1 & 2 Implementation Plan
**Date:** 2026-04-26  
**Scope:** Content authenticity (Phase 1) + Engagement foundations (Phase 2)

---

## Overview

| Phase | Theme | Items | Est. Effort |
|-------|-------|-------|-------------|
| Phase 1 | Content Authenticity | CQ-1 through CQ-3, CQ-8 | 6–8 weeks |
| Phase 2 | Engagement Foundations | EG-1, EG-2, EG-3, EG-4 | 3–4 weeks |

Phase 1 focuses on making practice sessions mirror the real SOL format — passage-based reading questions and extended question types that currently only exist as multiple choice. Phase 2 builds the habit loop that keeps children returning: streaks, mastery badges, tiered celebrations, and a weekly parent email.

Phases can overlap: EG-3 (celebration tiers) is a small UI change that can ship anytime during Phase 1.

---

## Phase 1: Content Authenticity

### 1.1 Extended Question Types (CQ-2, CQ-3)

**Goal:** Support multi-select and fill-in-the-blank, which together cover the majority of non-passage SOL question types beyond multiple choice.

#### DB Changes
```sql
-- Migration: add question_type and accepted_answers
ALTER TABLE questions 
  ADD COLUMN question_type TEXT NOT NULL DEFAULT 'multiple_choice'
    CHECK (question_type IN ('multiple_choice','true_false','multi_select','fill_in_blank','matching','ordering'));

ALTER TABLE questions
  ADD COLUMN accepted_answers TEXT[] DEFAULT NULL;
-- Used for fill_in_blank: e.g. ['pentagon', 'Pentagon', '5-sided polygon']
```

#### Multi-Select (CQ-2)
- UI: Checkboxes instead of radio buttons; "Select all that apply" label
- Choices schema unchanged — multiple `is_correct: true` entries allowed
- Scoring: Full credit only if all correct selected and none incorrect (strict); partial credit variant as future option
- Session logic: `is_correct` evaluation changes from single match to set equality
- Files to modify:
  - `app/practice/[sessionId]/components/QuestionCard.tsx` — render checkboxes when `question_type === 'multi_select'`
  - `lib/supabase/queries.ts` / session answer recording — no change needed (answer stored as selected choice IDs)
  - `app/api/sessions/answer/route.ts` — update correctness check for multi_select

#### Fill-in-the-Blank (CQ-3)
- UI: Text input replacing choices list; keyboard auto-focus on question load
- Matching: Case-insensitive; strip leading/trailing whitespace; check against `accepted_answers[]`
- TTS: Read question text; do not read "type your answer" placeholder
- Files to modify:
  - `QuestionCard.tsx` — new `FillInBlankInput` component
  - `app/api/sessions/answer/route.ts` — accepted_answers match logic
  - Admin question form — `accepted_answers` multi-value input field

#### Admin UI Changes
- Add `question_type` dropdown to question create/edit form
- Show `accepted_answers` multi-tag input when `fill_in_blank` selected
- Existing questions default to `multiple_choice` — no migration needed for existing rows

---

### 1.2 Passage-Based Reading Questions (CQ-1)

**Goal:** Group 3–5 reading comprehension questions under a shared passage, mirroring ~30% of the SOL reading format.

#### DB Changes
```sql
-- Migration: passages table + questions FK
CREATE TABLE passages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade       INT NOT NULL,
  subject     TEXT NOT NULL DEFAULT 'reading',
  title       TEXT,
  body        TEXT NOT NULL,
  image_svg   TEXT,           -- optional illustration
  source      TEXT,           -- 'doe_released' | 'ai_generated'
  source_ref  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE questions
  ADD COLUMN passage_id UUID REFERENCES passages(id) ON DELETE SET NULL;
```

#### Session Logic Changes
- When building a session, if questions have `passage_id`, group them — all questions under the same passage are shown consecutively
- A passage counts as 1 "slot" in the session (shows the passage, then cycles through its questions one by one)
- `getQuestionsForSession()` in `lib/supabase/queries.ts`: fetch passages with their question counts, slot passages as atomic units
- Limit: max 1 passage per session (to keep sessions varied)

#### Practice Session UI
- New `PassageCard` component: shows passage title + body text (scrollable if long)
- Passage persists on screen while child answers each linked question
- On mobile: passage collapses to a "Read Passage" expandable above the question
- TTS: reads passage body first, then question on each advance

#### Admin UI
- New `/admin/passages` page: create/edit passages, link questions
- Question create form: optional "Link to passage" dropdown

#### Content Bootstrap
- Import 3–5 sample passages per grade from DOE released reading items to validate the flow before building the full pipeline

---

### 1.3 Grades 6–8 Content Expansion (CQ-8)

**Goal:** Extend the question bank to grades 6, 7, 8 — the architecture already supports any grade; this is purely a content and generation task.

#### Steps
1. Verify `grade` column accepts 6–8 (it does — no constraint)
2. Add grade selector to admin question create form (currently defaults to 3–5)
3. Run `generate-all-questions-by-grade.ts` for grades 6–8 once generation pipeline (QG-1) is complete
4. Map SOL standards for grades 6–8 Math and Reading to `sol_standard` field values
5. Update marketing copy on landing page once questions are available

#### SOL Standards to Cover (Grade 6–8 Math)
- Grade 6: Ratios/proportions, integers, expressions, geometry (area/perimeter), statistics
- Grade 7: Proportional reasoning, real numbers, linear equations, geometry transformations
- Grade 8: Functions, linear equations, systems, Pythagorean theorem, data analysis

#### SOL Standards to Cover (Grade 6–8 Reading)
- Informational text analysis, literary analysis, vocabulary in context, author's purpose, argument/evidence

---

### Phase 1 Sequence

```
Week 1–2:  DB migrations (question_type, accepted_answers, passages table)
Week 2–3:  Multi-select UI + answer scoring
Week 3–4:  Fill-in-the-blank UI + admin form changes
Week 4–5:  Passage table, admin passage management UI
Week 5–6:  Passage rendering in practice session (PassageCard, session grouping logic)
Week 6–7:  Bootstrap Grade 6–8 SOL standards mapping + first questions
Week 7–8:  QA pass: test all new types end-to-end; TTS compatibility; accessibility check
```

---

## Phase 2: Engagement Foundations

### 2.1 Daily Practice Streaks (EG-1)

**Goal:** Habit formation — child sees their consecutive-day streak and is motivated to maintain it.

#### DB Changes
```sql
ALTER TABLE children
  ADD COLUMN current_streak    INT NOT NULL DEFAULT 0,
  ADD COLUMN best_streak       INT NOT NULL DEFAULT 0,
  ADD COLUMN streak_start_date DATE,
  ADD COLUMN last_practice_date DATE;
```

#### Logic (server-side, runs at session completion)
```typescript
// In app/api/sessions/complete/route.ts (or equivalent)
async function updateStreak(supabase, childId) {
  const today = new Date().toISOString().split('T')[0]
  const { data: child } = await supabase
    .from('children').select('current_streak, best_streak, last_practice_date').eq('id', childId).single()

  const last = child.last_practice_date
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  let newStreak = 1
  if (last === yesterday) newStreak = child.current_streak + 1  // continued streak
  else if (last === today) return                                // already practiced today

  await supabase.from('children').update({
    current_streak: newStreak,
    best_streak: Math.max(newStreak, child.best_streak),
    streak_start_date: last === yesterday ? child.streak_start_date : today,
    last_practice_date: today,
  }).eq('id', childId)
}
```

#### Child-Facing UI
- Location: Practice home screen (`/practice/[childId]`) — above the subject selector
- Component: `StreakBadge` — shows 🔥 + number, or "Start your streak today!" if streak = 0
- Milestone celebrations (shown on session completion screen):
  - 7 days: "🔥 7-day streak! You're on fire!"
  - 30 days: "⭐ 30-day streak! Amazing dedication!"
  - 100 days: "🏆 100-day streak! You're a champion!"
- Milestone check: compare `current_streak` against thresholds in session completion handler

#### Parent Dashboard
- Add streak to Quick Stats card alongside "Sessions this week" and "Average score"
- Show both `current_streak` and `best_streak`

---

### 2.2 Topic Mastery Badges (EG-2)

**Goal:** Visual milestone when a child sustains strong performance on a topic.

#### DB Changes
```sql
ALTER TABLE child_topic_levels
  ADD COLUMN mastered_at TIMESTAMPTZ DEFAULT NULL;
-- Set when accuracy >= 80% for 2+ consecutive sessions at current level
```

#### Logic (runs inside `bumpTopicLevelIfEarned` in `lib/supabase/queries.ts`)
- When `sessions_at_level >= 2` and accuracy >= 80%: set `mastered_at = now()` if not already set
- Mastery resets (`mastered_at = null`) if topic is demoted back to a lower level

#### Parent Dashboard Changes
- `TopicProgressBar` component: show small badge icon (⭐) next to topic name when `mastered_at` is set
- New "Mastered Topics" count in Quick Stats: "3 topics mastered"
- Milestone card: "New Mastery: Fractions — [date]" (same format as existing language level milestone card)

#### Practice Session Feedback
- On session completion: if a topic was newly mastered this session, show a one-line callout in the celebration screen: "⭐ New mastery: Fractions!"

---

### 2.3 Session Celebration Tiers (EG-3)

**Goal:** Score-appropriate feedback. Currently all scores trigger the same celebration.

This is the smallest change in Phase 2 — can ship at any point.

#### Changes to Celebration Screen (`app/practice/[sessionId]/complete/page.tsx` or equivalent)
```typescript
function getCelebration(score: number) {
  if (score === 100) return { headline: 'PERFECT!', sub: 'You got every question right! 🎉', confetti: 'full', fanfare: 'perfect' }
  if (score >= 90)  return { headline: 'Amazing!', sub: 'Almost perfect — incredible work! ⭐', confetti: 'full', fanfare: 'high' }
  if (score >= 70)  return { headline: 'Great job!', sub: 'You\'re getting stronger every session!', confetti: 'light', fanfare: 'standard' }
  if (score >= 50)  return { headline: 'Keep going!', sub: 'Every session makes you better. 💪', confetti: 'none', fanfare: 'gentle' }
  return           { headline: 'You practiced today!', sub: 'That\'s what matters. Come back tomorrow!', confetti: 'none', fanfare: 'none' }
}
```
- New `fanfare: 'perfect'` — distinct Web Audio tone sequence (ascending arpeggio)
- Perfect score (100%): large animated "PERFECT!" text + full confetti burst
- <50% scores: no confetti, no negative framing — neutral, forward-looking message only

---

### 2.4 Weekly Email Digest (EG-4)

**Goal:** Parent accountability loop — a Sunday-evening summary that drives re-engagement.

#### Infrastructure
- Email provider: **Resend** (generous free tier, great Next.js integration, transactional focus)
- Trigger: Supabase `pg_cron` job every Sunday at 7pm ET
- Template: React Email component (renderable in Next.js)

#### Email Content
```
Subject: [Child's name]'s SOL practice this week 📚

Hi [Parent first name],

Here's how [Child's name] did this week:

📅  Sessions completed: 4
⭐  Average score: 78%
🔥  Current streak: 5 days

📊 This week's topics:
  ✅ Fractions — 82% (strong)
  ⚠️  Main Idea — 61% (needs more practice)

💡 Suggested focus next week: Main Idea

[Practice now →] button

Keep up the great work!
— The SolPrep Team
```

#### DB / API Changes
- New `parent_email_preferences` table (or column on `profiles`): `weekly_digest_enabled BOOL DEFAULT true`
- Cron job queries: sessions in last 7 days per child per parent, aggregates accuracy by topic
- Unsubscribe link in every email (CAN-SPAM compliance)
- Parent settings page: toggle to enable/disable digest

#### Next.js Implementation
- `/app/api/cron/weekly-digest/route.ts` — protected endpoint (Vercel Cron or Supabase cron calls it)
- `components/emails/WeeklyDigest.tsx` — React Email template
- Test endpoint: `/api/cron/weekly-digest?preview=true&parentId=xxx` — renders email as HTML for dev

#### Vercel Cron Config (`vercel.json` or `vercel.ts`)
```json
{
  "crons": [{ "path": "/api/cron/weekly-digest", "schedule": "0 23 * * 0" }]
}
```
*(23:00 UTC Sunday = 7pm ET)*

---

### Phase 2 Sequence

```
Week 1:    DB migrations (streak columns, mastered_at)
Week 1:    EG-3 celebration tiers (small, ship fast)
Week 1–2:  Streak logic + StreakBadge component + session completion hook
Week 2:    Streak milestones on celebration screen
Week 2–3:  Mastery badge logic + dashboard changes + session callout
Week 3–4:  Resend setup + React Email template + weekly digest cron
Week 4:    Parent settings toggle for digest; unsubscribe flow; QA
```

---

## Shared Prerequisites

Before starting either phase, confirm:

- [ ] Supabase migrations are applied in order (dev → prod via `supabase db push`)
- [ ] All new API routes are protected by session auth (no unauthenticated access)
- [ ] TTS compatibility tested for new question types (fill-in-blank input shouldn't be read aloud)
- [ ] Accessibility: new UI components tested with OpenDyslexic font + large text + high contrast

---

## Success Metrics

| Metric | Baseline | Phase 1 Target | Phase 2 Target |
|--------|----------|---------------|---------------|
| Session completion rate | — | No regression | +5% |
| Sessions per child per week | — | No regression | +20% (streak effect) |
| Parent dashboard open rate | — | — | +15% (email-driven) |
| Topics with mastery badge | 0 | 0 (Phase 1 no change) | Track first earned |
| Fill-in-blank / multi-select usage | 0 | >20% of sessions use new types | — |
| Passage-based sessions | 0 | >10% of reading sessions | — |
