# Virginia SOL Practice App — Design Spec
**Date:** 2026-03-22
**Status:** Approved

---

## 1. Overview

A web application that allows children in grades 3–5 to practice Virginia Standards of Learning (SOL) tests at home. Designed for children with special needs and learning disabilities, it provides a comprehensive suite of accessibility accommodations. Parents manage their child's profile and track progress through a dedicated dashboard.

### Goals
- Give kids with learning disabilities a fair, pressure-free way to practice SOL tests
- Provide parents with actionable insight into their child's progress and weak areas
- Run at zero cost for families (BYOK for premium AI features)
- Be extensible — adding grades, subjects, or languages requires data, not code changes

### Non-Goals (v1)
- Teacher/classroom portal (data model supports it, deferred)
- Native mobile app (responsive web covers mobile)
- AI-generated questions (schema supports `source='ai_generated'`, deferred)
- Real-time multiplayer or competitive features

---

## 2. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) | Server Components by default |
| UI Components | shadcn/ui + Tailwind CSS | Accessible primitives, CSS variable theming |
| Auth + Database | Supabase (free tier) | Postgres, Auth, local dev via Supabase CLI |
| Hosting | Vercel (free tier) | CI/CD on push, preview deploys |
| TTS (default) | Web Speech API | Browser-native, free, no API key |
| TTS (premium) | OpenAI TTS / ElevenLabs | BYOK — parent-configured, optional |
| Simplified Language | OpenAI API | BYOK — generates `simplified_text` once per question |
| Fonts | next/font (Geist) + self-hosted OpenDyslexic | OpenDyslexic served from `/public/fonts/`, loaded via `next/font/local` |

### Cost Profile
- Supabase free tier: 500MB DB, 50MB storage, 50k auth users
- Vercel free tier: unlimited personal projects, 100GB bandwidth
- AI features: $0 unless parent adds their own API key
- **Total running cost: $0/month**

---

## 3. Architecture

### Project Structure
```
sol-practice/
├── app/
│   ├── (auth)/                 # /login, /signup, /reset-password
│   ├── (parent)/               # /dashboard, /children, /settings, /feedback
│   ├── (practice)/[childId]/   # Child-facing UI, protected by parent session
│   └── api/
│       ├── sessions/           # POST start, PATCH end
│       ├── questions/          # GET by grade/subject/topic, randomized
│       ├── hints/              # GET hint by question_id + hint_number
│       └── feedback/           # POST child or parent feedback
├── components/
│   ├── ui/                     # shadcn/ui base components
│   ├── practice/               # QuestionCard, AnswerPicker, HintPanel, SessionComplete
│   ├── accommodations/         # AccommodationToolbar, TTSButton, ContrastToggle, FontSizer
│   └── dashboard/              # ProgressChart, SessionHistory, WeakAreasCallout, ChildCard
├── lib/
│   ├── supabase/               # DB client (server + browser), typed query helpers
│   ├── tts/                    # TTSEngine interface + 3 implementations
│   ├── encryption/             # AES-256-GCM encrypt/decrypt for API keys
│   └── accommodations/         # AccommodationContext, useAccommodations hook
├── supabase/
│   ├── migrations/             # Versioned schema migrations
│   └── seed/                   # Virginia DOE questions seed (JSON → SQL)
└── public/
    ├── fonts/OpenDyslexic/     # Self-hosted OFL-licensed font files
    └── sounds/                 # No files needed — Web Audio API generates tones
```

### Key Architectural Decisions

**Server vs Client components:** Data fetching in Server Components. Only components needing browser APIs (TTS, animations, accommodation toggles) use `'use client'`. Keeps the practice screen fast on low-end devices.

**AccommodationContext:** Wraps the practice session. Initialized from the child's DB profile at session start. Snapshot written to `practice_sessions.accommodations_used` via the `POST /api/sessions` server action at session creation.

**TTSEngine abstraction:** `TTSEngine` interface with three implementations. Active engine resolved at session start from `parent.settings.tts_provider`. Falls back to `WebSpeechEngine` if the configured engine is unavailable or its API key is invalid.

