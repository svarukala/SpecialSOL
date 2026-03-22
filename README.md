# Virginia SOL Practice App

A home-based Standards of Learning practice app for children grades 3–5 with special needs and learning disabilities. Parents manage profiles and accommodations; children practice reading and math with full accessibility support.

---

## Features

- **Virginia SOL alignment** — Reading and Math, grades 3–5
- **Accessibility accommodations**
  - Text-to-speech (browser built-in, OpenAI TTS, or ElevenLabs)
  - Dyslexia-friendly font (OpenDyslexic)
  - High-contrast mode
  - Large text (3 size steps)
  - Simplified question language
  - Progressive hints
  - Reduce distractions mode
  - Extended time (no timer enforcement)
  - Positive reinforcement (chimes, star ratings, streaks)
- **On-screen calculator** — shown only on calculator-allowed questions (Grade 4–5 Math)
- **Two modes** — Practice (10 questions, retries allowed) and Test (20 questions, no retries)
- **Parent dashboard** — topic accuracy, streaks, session history
- **Bring your own API key** — OpenAI or ElevenLabs TTS (encrypted AES-256-GCM server-side)
- **Child feedback** — one-tap reactions and 30-second voice notes

---

## Prerequisites

- Node.js 20+
- Docker Desktop (for local Supabase)
- Supabase CLI: `npm install -g supabase`

---

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Start local Supabase

```bash
npx supabase start
```

Copy the printed `API URL`, `anon key`, and `service_role key` for the next step.

### 3. Configure environment variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase start>
SUPABASE_SERVICE_ROLE_KEY=<service_role key from supabase start>
ENCRYPTION_SECRET=<64 hex characters — run: openssl rand -hex 32>
```

### 4. Apply database migrations

```bash
npx supabase db push
```

### 5. Seed sample questions

```bash
npm run db:seed
```

### 6. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign up as a parent, add a child, and start practicing.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key (server-only, for seeding) |
| `ENCRYPTION_SECRET` | ✅ | 64 hex chars used to encrypt API keys at rest |

Generate `ENCRYPTION_SECRET`:
```bash
openssl rand -hex 32
```

---

## Deploying to Vercel + Supabase

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Apply migrations: `npx supabase db push --db-url <your-supabase-db-url>`
3. Seed questions: `SUPABASE_SERVICE_ROLE_KEY=<key> npm run db:seed`
4. Push to GitHub and import the repo in [vercel.com](https://vercel.com)
5. Set all four environment variables in Vercel's project settings
6. Deploy — fully serverless, no additional infrastructure needed

---

## Adding Questions

Edit `supabase/seed/questions.json` and run `npm run db:seed` (idempotent — safe to re-run).

Each question follows this shape:

```json
{
  "grade": 3,
  "subject": "math",
  "topic": "Place Value",
  "sol_standard": "3.1",
  "difficulty": "medium",
  "question_text": "What is the value of the digit 7 in 472?",
  "simplified_text": "In the number 472, what does the 7 mean?",
  "question_type": "multiple_choice",
  "choices": ["7", "70", "700", "7000"],
  "correct_answer": "70",
  "hints": ["Look at which place the 7 is in.", "The 7 is in the tens place."],
  "calculator_allowed": false
}
```

**`calculator_allowed` rules (Virginia SOL):**
- Grade 3 Math: always `false`
- Grade 4–5 Math: `true` on calculator-active questions, `false` on non-calculator questions
- Reading: always `false`

---

## Adding Grades or Subjects

1. Add questions to `questions.json` with the new `grade`/`subject` values
2. Re-run `npm run db:seed`
3. The subject/mode picker reads available subjects dynamically — no code changes needed

---

## Running Tests

```bash
npm test
```

All tests use Vitest + React Testing Library. No external services required.

---

## Generating Simplified Question Text

If you have an OpenAI API key, you can auto-generate `simplified_text` for questions missing it:

```bash
OPENAI_API_KEY=sk-... npm run generate:simplified
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Database | Supabase (Postgres + RLS + Storage) |
| Auth | Supabase Auth (parents only — children have no accounts) |
| UI | shadcn/ui + Tailwind CSS |
| TTS | Web Speech API (free) / OpenAI TTS / ElevenLabs (BYOK) |
| Encryption | AES-256-GCM via Web Crypto API |
| Testing | Vitest + React Testing Library |
| Fonts | Geist (UI) + OpenDyslexic (accessibility) |
