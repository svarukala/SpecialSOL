# SPL-SOL Backlog

Items are grouped by area. Add new items at the bottom of the relevant section.

---

## Auth

*All items done — 35a150a*

---

## Dashboard

*All items done — 35a150a*

---

## DB / Data Quality

*All items done — 35a150a (migration 0009)*

---

## Question Generation Pipeline

| # | Item | Notes |
|---|------|-------|
| QG-1 | Admin page (`/admin/generate`) — trigger generation, preview, approve/reject per question in browser UI | |
| QG-2 | Parent difficulty control — setting to cap difficulty level per child per subject | |
| QG-3 | VDOE released items scraper — parse actual released SOL test PDFs as a premium question source | |

---

## Accommodations

| # | Item | Notes |
|---|------|-------|
| AC-1 | Handle `extended_time` accommodation | Flag is stored in DB but never read. No per-question timer exists yet. Needs: timer UI in practice session + multiplier applied when accommodation is set. |

---

## Practice Session

| # | Item | Notes |
|---|------|-------|
| PS-1 | Image support for questions | Show a simple image alongside a question when relevant (e.g. geometry shapes, fraction diagrams, reading passages with illustrations). Needs: `image_url` or `image_data` field on the `questions` table, image rendering in the practice session UI, and generation pipeline support (either AI-generated SVGs or a curated asset library). |

---

## Content & Question Variety (Phase 1)

| # | Item | Priority | Notes |
|---|------|----------|-------|
| CQ-1 | Passage-based reading questions | High | Group 3–5 questions under a shared reading passage. Needs: `passage_text` + `passage_image_url` fields, question grouping in session logic, new "Read the story, then answer" UI. ~30% of SOL reading is passage-based — biggest authenticity gap. |
| CQ-2 | Multi-select question type | High | Child selects 2+ correct answers from 5 options. UI components already exist; wire to question type enum. |
| CQ-3 | Fill-in-the-blank question type | High | Child types a short answer; auto-graded via word list. Needs: `accepted_answers` array on `questions`, text input UI, case-insensitive matching. |
| CQ-4 | Matching question type | Medium | Child pairs two columns (e.g. shape names ↔ shapes). Drag-drop or tap-to-select. |
| CQ-5 | Ordering / sequencing question type | Medium | Child orders steps or fractions. Drag-drop reorder UI. |
| CQ-6 | Short answer with admin grading | Low | Free-text response; parent or admin manually reviews and marks correct/incorrect. Needs: grading queue in admin. |
| CQ-7 | Simplified text quality improvements | Medium | Batch-regenerate simplified_text via Claude (better than OpenAI for educational simplification). Add quality score (1–5) per question, allow admin edits. |
| CQ-8 | Grades 6–8 content | High | Extend question bank beyond grades 3–5 to cover the full SOL testing range. Architecture already supports it. |

---

## Engagement & Gamification (Phase 2)

| # | Item | Priority | Notes |
|---|------|----------|-------|
| EG-1 | Daily practice streaks (child-facing) | High | Track consecutive days of practice. Surface streak counter on child's practice home screen (🔥 icon). Milestone celebrations: 7-day, 30-day, 100-day. Streak resets on missed day. Needs: `current_streak`, `best_streak`, `last_practice_date` on `children` table; streak update hook at session completion. |
| EG-2 | Topic mastery badges | High | Award badge when child reaches ≥80% accuracy on a topic for 2+ consecutive sessions. Show on parent dashboard progress chart. Cumulative badge count ("3 Topics Mastered"). Needs: `mastered_at` column on `child_topic_levels`. |
| EG-3 | Session celebration tiers | Medium | Expand celebration screen: perfect score (100%) → unique animation + "PERFECT!"; 90%+ → 5-star fanfare; <60% → neutral "You're learning! Keep going 💪" (no negative). Currently single celebration for all scores. |
| EG-4 | Weekly email digest to parents | High | Sunday-evening email: child name, sessions this week, topics practiced, weakest area, one encouraging message. Needs: Resend/SendGrid integration, Supabase cron job, HTML email template. Drives re-engagement and habit formation. |
| EG-5 | Avatar cosmetic unlocks | Medium | Earn cosmetic customizations (border, background, color) at milestone events (5 sessions, 10 sessions, first mastery, 7-day streak). Not purchasable — earned only. Needs: JSONB `avatar_unlocks` column on `children`, avatar component redesign. |
| EG-6 | Sibling leaderboard (opt-in) | Low | Privacy-safe: only ranks children within the same parent account. No cross-family data. Parent must opt in. |