**Extensibility:** Grade and subject are plain DB fields. Subject picker and grade selector query `SELECT DISTINCT grade, subject FROM questions` — new grades/subjects appear automatically when question rows are inserted.

**API key encryption:** Parent API keys are encrypted using AES-256-GCM in a server action before storage (`lib/encryption/`). The encryption secret lives in `ENCRYPTION_SECRET` environment variable (Vercel env var, never exposed to client). Keys are decrypted server-side only when initializing a TTS engine for a practice session. The raw key is never sent to the browser.

**BYOK scope:** API keys are per parent account and shared across all children under that account. A parent configures one key; all their children benefit.

---

## 4. Data Model

### `parents`
```sql
id            uuid primary key default gen_random_uuid()
email         text unique not null
created_at    timestamptz default now()
settings      jsonb not null default '{}'::jsonb
-- settings JSON shape:
-- {
--   "tts_provider": "web_speech" | "openai" | "elevenlabs",
--   "openai_api_key_encrypted": string,   -- AES-256-GCM ciphertext
--   "elevenlabs_api_key_encrypted": string,
--   "tts_voice": string                   -- voice ID for selected provider
-- }
```

### `children`
```sql
id              uuid primary key default gen_random_uuid()
parent_id       uuid not null references parents(id) on delete cascade
name            text not null
avatar          text not null default '🌟'   -- emoji character
grade           int not null check (grade between 3 and 12)
created_at      timestamptz default now()
accommodations  jsonb not null default '{}'::jsonb
-- accommodations JSON shape (AccommodationState — see Section 6):
-- {
--   "tts_enabled": boolean,       default: true
--   "tts_speed": number,          default: 1.0, range: 0.5–2.0
--   "simplified_language": boolean, default: false
--   "high_contrast": boolean,     default: false
--   "large_text": 0 | 1 | 2,     default: 0  (0=normal, 1=large, 2=extra-large)
--   "dyslexia_font": boolean,     default: false
--   "reduce_distractions": boolean, default: false
--   "extended_time": boolean,     default: false
--   "hints_enabled": boolean,     default: true
--   "positive_reinforcement": boolean, default: true
-- }
```

### `questions`
```sql
id                uuid primary key default gen_random_uuid()
grade             int not null check (grade between 3 and 12)
subject           text not null                   -- 'reading' | 'math' (extensible)
topic             text not null                   -- e.g. 'Fractions', 'Main Idea'
subtopic          text                            -- e.g. 'Comparing Fractions'
sol_standard      text                            -- e.g. '3.4a' (Virginia DOE code)
difficulty        int not null default 1 check (difficulty in (1, 2, 3))
question_text     text not null
simplified_text   text                            -- pre-generated simpler phrasing
answer_type       text not null check (answer_type in ('multiple_choice', 'true_false'))
choices           jsonb not null
-- choices JSON shape: [{ "id": "a", "text": "...", "is_correct": true }, ...]
-- multiple_choice: 4 choices, exactly one is_correct=true
-- true_false: 2 choices ("True", "False"), exactly one is_correct=true
hint_1            text                            -- first (gentlest) hint
hint_2            text                            -- second hint
hint_3            text                            -- third (most explicit) hint
calculator_allowed bool not null default false
                  -- Grade 3 math: always false
                  -- Grades 4–5 math calculator-active section: true
                  -- Reading questions: always false
source            text not null default 'doe_released'
                  check (source in ('doe_released', 'ai_generated'))
created_at        timestamptz default now()
```

### `practice_sessions`
```sql
id                    uuid primary key default gen_random_uuid()
child_id              uuid not null references children(id) on delete cascade
started_at            timestamptz not null default now()
ended_at              timestamptz                 -- null = session in progress or abandoned
grade                 int not null
subject               text not null
mode                  text not null check (mode in ('practice', 'test'))
question_count        int not null               -- total questions in session
score_percent         int                        -- calculated at session end (0–100), null if abandoned
status                text not null default 'in_progress'
                      check (status in ('in_progress', 'completed', 'abandoned'))
accommodations_used   jsonb not null             -- snapshot of child.accommodations at session start
```

**Session lifecycle:** A session is `completed` when the child reaches the celebration screen (all questions answered). It is marked `abandoned` by a cleanup job (or on next session start for the same child) if `ended_at` is null and `started_at` is more than 2 hours ago. Abandoned sessions are excluded from dashboard aggregates.

### `session_answers`
```sql
id                  uuid primary key default gen_random_uuid()
session_id          uuid not null references practice_sessions(id) on delete cascade
question_id         uuid not null references questions(id)
answer_given        text not null               -- choice id (e.g. "b") or "unanswered"
is_correct          bool not null
time_spent_seconds  int not null default 0
hints_used          int not null default 0 check (hints_used between 0 and 3)
tts_used            bool not null default false
repeated_question   bool not null default false
attempt_number      int not null default 1      -- for practice mode retries
```

### `feedback`
```sql
id                    uuid primary key default gen_random_uuid()
submitted_by_type     text not null check (submitted_by_type in ('parent', 'child'))
submitted_by_id       uuid not null             -- parent.id or child.id depending on type
session_id            uuid references practice_sessions(id) on delete set null
question_id           uuid references questions(id) on delete set null
category              text not null
  check (category in ('bug', 'question_error', 'suggestion', 'praise', 'other', 'child_confused', 'child_read_again'))
message               text                      -- null for one-tap child feedback
voice_note_url        text                      -- signed Supabase Storage URL (private bucket)
status                text not null default 'new'
  check (status in ('new', 'reviewed', 'resolved'))
created_at            timestamptz default now()
```

Child one-tap feedback uses `category='child_confused'` or `'child_read_again'` with `message=null`. Parent full-form feedback uses any category with a free-text `message`. Both write to the same table.

---

## 5. Row-Level Security (RLS)

All tables have RLS enabled. Policies:

- **parents:** `SELECT/UPDATE` where `id = auth.uid()`
- **children:** `ALL` where `parent_id = auth.uid()`
- **practice_sessions:** `ALL` where `child_id IN (SELECT id FROM children WHERE parent_id = auth.uid())`
- **session_answers:** `ALL` where `session_id IN (SELECT id FROM practice_sessions WHERE child_id IN (SELECT id FROM children WHERE parent_id = auth.uid()))`
- **questions:** `SELECT` public (no auth required — questions are not sensitive)
- **feedback:** `INSERT` public (child submits without parent session); `SELECT/UPDATE` where `submitted_by_id = auth.uid()` or `submitted_by_type = 'child' AND session_id IN (...parent's sessions)`

---

## 6. Child Authentication Model

Children do **not** have Supabase Auth accounts. The parent logs in once (email/password or magic link). The parent session persists on the device. When a parent taps a child's avatar, the app navigates to `/practice/[childId]` — the `childId` is validated server-side against the authenticated parent's children via RLS. There is no separate child login, password, or session token.

**Session timeout:** The parent Supabase session lasts 1 week (Supabase default JWT expiry). On expiry, the user is redirected to `/login`. No forced re-auth on child avatar tap. The device is treated as a shared family device.