---

## Analytics & Parent Insights (Phase 3)

| # | Item | Priority | Notes |
|---|------|----------|-------|
| AN-1 | Topic trajectory sparklines | High | Replace static bar with mini sparkline per topic showing accuracy over last 5 attempts. Green = improving, red = declining. Hover tooltip with trend detail. |
| AN-2 | Hint-usage analysis card | High | Dashboard card: "Your child used hints in X% of attempts." Breakdown per topic. Alert threshold when hint usage is high on a weak topic. |
| AN-3 | Time-spent distribution chart | Medium | Pie/bar chart of time on Reading vs. Math (or per topic) this week. Surfaces subject avoidance. |
| AN-4 | Promotion readiness progress bar | Medium | Show per-topic progress toward next language level promotion (e.g. "4/5 sessions needed to advance"). Makes goal visible vs. surprise notifications. |
| AN-5 | Session history search & filter | Medium | Filter recent sessions table by date range, subject, score range. Currently unfiltered. |
| AN-6 | Monthly PDF skill gap report | Medium | Parent-exportable PDF: SOL standards with gaps, suggested next topics, date range. Useful for IEP meetings. Needs: jsPDF or similar, scheduled job. |
| AN-7 | Anonymized peer benchmarks | Low | Show percentile vs. anonymized aggregate (requires ≥500 data points per grade/subject). Careful phrasing required. |

---

## UX & Accessibility (Phase 3)

| # | Item | Priority | Notes |
|---|------|----------|-------|
| UX-1 | Extended time enforcement (AC-1 follow-up) | High | Honor `extended_time` flag: optional per-question visual timer showing 2× average time. No hard cutoff — informational only. |
| UX-2 | Onboarding wizard for new parents | High | 4-step guided setup: learning needs → grade/subject → language level → TTS key (with "use free" default). Pre-populates child accommodations. Reduces abandonment. |
| UX-3 | Session progress indicator | Medium | "Question 3 of 10" progress bar during session. Hidden when reduce-distractions is enabled. Helps children with ADHD/anxiety (predictability). |
| UX-4 | Dark mode | Medium | Use next-themes; persist in parent settings. Reduces eye strain. |
| UX-5 | PWA / install-to-home screen | Low | Add manifest + service worker for offline caching of recent questions. Gives 90% of native app feel at 5% of cost. |

---

## Operations & Admin (Ongoing)

| # | Item | Priority | Notes |
|---|------|----------|-------|
| OP-1 | Question quality dashboard | High | Admin view of questions with <60% avg accuracy or high "confused" feedback. Flag for review/revision. |
| OP-2 | Bulk question CSV import | Medium | Upload CSV with validation; bulk upsert. Removes dependency on code deploys for content additions. |
| OP-3 | Feedback-to-question linking | Medium | When child flags "Question is confusing," surface all similar feedback clustered by question in admin. |
| OP-4 | AI question generation pipeline | Medium | Admin triggers bulk generation via Claude, previews in UI, approves/rejects. Partly built (QG-1). |

---

## Monetization (Future)

| # | Item | Priority | Notes |
|---|------|----------|-------|
| MO-1 | Premium parent reports (paid add-on) | Low | Weekly detailed PDF reports + IEP export. Suggested $3–5/month. Needs Stripe integration. |
| MO-2 | Parent coaching sessions | Low | Optional paid add-on: monthly group call with special-needs educator. High-margin service. Operations overhead. |

---

## Explicitly Out of Scope

| Item | Reason |
|------|--------|
| Full RPG / Prodigy-style gamification | Adds cognitive load, dilutes accessibility mission, 3× scope |
| Peer leaderboards (cross-family) | Privacy risk for special needs audience |
| Native iOS/Android app | PWA gives 90% of value at 5% of the cost |
| Classroom LMS / teacher gradebook | Parent-first product; classroom mode is additive only if demand proven |