**Practice route protection:** `/practice/[childId]` Server Component fetches `children WHERE id = childId AND parent_id = auth.uid()`. If not found (wrong parent or child doesn't exist), redirect to `/dashboard`.

---

## 7. Practice Modes

| Mode | Description | Timer shown to child | Time tracked | Retry on wrong answer |
|---|---|---|---|---|
| **Practice** | Relaxed, no pressure | No | Yes (for parent report) | Yes — "Try again!" shown, child can retry before moving on |
| **Test** | Simulates real SOL | No (extended_time flag honored) | Yes | No — moves to next question after first answer |

**Session question count:**
- Practice mode: 10 questions (randomized by grade + subject, weighted toward weak topics if prior session data exists)
- Test mode: 20 questions (matches approximate SOL test length)

Questions are drawn without replacement within a session. Across sessions, questions are rotated — the query prioritizes questions not seen in the last 3 sessions for the child.

---

## 8. User Flows

### Parent Onboarding
1. `/signup` → email + password → Supabase `signUp()` → verification email sent
2. Verify email → redirected to `/dashboard`
3. First-time empty state: "Add your first child" CTA
4. Create child: name, grade (3/4/5), avatar emoji picker, accommodation toggles
5. Optionally: `/settings` → add API keys for premium TTS or simplified language
6. Dashboard shows child card — ready to practice

### Child Practice Flow
1. Parent at `/dashboard` → taps child avatar card
2. App navigates to `/practice/[childId]`
3. Kid-friendly home: large avatar, "Hi [Name]! Ready to practice?" with Reading/Math cards
4. Subject picker → Mode picker (Practice 🌱 / Test 📝 — with friendly descriptions)
5. `POST /api/sessions` → session created, accommodations snapshot written
6. Per-question loop:
   - Question rendered with `QuestionCard`
   - If `tts_enabled`: auto-read on mount via `TTSEngine.speak()`
   - Child selects answer → `PATCH /api/sessions/[id]/answers`
   - Practice mode: if wrong → gentle "Try again!" → child can retry (attempt tracked)
   - Practice mode: if correct or after retry → next question
   - Test mode: immediate advance regardless of correctness
   - `HintPanel`: up to 3 hints, each tap reveals next hint
   - Accommodation toolbar: always visible (collapses to icon strip in reduce-distractions mode)
7. All questions answered → `PATCH /api/sessions/[id]` sets `status='completed'`, `score_percent`, `ended_at`
8. Celebration screen: score as stars (0–5), confetti, "Great job!" message, "Practice again" button

### Session Abandonment
If the child closes the browser mid-session, `status` remains `'in_progress'`. On the child's next session start, a server action checks for stale `in_progress` sessions (started > 2 hours ago) and marks them `'abandoned'`. Abandoned sessions are excluded from dashboard stats.

### Child Feedback (during practice)
- 😕 icon on `QuestionCard`
- Bottom sheet: three large tap targets: "I don't understand" / "Something looks wrong" / "Read it again"
- Optional: hold microphone icon to record voice note (max 30 seconds, `audio/webm`, uploaded to Supabase Storage private bucket via signed upload URL)
- `POST /api/feedback` → `submitted_by_type='child'`, category set from tap, session_id + question_id attached
- Sheet closes, child continues without interruption

### Parent Feedback
- "Give feedback" link in parent nav
- Form: category dropdown + textarea message
- `POST /api/feedback` → `submitted_by_type='parent'`
- Confirmation toast

---

## 9. Calculator

Virginia SOL calculator policy for grades 3–5:
- **Grade 3 math:** No calculator on any section
- **Grades 4–5 math:** Calculator allowed on the calculator-active section (~half the questions)
- **Reading:** No calculator (always false)

The `questions.calculator_allowed` boolean field drives this automatically. During practice, when `question.calculator_allowed = true`, an `<OnScreenCalculator>` component renders inline below the question.

The calculator is a simple 4-function UI (+, −, ×, ÷) with a clear and equals button — no scientific mode, no external library. It uses an `eval`-free expression parser (simple stack-based evaluator) to avoid security issues. It does not submit answers — it is purely a computation aid.

---

## 10. Accommodations System

### TTSEngine Interface
```typescript
interface TTSEngine {
  speak(text: string, options?: { rate?: number; lang?: string }): Promise<void>
  stop(): void
  isAvailable(): Promise<boolean>   // checks API key validity + provider reachability
}

// Fallback chain:
// configured provider → WebSpeechEngine (always available in modern browsers)
// If configured engine's isAvailable() returns false, fall back silently to WebSpeechEngine.
// Parent sees a one-time warning toast: "Your [OpenAI/ElevenLabs] key couldn't be reached.
//   Using browser voice instead."
```

**Invalid/expired API key behavior:** On `isAvailable()` failure (HTTP 401, 429, network error), the engine logs the error, falls back to `WebSpeechEngine`, and emits a `tts:fallback` event. The parent dashboard shows a yellow warning banner: "TTS key issue detected — check Settings."

### AccommodationState Interface
```typescript
interface AccommodationState {
  tts: {
    enabled: boolean        // default: true
    speed: number           // default: 1.0, range: 0.5–2.0
    engine: TTSEngine       // resolved at session start
  }
  simplifiedLanguage: boolean   // default: false
  highContrast: boolean         // default: false
  largeText: 0 | 1 | 2         // 0=18px, 1=24px, 2=30px base font
  dyslexiaFont: boolean         // default: false (OpenDyslexic)
  reduceDistractions: boolean   // default: false
  extendedTime: boolean         // default: false (hides any timers)
  hintsEnabled: boolean         // default: true
  positiveReinforcement: boolean // default: true
}
```

### Visual Modes Implementation
- **High contrast:** CSS class `theme-high-contrast` on `<html>` → overrides Tailwind CSS variables (`--background: #000000`, `--foreground: #FFFFFF`, `--accent: #FFD700`)
- **Large text:** CSS class `text-large` / `text-xl` on `<html>` → `font-size: 18px / 24px / 30px` base, all rem units scale accordingly
- **Dyslexia font:** CSS class `font-dyslexic` on `<html>` → `font-family: OpenDyslexic, sans-serif`
- **Reduce distractions:** `reduceDistractions` flag in context → `AccommodationToolbar` collapses to icon strip; progress bar hidden; all CSS animations set to `animation: none`

### Hint System
- Hints stored as `hint_1`, `hint_2`, `hint_3` text columns on `questions`
- `HintPanel` tracks `hintsRevealedCount` (0–3) in local state
- Each tap: `hintsRevealedCount++`, new hint text fades in
- After hint 3: "Ask a grown-up for help! 🙋" message shown
- `hints_used` in `session_answers` records final count at answer submission
- Questions without hints (`hint_1 = null`): hint button hidden if all three are null

### Positive Reinforcement
- **Correct answer:** CSS keyframe animation (star burst on the selected choice) + Web Audio API tone (440 Hz triangle wave, 200ms — no audio file required)
- **3-correct streak:** `StreakBanner` component fades in with "🔥 3 in a row!" — auto-dismisses after 2 seconds
- **Session complete:** Full `SessionComplete` screen — score displayed as 1–5 star rating (0–59%=1★, 60–69%=2★, 70–79%=3★, 80–89%=4★, 90–100%=5★), CSS confetti animation, Web Audio API fanfare (chord sequence)
- **Wrong answer in practice mode:** Neutral yellow border on choice + "Try again! You can do it 💪" — no red, no negative sound, no visible score change

---

## 10. Parent Dashboard

### Metrics Definitions

**Quick stats** (computed from `practice_sessions` + `session_answers` for this child):
- Sessions this week: `COUNT(*)` where `started_at >= Monday 00:00` and `status = 'completed'`
- Average score: `AVG(score_percent)` over last 10 completed sessions
- Current streak: consecutive calendar days with at least one completed session (resets if a day is missed)

**Weak areas algorithm:**
1. For each `topic`, compute `AVG(is_correct)` across all `session_answers` in the last 30 days
2. Topics with `AVG(is_correct) < 0.65` (below 65% accuracy) are flagged as weak
3. Sorted by accuracy ascending — weakest first
4. "Weak areas callout" shows top 2 weak topics with their accuracy percentage

**Topic display mapping:**
The `topic` column on `questions` is the display label (e.g., "Fractions", "Main Idea"). The dashboard groups and displays these directly — no separate lookup table needed. The `sol_standard` field provides a secondary label for parents who want the official standard code.

### `/parent/dashboard`
- Child avatar selector (horizontal scroll if multiple children)
- Quick stats row: three `StatCard` components
- Progress by topic: `ProgressChart` — horizontal bar per topic, color-coded (green ≥80%, yellow 65–79%, red <65%)
- Weak areas callout: `WeakAreasCallout` — shown only if ≥1 weak topic exists
- Recent sessions table: date, subject, mode, score (stars), duration, accommodations icons

### `/parent/settings`
- Child profile editor (name, grade, avatar, accommodation toggles) — one section per child
- API Keys section: masked input fields for OpenAI key and ElevenLabs key; save triggers server action that encrypts and stores; "Test key" button calls `isAvailable()` and shows result
- TTS provider dropdown: Web Speech (free) / OpenAI / ElevenLabs — disabled options if no key saved

### `/parent/feedback`
- Submission form (category + message)
- Submitted feedback list with `status` badges (New / Reviewed / Resolved)

---

## 11. Voice Notes (Child Feedback)

- **Recording:** Browser `MediaRecorder` API, `audio/webm;codecs=opus` format, max 30 seconds
- **Upload:** Client requests signed upload URL from `POST /api/feedback/upload-url` (server action, authenticated parent session); client uploads directly to Supabase Storage private bucket `feedback-voice-notes`
- **Playback:** Parent views feedback in Supabase Studio (v1) — no in-app playback UI in v1. The `voice_note_url` column stores the Supabase Storage path; playback is out of scope for v1.
- **Size:** `audio/webm` at 30s ≈ 60–120 KB — well within Supabase free storage tier

---

## 12. Question Seed Data

**Volume target:** Minimum 30 questions per grade × subject × difficulty combination at launch.
- Grades 3, 4, 5 × subjects Reading, Math × difficulties 1, 2, 3 = 18 buckets × 30 = **540 questions minimum**
- Source: Virginia DOE released SOL test items (publicly available PDFs, manually transcribed to JSON)
- Seed format: `supabase/seed/questions.json` → `npm run db:seed` inserts via Supabase client
- `simplified_text`: generated by `npm run generate:simplified` (calls OpenAI API once per question; requires `OPENAI_API_KEY` in env; results stored in DB; safe to skip for local dev — app falls back to `question_text`)

---

## 13. Local Development Setup

```bash
# Prerequisites: Node 20+, Docker Desktop

# 1. Clone and install
git clone <repo>
cd sol-practice
npm install

# 2. Start local Supabase
npx supabase start
# Prints local URLs and keys — copy to .env.local

# 3. Apply schema
npx supabase db push

# 4. Seed questions
npm run db:seed

# 5. Set up env
cp .env.local.example .env.local
# Required vars:
# NEXT_PUBLIC_SUPABASE_URL     (from supabase start output)
# NEXT_PUBLIC_SUPABASE_ANON_KEY (from supabase start output)
# SUPABASE_SERVICE_ROLE_KEY    (from supabase start output)
# ENCRYPTION_SECRET            (32-byte hex string, generate with: openssl rand -hex 32)

# 6. Run the app
npm run dev
# → http://localhost:3000
# → Supabase Studio: http://localhost:54323
```

---

## 14. Security Considerations

- **RLS** on all tables — parents access only their own data
- **API key encryption:** AES-256-GCM, server-side only, `ENCRYPTION_SECRET` in Vercel env vars
- **Child privacy:** No PII collected beyond first name + grade. No email, no last name, no DOB.
- **Child auth:** No Supabase Auth account for children — practice route protected by parent session + RLS
- **Voice notes:** Private Supabase Storage bucket, signed upload URL expires in 60 seconds, path not guessable
- **Feedback:** Child feedback `POST /api/feedback` validates `session_id` belongs to the authenticated parent's child before inserting
- **Questions:** Public read access is intentional — SOL questions are public domain (Virginia DOE released items)

---

## 15. Extensibility Reference

| Future capability | How supported today |
|---|---|
| Add Grade 6+ | Insert `questions` rows with `grade=6`; grade selector queries distinct values dynamically |
| Calculator for new grades | Set `calculator_allowed=true` on relevant question rows — calculator UI appears automatically |
| Add Science / History | Insert rows with `subject='science'`; subject picker auto-updates |
| Spanish language support | Add `question_text_es`, `simplified_text_es` columns; Web Speech API handles `lang='es-US'` |
| AI question generation | `source='ai_generated'` already in schema; add generation endpoint independently |
| Teacher / classroom portal | Add `role` to users; scope RLS policies and dashboard queries by role |
| Additional TTS engines | Implement `TTSEngine` interface; register in engine factory function |
| New accommodation types | Add field to `accommodations` JSONB + toggle in settings UI — no migration needed |
| In-app voice note playback | Add `GET /api/feedback/[id]/voice` that returns a fresh signed URL; render `<audio>` element |
