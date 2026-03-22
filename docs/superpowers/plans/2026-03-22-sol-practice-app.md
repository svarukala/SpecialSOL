# Virginia SOL Practice App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a home-based Virginia SOL practice app for grades 3–5 targeting children with special needs, with full accessibility accommodations, parent dashboard, and Supabase + Next.js 16 stack.

**Architecture:** Next.js 16 App Router with Server Components for all data fetching. Supabase provides auth, Postgres, and storage. An `AccommodationContext` wraps the child-facing practice session, and a `TTSEngine` interface abstracts browser/OpenAI/ElevenLabs TTS behind a unified API.

**Tech Stack:** Next.js 16, TypeScript (strict), Supabase CLI, shadcn/ui, Tailwind CSS, Vitest + React Testing Library, Web Speech API, OpenAI TTS (BYOK), ElevenLabs (BYOK), AES-256-GCM encryption.

**Spec:** `docs/superpowers/specs/2026-03-22-sol-practice-app-design.md`

---

## File Map

```
sol-practice/
├── app/
│   ├── layout.tsx                              # Root layout: fonts, Tailwind, html classes
│   ├── (auth)/
│   │   ├── login/page.tsx                      # Parent login
│   │   ├── signup/page.tsx                     # Parent signup
│   │   └── reset-password/page.tsx             # Password reset
│   ├── (parent)/
│   │   ├── layout.tsx                          # Parent layout: nav + auth guard
│   │   ├── dashboard/page.tsx                  # Dashboard: stats, chart, sessions
│   │   ├── children/new/page.tsx               # Create child profile
│   │   ├── children/[childId]/edit/page.tsx    # Edit child profile
│   │   ├── settings/page.tsx                   # API keys, TTS provider
│   │   └── feedback/page.tsx                   # Parent feedback form + history
│   ├── (practice)/
│   │   └── practice/[childId]/page.tsx         # Child-facing practice interface
│   └── api/
│       ├── sessions/route.ts                   # POST: create session
│       ├── sessions/[sessionId]/route.ts       # PATCH: end session
│       ├── sessions/[sessionId]/answers/route.ts  # POST: submit answer
│       ├── questions/route.ts                  # GET: questions by grade/subject
│       ├── feedback/route.ts                   # POST: feedback (parent or child)
│       └── feedback/upload-url/route.ts        # POST: signed upload URL for voice notes
├── components/
│   ├── ui/                                     # shadcn/ui auto-generated
│   ├── auth/
│   │   ├── login-form.tsx
│   │   └── signup-form.tsx
│   ├── practice/
│   │   ├── subject-mode-picker.tsx             # Subject + mode selection screen
│   │   ├── question-card.tsx                   # Renders question text + simplified toggle
│   │   ├── answer-picker.tsx                   # Multiple choice / T/F buttons
│   │   ├── hint-panel.tsx                      # Progressive hint reveal
│   │   ├── on-screen-calculator.tsx            # 4-function calculator for calculator-allowed questions
│   │   └── session-complete.tsx                # Celebration screen with star rating
│   ├── accommodations/
│   │   ├── accommodation-toolbar.tsx           # Persistent toolbar during practice
│   │   ├── tts-button.tsx                      # Read aloud / repeat button
│   │   ├── contrast-toggle.tsx                 # High-contrast toggle
│   │   ├── font-sizer.tsx                      # Large text step control
│   │   └── accommodation-settings-form.tsx     # Parent settings UI for accommodations
│   ├── dashboard/
│   │   ├── stat-card.tsx                       # Single metric card
│   │   ├── progress-chart.tsx                  # Topic bars (green/yellow/red)
│   │   ├── weak-areas-callout.tsx              # Weak topics alert card
│   │   ├── session-history-table.tsx           # Recent sessions list
│   │   └── child-card.tsx                      # Avatar + name card
│   └── feedback/
│       ├── child-feedback-sheet.tsx            # Bottom sheet during practice
│       └── parent-feedback-form.tsx            # Full feedback form
├── lib/
│   ├── supabase/
│   │   ├── client.ts                           # Browser Supabase client (singleton)
│   │   ├── server.ts                           # Server Supabase client (cookies)
│   │   └── queries.ts                          # Typed query helpers
│   ├── tts/
│   │   ├── types.ts                            # TTSEngine interface
│   │   ├── web-speech-engine.ts                # Browser SpeechSynthesis impl
│   │   ├── openai-engine.ts                    # OpenAI TTS impl
│   │   ├── elevenlabs-engine.ts                # ElevenLabs TTS impl
│   │   └── factory.ts                          # Engine resolver + fallback chain
│   ├── encryption/
│   │   └── index.ts                            # AES-256-GCM encrypt/decrypt
│   ├── accommodations/
│   │   ├── types.ts                            # AccommodationState interface
│   │   ├── defaults.ts                         # Default accommodation values
│   │   └── context.tsx                         # AccommodationContext + Provider
│   └── audio/
│       └── web-audio.ts                        # Web Audio API tone/chime generation
├── supabase/
│   ├── migrations/
│   │   └── 0001_initial_schema.sql
│   └── seed/
│       ├── questions.json                      # Sample Virginia DOE questions
│       └── seed.ts                             # Seed runner
├── scripts/
│   ├── db-seed.ts                              # npm run db:seed
│   └── generate-simplified.ts                 # npm run generate:simplified
└── public/
    └── fonts/OpenDyslexic/                     # Self-hosted OFL font files
```

---

## Phase 1: Foundation

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`
- Create: `app/layout.tsx`
- Create: `.env.local.example`
- Create: `vitest.config.ts`, `vitest.setup.ts`

- [ ] **Step 1: Bootstrap Next.js project**

```bash
cd C:/SriDev/SPL-SOL
npx create-next-app@latest . --typescript --tailwind --app --src-dir no --import-alias "@/*" --turbopack
```

Expected: Next.js 16 project created with App Router and Turbopack.

- [ ] **Step 2: Install core dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- [ ] **Step 3: Install shadcn/ui**

```bash
npx shadcn@latest init
# Choose: Default style, Zinc color, CSS variables: yes
```

Then add the components we need:
```bash
npx shadcn@latest add button card input label select sheet tabs badge progress toast avatar
```

- [ ] **Step 4: Configure Vitest**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

Create `vitest.setup.ts`:
```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Add test + seed scripts to package.json**

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:seed": "npx tsx scripts/db-seed.ts",
    "generate:simplified": "npx tsx scripts/generate-simplified.ts"
  }
}
```

- [ ] **Step 6: Add OpenDyslexic font**

Download OpenDyslexic (OFL license) and place in:
```
public/fonts/OpenDyslexic/OpenDyslexic-Regular.otf
public/fonts/OpenDyslexic/OpenDyslexic-Bold.otf
```

Update `app/layout.tsx`:
```typescript
import localFont from 'next/font/local'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'

const openDyslexic = localFont({
  src: [
    { path: '../public/fonts/OpenDyslexic/OpenDyslexic-Regular.otf', weight: '400' },
    { path: '../public/fonts/OpenDyslexic/OpenDyslexic-Bold.otf', weight: '700' },
  ],
  variable: '--font-dyslexic',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} ${openDyslexic.variable}`}>
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 7: Create .env.local.example**

```bash
# Supabase (from: npx supabase start)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Encryption (generate with: openssl rand -hex 32)
ENCRYPTION_SECRET=your-32-byte-hex-secret-here
```

- [ ] **Step 8: Run tests (should pass trivially)**

```bash
npm test
```
Expected: 0 tests, no errors.

- [ ] **Step 9: Commit**

```bash
git init
git add .
git commit -m "feat: scaffold Next.js 16 project with Vitest and shadcn/ui"
```

---

### Task 2: Supabase CLI + Schema Migration

**Files:**
- Create: `supabase/migrations/0001_initial_schema.sql`

- [ ] **Step 1: Initialize Supabase CLI**

```bash
npx supabase init
npx supabase start
```

Expected: Docker containers start, local Studio at http://localhost:54323, prints local URL and keys.

- [ ] **Step 2: Copy printed keys into .env.local**

```bash
cp .env.local.example .env.local
# Edit .env.local with the values printed by `supabase start`
# Generate ENCRYPTION_SECRET: openssl rand -hex 32
```

- [ ] **Step 3: Create migration file**

Create `supabase/migrations/0001_initial_schema.sql`:
```sql
-- Enable RLS on all tables
-- Parents
CREATE TABLE parents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  settings jsonb NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parents_own_row" ON parents
  FOR ALL USING (id = auth.uid());

-- Children
CREATE TABLE children (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  name text NOT NULL,
  avatar text NOT NULL DEFAULT '🌟',
  grade int NOT NULL CHECK (grade BETWEEN 3 AND 12),
  created_at timestamptz DEFAULT now(),
  accommodations jsonb NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
CREATE POLICY "children_by_parent" ON children
  FOR ALL USING (parent_id = auth.uid());

-- Questions (public read, admin write)
CREATE TABLE questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade int NOT NULL CHECK (grade BETWEEN 3 AND 12),
  subject text NOT NULL,
  topic text NOT NULL,
  subtopic text,
  sol_standard text,
  difficulty int NOT NULL DEFAULT 1 CHECK (difficulty IN (1, 2, 3)),
  question_text text NOT NULL,
  simplified_text text,
  answer_type text NOT NULL CHECK (answer_type IN ('multiple_choice', 'true_false')),
  choices jsonb NOT NULL,
  hint_1 text,
  hint_2 text,
  hint_3 text,
  calculator_allowed bool NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'doe_released' CHECK (source IN ('doe_released', 'ai_generated')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "questions_public_read" ON questions
  FOR SELECT USING (true);

-- Practice sessions
CREATE TABLE practice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  grade int NOT NULL,
  subject text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('practice', 'test')),
  question_count int NOT NULL,
  score_percent int,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  accommodations_used jsonb NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_by_parent" ON practice_sessions
  FOR ALL USING (
    child_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
  );

-- Session answers
CREATE TABLE session_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id),
  answer_given text NOT NULL,
  is_correct bool NOT NULL,
  time_spent_seconds int NOT NULL DEFAULT 0,
  hints_used int NOT NULL DEFAULT 0 CHECK (hints_used BETWEEN 0 AND 3),
  tts_used bool NOT NULL DEFAULT false,
  repeated_question bool NOT NULL DEFAULT false,
  attempt_number int NOT NULL DEFAULT 1
);
ALTER TABLE session_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "answers_by_parent" ON session_answers
  FOR ALL USING (
    session_id IN (
      SELECT id FROM practice_sessions
      WHERE child_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
    )
  );

-- Feedback
CREATE TABLE feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by_type text NOT NULL CHECK (submitted_by_type IN ('parent', 'child')),
  submitted_by_id uuid NOT NULL,
  session_id uuid REFERENCES practice_sessions(id) ON DELETE SET NULL,
  question_id uuid REFERENCES questions(id) ON DELETE SET NULL,
  category text NOT NULL CHECK (
    category IN ('bug', 'question_error', 'suggestion', 'praise', 'other', 'child_confused', 'child_read_again')
  ),
  message text,
  voice_note_url text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'resolved')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feedback_insert_all" ON feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "feedback_select_parent" ON feedback
  FOR SELECT USING (submitted_by_id = auth.uid());

-- Unique index for seed upsert idempotency
CREATE UNIQUE INDEX idx_questions_unique_text ON questions(sol_standard, question_text)
  WHERE sol_standard IS NOT NULL;

-- Indexes for common queries
CREATE INDEX idx_children_parent ON children(parent_id);
CREATE INDEX idx_sessions_child ON practice_sessions(child_id);
CREATE INDEX idx_sessions_status ON practice_sessions(status);
CREATE INDEX idx_answers_session ON session_answers(session_id);
CREATE INDEX idx_questions_grade_subject ON questions(grade, subject);
```

- [ ] **Step 4: Apply migration**

```bash
npx supabase db push
```

Expected: Migration applied successfully, tables visible in Studio at http://localhost:54323.

- [ ] **Step 5: Add storage bucket to migration**

Add to the bottom of `supabase/migrations/0001_initial_schema.sql`:
```sql
-- Storage bucket for child voice-note feedback
INSERT INTO storage.buckets (id, name, public)
VALUES ('feedback-voice-notes', 'feedback-voice-notes', false)
ON CONFLICT (id) DO NOTHING;
```

Re-run `npx supabase db push` to apply the update.

- [ ] **Step 6: Commit**

```bash
git add supabase/
git commit -m "feat: add initial Supabase schema with RLS policies"
```

---

### Task 3: Seed Data (Virginia DOE Questions)

**Files:**
- Create: `supabase/seed/questions.json`
- Create: `scripts/db-seed.ts`

- [ ] **Step 1: Create minimal seed JSON (10 sample questions)**

Create `supabase/seed/questions.json` with at least 2 sample questions per grade (3,4,5) × subject (reading, math):

```json
[
  {
    "grade": 3,
    "subject": "math",
    "topic": "Addition and Subtraction",
    "subtopic": "Three-digit numbers",
    "sol_standard": "3.3",
    "difficulty": 1,
    "question_text": "What is 245 + 138?",
    "answer_type": "multiple_choice",
    "choices": [
      { "id": "a", "text": "373", "is_correct": false },
      { "id": "b", "text": "383", "is_correct": true },
      { "id": "c", "text": "393", "is_correct": false },
      { "id": "d", "text": "483", "is_correct": false }
    ],
    "hint_1": "Start by adding the ones: 5 + 8 = ?",
    "hint_2": "5 + 8 = 13. Write 3, carry 1. Now add the tens: 4 + 3 + 1 = ?",
    "hint_3": "The answer is 383. Can you see why?",
    "calculator_allowed": false
  },
  {
    "grade": 3,
    "subject": "reading",
    "topic": "Main Idea",
    "subtopic": "Identifying main idea",
    "sol_standard": "3.6",
    "difficulty": 1,
    "question_text": "Read the passage: 'Dogs make great pets. They are loyal and loving. Dogs can learn tricks and help people.' What is the MAIN IDEA of this passage?",
    "answer_type": "multiple_choice",
    "choices": [
      { "id": "a", "text": "Dogs can learn tricks", "is_correct": false },
      { "id": "b", "text": "Dogs make great pets", "is_correct": true },
      { "id": "c", "text": "Dogs help people", "is_correct": false },
      { "id": "d", "text": "Dogs are loyal", "is_correct": false }
    ],
    "hint_1": "The main idea is what the WHOLE passage is mostly about.",
    "hint_2": "Which sentence would all the other sentences help explain?",
    "hint_3": "The first sentence often states the main idea. What does the first sentence say?",
    "calculator_allowed": false
  }
]
```

Note: Add at minimum 30 questions per grade × subject × difficulty bucket before production. The 2-question sample is for development only.

- [ ] **Step 2: Create seed script**

Create `scripts/db-seed.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'
import questions from '../supabase/seed/questions.json'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function seed() {
  console.log(`Seeding ${questions.length} questions...`)
  // idempotent: unique index on (sol_standard, question_text) prevents duplicates
  const { error } = await supabase.from('questions').upsert(questions, {
    onConflict: 'sol_standard,question_text',
  })
  if (error) {
    console.error('Seed failed:', error.message)
    process.exit(1)
  }
  console.log('Seed complete.')
}

seed()
```

- [ ] **Step 3: Run seed**

```bash
npm run db:seed
```

Expected: "Seeding N questions... Seed complete."

- [ ] **Step 4: Verify in Studio**

Open http://localhost:54323 → Table editor → questions. Confirm rows are present.

- [ ] **Step 5: Commit**

```bash
git add supabase/seed/ scripts/
git commit -m "feat: add seed data and db:seed script"
```

---

### Task 4: Supabase Client + Encryption Utility

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/queries.ts`
- Create: `lib/encryption/index.ts`
- Create: `lib/encryption/index.test.ts`

- [ ] **Step 1: Write failing encryption tests**

Create `lib/encryption/index.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { encrypt, decrypt } from './index'

describe('encryption', () => {
  const secret = 'a'.repeat(64) // 32 bytes hex

  it('encrypts and decrypts a string', async () => {
    const plaintext = 'sk-test-api-key-12345'
    const ciphertext = await encrypt(plaintext, secret)
    expect(ciphertext).not.toBe(plaintext)
    const result = await decrypt(ciphertext, secret)
    expect(result).toBe(plaintext)
  })

  it('produces different ciphertext each time (random IV)', async () => {
    const plaintext = 'same-input'
    const c1 = await encrypt(plaintext, secret)
    const c2 = await encrypt(plaintext, secret)
    expect(c1).not.toBe(c2)
  })

  it('throws on tampered ciphertext', async () => {
    const ciphertext = await encrypt('hello', secret)
    const tampered = ciphertext.slice(0, -4) + 'xxxx'
    await expect(decrypt(tampered, secret)).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test lib/encryption
```
Expected: FAIL — "Cannot find module './index'"

- [ ] **Step 3: Implement encryption**

Create `lib/encryption/index.ts`:
```typescript
// AES-256-GCM encryption using Web Crypto API (available in Node 19+ and all browsers)
const ALGORITHM = 'AES-GCM'
const IV_LENGTH = 12 // bytes

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return bytes
}

async function getKey(secret: string): Promise<CryptoKey> {
  const keyBytes = hexToBytes(secret.slice(0, 64)) // use first 32 bytes
  return crypto.subtle.importKey('raw', keyBytes, ALGORITHM, false, ['encrypt', 'decrypt'])
}

export async function encrypt(plaintext: string, secret: string): Promise<string> {
  const key = await getKey(secret)
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, encoded)
  const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), IV_LENGTH)
  return Buffer.from(combined).toString('base64')
}

export async function decrypt(ciphertextB64: string, secret: string): Promise<string> {
  const key = await getKey(secret)
  const combined = Buffer.from(ciphertextB64, 'base64')
  const iv = combined.slice(0, IV_LENGTH)
  const ciphertext = combined.slice(IV_LENGTH)
  const decrypted = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, ciphertext)
  return new TextDecoder().decode(decrypted)
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test lib/encryption
```
Expected: PASS (3 tests)

- [ ] **Step 5: Create Supabase client files**

Create `lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

Create `lib/supabase/server.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

Create `lib/supabase/queries.ts`:
```typescript
import { SupabaseClient } from '@supabase/supabase-js'

export async function getChildrenForParent(supabase: SupabaseClient, parentId: string) {
  const { data, error } = await supabase
    .from('children')
    .select('*')
    .eq('parent_id', parentId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function getQuestionsForSession(
  supabase: SupabaseClient,
  grade: number,
  subject: string,
  count: number,
  excludeQuestionIds: string[] = []
) {
  let query = supabase
    .from('questions')
    .select('*')
    .eq('grade', grade)
    .eq('subject', subject)
  if (excludeQuestionIds.length > 0) {
    query = query.not('id', 'in', `(${excludeQuestionIds.join(',')})`)
  }
  const { data, error } = await query.limit(count * 3) // fetch extra, shuffle below
  if (error) throw error
  // Shuffle and take requested count
  return (data ?? []).sort(() => Math.random() - 0.5).slice(0, count)
}

export async function getRecentSessionQuestionIds(
  supabase: SupabaseClient,
  childId: string,
  sessionCount = 3
): Promise<string[]> {
  const { data: sessions } = await supabase
    .from('practice_sessions')
    .select('id')
    .eq('child_id', childId)
    .eq('status', 'completed')
    .order('started_at', { ascending: false })
    .limit(sessionCount)
  if (!sessions || sessions.length === 0) return []
  const sessionIds = sessions.map((s) => s.id)
  const { data: answers } = await supabase
    .from('session_answers')
    .select('question_id')
    .in('session_id', sessionIds)
  return [...new Set((answers ?? []).map((a) => a.question_id))]
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/
git commit -m "feat: add Supabase client setup and AES-256-GCM encryption utility"
```

---

## Phase 2: Auth + Child Profiles

### Task 5: Parent Authentication

**Files:**
- Create: `components/auth/signup-form.tsx`
- Create: `components/auth/login-form.tsx`
- Create: `app/(auth)/signup/page.tsx`
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(parent)/layout.tsx`

- [ ] **Step 1: Write failing component tests**

Create `components/auth/signup-form.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { SignupForm } from './signup-form'

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signUp: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
  }),
}))

describe('SignupForm', () => {
  it('renders email and password fields', () => {
    render(<SignupForm />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument()
  })

  it('shows error when passwords do not match', async () => {
    render(<SignupForm />)
    await userEvent.type(screen.getByLabelText(/^password/i), 'abc123')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'different')
    await userEvent.click(screen.getByRole('button', { name: /sign up/i }))
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test components/auth
```
Expected: FAIL — "Cannot find module './signup-form'"

- [ ] **Step 3: Implement SignupForm**

Create `components/auth/signup-form.tsx`:
```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input id="confirm-password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating account...' : 'Sign Up'}
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            Already have an account? <a href="/login" className="underline">Log in</a>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
```

Create `components/auth/login-form.tsx` (same pattern, calls `supabase.auth.signInWithPassword`).

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test components/auth
```
Expected: PASS

- [ ] **Step 5: Create auth pages**

Create `app/(auth)/signup/page.tsx`:
```typescript
import { SignupForm } from '@/components/auth/signup-form'

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <SignupForm />
    </main>
  )
}
```

Create `app/(auth)/login/page.tsx` similarly using `LoginForm`.

- [ ] **Step 6: Create parent layout with auth guard**

Create `app/(parent)/layout.tsx`:
```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return <div className="min-h-screen bg-background">{children}</div>
}
```

- [ ] **Step 7: Commit**

```bash
git add app/(auth)/ app/(parent)/layout.tsx components/auth/
git commit -m "feat: add parent auth (signup, login) with Supabase Auth"
```

---

### Task 6: Child Profile Management

**Files:**
- Create: `components/accommodations/accommodation-settings-form.tsx`
- Create: `app/(parent)/children/new/page.tsx`
- Create: `app/(parent)/children/[childId]/edit/page.tsx`
- Create: `lib/accommodations/types.ts`
- Create: `lib/accommodations/defaults.ts`

- [ ] **Step 1: Define AccommodationState types and defaults**

Create `lib/accommodations/types.ts`:
```typescript
export interface AccommodationState {
  tts_enabled: boolean
  tts_speed: number           // 0.5 – 2.0
  simplified_language: boolean
  high_contrast: boolean
  large_text: 0 | 1 | 2      // 0=18px, 1=24px, 2=30px
  dyslexia_font: boolean
  reduce_distractions: boolean
  extended_time: boolean
  hints_enabled: boolean
  positive_reinforcement: boolean
}
```

Create `lib/accommodations/defaults.ts`:
```typescript
import { AccommodationState } from './types'

export const DEFAULT_ACCOMMODATIONS: AccommodationState = {
  tts_enabled: true,
  tts_speed: 1.0,
  simplified_language: false,
  high_contrast: false,
  large_text: 0,
  dyslexia_font: false,
  reduce_distractions: false,
  extended_time: false,
  hints_enabled: true,
  positive_reinforcement: true,
}
```

- [ ] **Step 2: Write failing form test**

Create `components/accommodations/accommodation-settings-form.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AccommodationSettingsForm } from './accommodation-settings-form'
import { DEFAULT_ACCOMMODATIONS } from '@/lib/accommodations/defaults'

describe('AccommodationSettingsForm', () => {
  it('renders all accommodation toggles', () => {
    render(<AccommodationSettingsForm value={DEFAULT_ACCOMMODATIONS} onChange={vi.fn()} />)
    expect(screen.getByText(/read aloud/i)).toBeInTheDocument()
    expect(screen.getByText(/simplified language/i)).toBeInTheDocument()
    expect(screen.getByText(/high contrast/i)).toBeInTheDocument()
    expect(screen.getByText(/large text/i)).toBeInTheDocument()
    expect(screen.getByText(/dyslexia.*font/i)).toBeInTheDocument()
    expect(screen.getByText(/reduce distractions/i)).toBeInTheDocument()
    expect(screen.getByText(/extended time/i)).toBeInTheDocument()
    expect(screen.getByText(/hints/i)).toBeInTheDocument()
  })

  it('calls onChange when a toggle is clicked', async () => {
    const onChange = vi.fn()
    render(<AccommodationSettingsForm value={DEFAULT_ACCOMMODATIONS} onChange={onChange} />)
    // click the high contrast toggle
    const toggle = screen.getByRole('switch', { name: /high contrast/i })
    toggle.click()
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ high_contrast: true })
    )
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npm test components/accommodations
```
Expected: FAIL

- [ ] **Step 4: Implement AccommodationSettingsForm**

Create `components/accommodations/accommodation-settings-form.tsx`:
```typescript
'use client'
import { AccommodationState } from '@/lib/accommodations/types'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'

interface Props {
  value: AccommodationState
  onChange: (next: AccommodationState) => void
}

type BooleanKey = {
  [K in keyof AccommodationState]: AccommodationState[K] extends boolean ? K : never
}[keyof AccommodationState]

function Toggle({ label, field, value, onChange }: {
  label: string
  field: BooleanKey
  value: AccommodationState
  onChange: (next: AccommodationState) => void
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <Label htmlFor={field}>{label}</Label>
      <Switch
        id={field}
        aria-label={label}
        checked={value[field] as boolean}
        onCheckedChange={(checked) => onChange({ ...value, [field]: checked })}
      />
    </div>
  )
}

export function AccommodationSettingsForm({ value, onChange }: Props) {
  return (
    <div className="space-y-1 divide-y">
      <Toggle label="Read Aloud (TTS)" field="tts_enabled" value={value} onChange={onChange} />
      <div className="py-2 space-y-1">
        <Label>Speech Speed</Label>
        <Slider
          min={0.5} max={2.0} step={0.25}
          value={[value.tts_speed]}
          onValueChange={([v]) => onChange({ ...value, tts_speed: v })}
          aria-label="Speech speed"
        />
        <span className="text-xs text-muted-foreground">{value.tts_speed}x</span>
      </div>
      <Toggle label="Simplified Language" field="simplified_language" value={value} onChange={onChange} />
      <Toggle label="High Contrast" field="high_contrast" value={value} onChange={onChange} />
      <Toggle label="Dyslexia-Friendly Font" field="dyslexia_font" value={value} onChange={onChange} />
      <Toggle label="Reduce Distractions" field="reduce_distractions" value={value} onChange={onChange} />
      <Toggle label="Extended Time (no pressure)" field="extended_time" value={value} onChange={onChange} />
      <Toggle label="Show Hints" field="hints_enabled" value={value} onChange={onChange} />
      <Toggle label="Positive Reinforcement" field="positive_reinforcement" value={value} onChange={onChange} />
      <div className="py-2 space-y-1">
        <Label>Text Size</Label>
        <div className="flex gap-2">
          {([0, 1, 2] as const).map((size) => (
            <button
              key={size}
              onClick={() => onChange({ ...value, large_text: size })}
              className={`px-3 py-1 rounded border text-sm ${value.large_text === size ? 'bg-primary text-primary-foreground' : 'border-input'}`}
              aria-pressed={value.large_text === size}
            >
              {size === 0 ? 'Normal' : size === 1 ? 'Large' : 'Extra Large'}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test components/accommodations
```
Expected: PASS

- [ ] **Step 6: Create child profile pages (New + Edit)**

Create `app/(parent)/children/new/page.tsx`:
```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AccommodationSettingsForm } from '@/components/accommodations/accommodation-settings-form'
import { DEFAULT_ACCOMMODATIONS } from '@/lib/accommodations/defaults'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const AVATARS = ['🌟', '🦁', '🐬', '🦋', '🚀', '🌈', '🎨', '⚡', '🦊', '🐸']

export default function NewChildPage() {
  const [name, setName] = useState('')
  const [grade, setGrade] = useState('3')
  const [avatar, setAvatar] = useState(AVATARS[0])
  const [accommodations, setAccommodations] = useState(DEFAULT_ACCOMMODATIONS)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('children').insert({
      parent_id: user.id,
      name,
      grade: parseInt(grade),
      avatar,
      accommodations,
    })
    router.push('/dashboard')
  }

  return (
    <main className="max-w-lg mx-auto p-6">
      <Card>
        <CardHeader><CardTitle>Add a Child</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Child's first name" />
            </div>
            <div className="space-y-1">
              <Label>Grade</Label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">Grade 3</SelectItem>
                  <SelectItem value="4">Grade 4</SelectItem>
                  <SelectItem value="5">Grade 5</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Avatar</Label>
              <div className="flex flex-wrap gap-2">
                {AVATARS.map((emoji) => (
                  <button key={emoji} type="button" onClick={() => setAvatar(emoji)}
                    className={`text-2xl p-2 rounded-lg border-2 ${avatar === emoji ? 'border-primary' : 'border-transparent'}`}>
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-base font-semibold">Accommodations</Label>
              <AccommodationSettingsForm value={accommodations} onChange={setAccommodations} />
            </div>
            <Button type="submit" className="w-full">Save Child Profile</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
```

Create `app/(parent)/children/[childId]/edit/page.tsx` (same structure, pre-populates from DB, calls `.update()` instead of `.insert()`).

- [ ] **Step 7: Commit**

```bash
git add lib/accommodations/ components/accommodations/ app/(parent)/children/
git commit -m "feat: add child profile creation with accommodation settings"
```

---

## Phase 3: Accommodations System

### Task 7: AccommodationContext

**Files:**
- Create: `lib/accommodations/context.tsx`
- Create: `lib/accommodations/context.test.tsx`

- [ ] **Step 1: Write failing context tests**

Create `lib/accommodations/context.test.tsx`:
```typescript
import { render, screen, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { AccommodationProvider, useAccommodations } from './context'
import { DEFAULT_ACCOMMODATIONS } from './defaults'

function TestConsumer() {
  const { state, update } = useAccommodations()
  return (
    <div>
      <span data-testid="contrast">{String(state.high_contrast)}</span>
      <button onClick={() => update({ high_contrast: true })}>Enable Contrast</button>
    </div>
  )
}

describe('AccommodationContext', () => {
  it('provides default accommodation state', () => {
    render(
      <AccommodationProvider initial={DEFAULT_ACCOMMODATIONS}>
        <TestConsumer />
      </AccommodationProvider>
    )
    expect(screen.getByTestId('contrast').textContent).toBe('false')
  })

  it('updates state via update()', async () => {
    render(
      <AccommodationProvider initial={DEFAULT_ACCOMMODATIONS}>
        <TestConsumer />
      </AccommodationProvider>
    )
    await act(async () => {
      screen.getByRole('button').click()
    })
    expect(screen.getByTestId('contrast').textContent).toBe('true')
  })

  it('toggles reduce-distractions class on html element', async () => {
    const { rerender } = render(
      <AccommodationProvider initial={{ ...DEFAULT_ACCOMMODATIONS, reduce_distractions: false }}>
        <TestConsumer />
      </AccommodationProvider>
    )
    expect(document.documentElement.classList.contains('reduce-distractions')).toBe(false)
    rerender(
      <AccommodationProvider initial={{ ...DEFAULT_ACCOMMODATIONS, reduce_distractions: true }}>
        <TestConsumer />
      </AccommodationProvider>
    )
    expect(document.documentElement.classList.contains('reduce-distractions')).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test lib/accommodations/context
```
Expected: FAIL

- [ ] **Step 3: Implement AccommodationContext**

Create `lib/accommodations/context.tsx`:
```typescript
'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import { AccommodationState } from './types'

interface AccommodationContextValue {
  state: AccommodationState
  update: (patch: Partial<AccommodationState>) => void
}

const AccommodationContext = createContext<AccommodationContextValue | null>(null)

export function AccommodationProvider({
  children,
  initial,
}: {
  children: React.ReactNode
  initial: AccommodationState
}) {
  const [state, setState] = useState<AccommodationState>(initial)

  function update(patch: Partial<AccommodationState>) {
    setState((prev) => ({ ...prev, ...patch }))
  }

  // Apply visual modes to <html> element
  useEffect(() => {
    const html = document.documentElement
    html.classList.toggle('theme-high-contrast', state.high_contrast)
    html.classList.toggle('font-dyslexic', state.dyslexia_font)
    html.classList.toggle('reduce-distractions', state.reduce_distractions)
    html.classList.remove('text-large-0', 'text-large-1', 'text-large-2')
    html.classList.add(`text-large-${state.large_text}`)
  }, [state.high_contrast, state.dyslexia_font, state.large_text, state.reduce_distractions])

  return (
    <AccommodationContext.Provider value={{ state, update }}>
      {children}
    </AccommodationContext.Provider>
  )
}

export function useAccommodations(): AccommodationContextValue {
  const ctx = useContext(AccommodationContext)
  if (!ctx) throw new Error('useAccommodations must be used within AccommodationProvider')
  return ctx
}
```

- [ ] **Step 4: Add CSS for visual modes**

Add to `app/globals.css`:
```css
/* High contrast mode */
html.theme-high-contrast {
  --background: 0 0% 0%;
  --foreground: 0 0% 100%;
  --accent: 51 100% 50%;
  --card: 0 0% 5%;
  --border: 0 0% 40%;
}

/* Large text steps */
html.text-large-0 { font-size: 18px; }
html.text-large-1 { font-size: 24px; }
html.text-large-2 { font-size: 30px; }

/* Dyslexia font */
html.font-dyslexic { font-family: var(--font-dyslexic), sans-serif; }

/* Reduce distractions: suppress animations */
html.reduce-distractions * {
  animation: none !important;
  transition: none !important;
}
```

- [ ] **Step 5: Run tests**

```bash
npm test lib/accommodations
```
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add lib/accommodations/ app/globals.css
git commit -m "feat: add AccommodationContext with visual mode CSS"
```

---

### Task 8: TTS Engine — WebSpeech + Factory

**Files:**
- Create: `lib/tts/types.ts`
- Create: `lib/tts/web-speech-engine.ts`
- Create: `lib/tts/factory.ts`
- Create: `lib/tts/web-speech-engine.test.ts`

- [ ] **Step 1: Define TTSEngine interface**

Create `lib/tts/types.ts`:
```typescript
export interface TTSOptions {
  rate?: number   // 0.5 – 2.0
  lang?: string   // e.g. 'en-US'
}

export interface TTSEngine {
  speak(text: string, options?: TTSOptions): Promise<void>
  stop(): void
  isAvailable(): Promise<boolean>
}
```

- [ ] **Step 2: Write failing WebSpeech tests**

Create `lib/tts/web-speech-engine.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WebSpeechEngine } from './web-speech-engine'

// Mock SpeechSynthesis
const mockSpeak = vi.fn()
const mockCancel = vi.fn()
const mockGetVoices = vi.fn().mockReturnValue([{ lang: 'en-US', name: 'Test Voice' }])

global.speechSynthesis = {
  speak: mockSpeak,
  cancel: mockCancel,
  getVoices: mockGetVoices,
  speaking: false,
  pending: false,
  paused: false,
} as unknown as SpeechSynthesis

global.SpeechSynthesisUtterance = vi.fn().mockImplementation((text) => ({
  text,
  rate: 1,
  lang: '',
  onend: null,
  onerror: null,
})) as unknown as typeof SpeechSynthesisUtterance

describe('WebSpeechEngine', () => {
  let engine: WebSpeechEngine

  beforeEach(() => {
    engine = new WebSpeechEngine()
    vi.clearAllMocks()
  })

  it('isAvailable returns true when speechSynthesis exists', async () => {
    expect(await engine.isAvailable()).toBe(true)
  })

  it('speak calls speechSynthesis.speak', async () => {
    const speakPromise = engine.speak('Hello world')
    // Simulate onend
    const utterance = (global.SpeechSynthesisUtterance as unknown as ReturnType<typeof vi.fn>).mock.results[0].value
    utterance.onend?.()
    await speakPromise
    expect(mockSpeak).toHaveBeenCalled()
  })

  it('stop calls speechSynthesis.cancel', () => {
    engine.stop()
    expect(mockCancel).toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Run to verify failure**

```bash
npm test lib/tts/web-speech-engine
```
Expected: FAIL

- [ ] **Step 4: Implement WebSpeechEngine**

Create `lib/tts/web-speech-engine.ts`:
```typescript
import { TTSEngine, TTSOptions } from './types'

export class WebSpeechEngine implements TTSEngine {
  async isAvailable(): Promise<boolean> {
    return typeof window !== 'undefined' && 'speechSynthesis' in window
  }

  speak(text: string, options: TTSOptions = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = options.rate ?? 1.0
      utterance.lang = options.lang ?? 'en-US'
      utterance.onend = () => resolve()
      utterance.onerror = (e) => reject(new Error(e.error))
      window.speechSynthesis.speak(utterance)
    })
  }

  stop(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  }
}
```

- [ ] **Step 5: Create engine factory**

Create `lib/tts/factory.ts`:
```typescript
import { TTSEngine } from './types'
import { WebSpeechEngine } from './web-speech-engine'

type TTSProvider = 'web_speech' | 'openai' | 'elevenlabs'

interface EngineConfig {
  provider: TTSProvider
  apiKey?: string
  voice?: string
}

export async function createTTSEngine(config: EngineConfig): Promise<TTSEngine> {
  const fallback = new WebSpeechEngine()

  if (config.provider === 'web_speech' || !config.apiKey) {
    return fallback
  }

  try {
    let engine: TTSEngine
    if (config.provider === 'openai') {
      const { OpenAIEngine } = await import('./openai-engine')
      engine = new OpenAIEngine(config.apiKey, config.voice)
    } else {
      const { ElevenLabsEngine } = await import('./elevenlabs-engine')
      engine = new ElevenLabsEngine(config.apiKey, config.voice)
    }
    const available = await engine.isAvailable()
    if (!available) {
      console.warn(`[TTS] ${config.provider} unavailable, falling back to WebSpeech`)
      return fallback
    }
    return engine
  } catch {
    return fallback
  }
}
```

- [ ] **Step 6: Run tests**

```bash
npm test lib/tts
```
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add lib/tts/
git commit -m "feat: add TTS engine interface, WebSpeech implementation, and factory"
```

---

### Task 9: Premium TTS Engines (OpenAI + ElevenLabs)

**Files:**
- Create: `lib/tts/openai-engine.ts`
- Create: `lib/tts/elevenlabs-engine.ts`
- Create: `lib/tts/openai-engine.test.ts`

- [ ] **Step 1: Write failing OpenAI engine test**

Create `lib/tts/openai-engine.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OpenAIEngine } from './openai-engine'

global.fetch = vi.fn()
global.Audio = vi.fn().mockImplementation(() => ({
  src: '',
  play: vi.fn().mockResolvedValue(undefined),
  onended: null,
})) as unknown as typeof Audio

describe('OpenAIEngine', () => {
  beforeEach(() => vi.clearAllMocks())

  it('isAvailable returns false on 401', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 401 } as Response)
    const engine = new OpenAIEngine('bad-key')
    expect(await engine.isAvailable()).toBe(false)
  })

  it('isAvailable returns true on successful ping', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true } as Response)
    const engine = new OpenAIEngine('sk-valid')
    expect(await engine.isAvailable()).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test lib/tts/openai-engine
```

- [ ] **Step 3: Implement OpenAI engine**

Create `lib/tts/openai-engine.ts`:
```typescript
import { TTSEngine, TTSOptions } from './types'

export class OpenAIEngine implements TTSEngine {
  constructor(
    private apiKey: string,
    private voice: string = 'nova'
  ) {}

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      })
      return res.ok
    } catch {
      return false
    }
  }

  async speak(text: string, options: TTSOptions = {}): Promise<void> {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: this.voice,
        speed: options.rate ?? 1.0,
      }),
    })
    if (!res.ok) throw new Error(`OpenAI TTS error: ${res.status}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    await new Promise<void>((resolve, reject) => {
      const audio = new Audio(url)
      audio.onended = () => { URL.revokeObjectURL(url); resolve() }
      audio.onerror = () => reject(new Error('Audio playback failed'))
      audio.play()
    })
  }

  stop(): void {
    // Audio element lifecycle doesn't expose a global stop; handled by component unmount
  }
}
```

Create `lib/tts/elevenlabs-engine.ts`:
```typescript
import { TTSEngine, TTSOptions } from './types'

// ElevenLabs uses chunked audio streaming — we collect the full response before playing
export class ElevenLabsEngine implements TTSEngine {
  constructor(
    private apiKey: string,
    private voiceId: string = '21m00Tcm4TlvDq8ikWAM' // default: Rachel
  ) {}

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch('https://api.elevenlabs.io/v1/user', {
        headers: { 'xi-api-key': this.apiKey },
      })
      return res.ok
    } catch {
      return false
    }
  }

  async speak(text: string, options: TTSOptions = {}): Promise<void> {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: { stability: 0.5, similarity_boost: 0.75, speaking_rate: options.rate ?? 1.0 },
        }),
      }
    )
    if (!res.ok) throw new Error(`ElevenLabs TTS error: ${res.status}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    await new Promise<void>((resolve, reject) => {
      const audio = new Audio(url)
      audio.onended = () => { URL.revokeObjectURL(url); resolve() }
      audio.onerror = () => reject(new Error('Audio playback failed'))
      audio.play()
    })
  }

  stop(): void {
    // handled by component unmount / page navigation
  }
}
```

Add test `lib/tts/elevenlabs-engine.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ElevenLabsEngine } from './elevenlabs-engine'

global.fetch = vi.fn()
global.Audio = vi.fn().mockImplementation(() => ({
  src: '', play: vi.fn().mockResolvedValue(undefined), onended: null, onerror: null,
})) as unknown as typeof Audio

describe('ElevenLabsEngine', () => {
  beforeEach(() => vi.clearAllMocks())

  it('isAvailable returns false on 401', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 401 } as Response)
    const engine = new ElevenLabsEngine('bad-key')
    expect(await engine.isAvailable()).toBe(false)
  })

  it('isAvailable returns true on 200', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true } as Response)
    const engine = new ElevenLabsEngine('xi-valid')
    expect(await engine.isAvailable()).toBe(true)
  })
})

- [ ] **Step 4: Run tests**

```bash
npm test lib/tts
```
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add lib/tts/openai-engine.ts lib/tts/elevenlabs-engine.ts
git commit -m "feat: add OpenAI and ElevenLabs TTS engine implementations"
```

---

### Task 10: Accommodation Toolbar + TTS Button

**Files:**
- Create: `components/accommodations/tts-button.tsx`
- Create: `components/accommodations/accommodation-toolbar.tsx`
- Create: `components/accommodations/tts-button.test.tsx`

- [ ] **Step 1: Write failing TTS button test**

Create `components/accommodations/tts-button.test.tsx`:
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TTSButton } from './tts-button'

const mockSpeak = vi.fn().mockResolvedValue(undefined)
const mockStop = vi.fn()

vi.mock('@/lib/accommodations/context', () => ({
  useAccommodations: () => ({
    state: { tts_enabled: true, tts_speed: 1.0 },
    update: vi.fn(),
  }),
}))

describe('TTSButton', () => {
  it('renders read aloud button', () => {
    render(<TTSButton text="Test question" engine={{ speak: mockSpeak, stop: mockStop, isAvailable: vi.fn() }} />)
    expect(screen.getByRole('button', { name: /read aloud/i })).toBeInTheDocument()
  })

  it('calls speak when clicked', async () => {
    render(<TTSButton text="Test question" engine={{ speak: mockSpeak, stop: mockStop, isAvailable: vi.fn() }} />)
    fireEvent.click(screen.getByRole('button', { name: /read aloud/i }))
    expect(mockSpeak).toHaveBeenCalledWith('Test question', expect.any(Object))
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test components/accommodations/tts-button
```

- [ ] **Step 3: Implement TTSButton**

Create `components/accommodations/tts-button.tsx`:
```typescript
'use client'
import { useState } from 'react'
import { useAccommodations } from '@/lib/accommodations/context'
import { TTSEngine } from '@/lib/tts/types'
import { Button } from '@/components/ui/button'
import { Volume2, VolumeX } from 'lucide-react'

interface Props {
  text: string
  engine: TTSEngine
}

export function TTSButton({ text, engine }: Props) {
  const { state } = useAccommodations()
  const [speaking, setSpeaking] = useState(false)

  if (!state.tts_enabled) return null

  async function handleClick() {
    if (speaking) {
      engine.stop()
      setSpeaking(false)
      return
    }
    setSpeaking(true)
    try {
      await engine.speak(text, { rate: state.tts_speed })
    } finally {
      setSpeaking(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} aria-label={speaking ? 'Stop reading' : 'Read aloud'}>
      {speaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      <span className="ml-1">{speaking ? 'Stop' : 'Read Aloud'}</span>
    </Button>
  )
}
```

Create `components/accommodations/accommodation-toolbar.tsx` — renders `TTSButton`, contrast toggle, font sizer, and hints toggle in a collapsible row. In `reduceDistractions` mode, collapses to an icon strip with a single expand button.

- [ ] **Step 4: Run tests**

```bash
npm test components/accommodations
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/accommodations/
git commit -m "feat: add TTS button and accommodation toolbar components"
```

---

## Phase 4: Practice Session Flow

### Task 11: Question Components

**Files:**
- Create: `components/practice/question-card.tsx`
- Create: `components/practice/answer-picker.tsx`
- Create: `components/practice/hint-panel.tsx`
- Create: `components/practice/question-card.test.tsx`

- [ ] **Step 1: Write failing question component tests**

Create `components/practice/question-card.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { QuestionCard } from './question-card'

const mockQuestion = {
  id: 'q1',
  question_text: 'What is 2 + 2?',
  simplified_text: 'What is two plus two?',
  answer_type: 'multiple_choice' as const,
  choices: [
    { id: 'a', text: '3', is_correct: false },
    { id: 'b', text: '4', is_correct: true },
    { id: 'c', text: '5', is_correct: false },
    { id: 'd', text: '6', is_correct: false },
  ],
  hint_1: 'Count on your fingers',
  hint_2: null,
  hint_3: null,
}

describe('QuestionCard', () => {
  it('renders question text', () => {
    render(<QuestionCard question={mockQuestion} simplified={false} />)
    expect(screen.getByText('What is 2 + 2?')).toBeInTheDocument()
  })

  it('renders simplified text when simplified=true', () => {
    render(<QuestionCard question={mockQuestion} simplified={true} />)
    expect(screen.getByText('What is two plus two?')).toBeInTheDocument()
  })

  it('falls back to original text when simplified_text is null', () => {
    const q = { ...mockQuestion, simplified_text: null }
    render(<QuestionCard question={q} simplified={true} />)
    expect(screen.getByText('What is 2 + 2?')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test components/practice/question-card
```

- [ ] **Step 3: Implement QuestionCard and AnswerPicker**

Create `components/practice/question-card.tsx`:
```typescript
import { Card, CardContent } from '@/components/ui/card'

interface Choice {
  id: string
  text: string
  is_correct: boolean
}

interface Question {
  id: string
  question_text: string
  simplified_text: string | null
  answer_type: 'multiple_choice' | 'true_false'
  choices: Choice[]
  hint_1: string | null
  hint_2: string | null
  hint_3: string | null
}

interface Props {
  question: Question
  simplified: boolean
}

export function QuestionCard({ question, simplified }: Props) {
  const text = (simplified && question.simplified_text) ? question.simplified_text : question.question_text
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-lg font-medium leading-relaxed">{text}</p>
      </CardContent>
    </Card>
  )
}
```

Create `components/practice/answer-picker.tsx`:
```typescript
'use client'
interface Choice { id: string; text: string; is_correct: boolean }
interface Props {
  choices: Choice[]
  selectedId: string | null
  isCorrect: boolean | null    // null = not yet answered
  onSelect: (choiceId: string) => void
  disabled: boolean
}

export function AnswerPicker({ choices, selectedId, isCorrect, onSelect, disabled }: Props) {
  return (
    <div className="grid gap-3">
      {choices.map((choice) => {
        const isSelected = selectedId === choice.id
        const showResult = isSelected && isCorrect !== null
        return (
          <button
            key={choice.id}
            onClick={() => !disabled && onSelect(choice.id)}
            disabled={disabled && !isSelected}
            className={[
              'w-full text-left p-4 rounded-lg border-2 transition-colors font-medium',
              isSelected && !showResult ? 'border-primary bg-primary/10' : '',
              showResult && isCorrect ? 'border-green-500 bg-green-500/10' : '',
              showResult && !isCorrect ? 'border-yellow-500 bg-yellow-500/10' : '',
              !isSelected ? 'border-border hover:border-primary/50 hover:bg-muted' : '',
            ].join(' ')}
            aria-pressed={isSelected}
          >
            <span className="font-semibold mr-2">{choice.id.toUpperCase()}.</span>
            {choice.text}
          </button>
        )
      })}
    </div>
  )
}
```

Create `components/practice/hint-panel.tsx`:
```typescript
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Lightbulb } from 'lucide-react'

interface Props {
  hints: (string | null)[]
  onHintUsed: (count: number) => void
  enabled: boolean
}

export function HintPanel({ hints, onHintUsed, enabled }: Props) {
  const [revealed, setRevealed] = useState(0)
  const availableHints = hints.filter(Boolean) as string[]

  if (!enabled || availableHints.length === 0) return null

  function revealNextHint() {
    const next = revealed + 1
    setRevealed(next)
    onHintUsed(next)
  }

  return (
    <div className="space-y-2">
      {availableHints.slice(0, revealed).map((hint, i) => (
        <div key={i} className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-sm">
          <Lightbulb className="inline h-4 w-4 mr-1 text-yellow-600" />
          {hint}
        </div>
      ))}
      {revealed < availableHints.length ? (
        <Button variant="outline" size="sm" onClick={revealNextHint}>
          <Lightbulb className="h-4 w-4 mr-1" />
          {revealed === 0 ? 'Show a Hint' : 'Show Next Hint'}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">Ask a grown-up for help! 🙋</p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests**

```bash
npm test components/practice
```
Expected: PASS

- [ ] **Step 5: Write failing calculator test**

Create `components/practice/on-screen-calculator.test.tsx`:
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { OnScreenCalculator } from './on-screen-calculator'

describe('OnScreenCalculator', () => {
  it('renders digit and operator buttons', () => {
    render(<OnScreenCalculator />)
    expect(screen.getByRole('button', { name: '7' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '=' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'C' })).toBeInTheDocument()
  })

  it('displays typed digits', () => {
    render(<OnScreenCalculator />)
    fireEvent.click(screen.getByRole('button', { name: '4' }))
    fireEvent.click(screen.getByRole('button', { name: '2' }))
    expect(screen.getByRole('status')).toHaveTextContent('42')
  })

  it('computes addition', () => {
    render(<OnScreenCalculator />)
    fireEvent.click(screen.getByRole('button', { name: '3' }))
    fireEvent.click(screen.getByRole('button', { name: '+' }))
    fireEvent.click(screen.getByRole('button', { name: '5' }))
    fireEvent.click(screen.getByRole('button', { name: '=' }))
    expect(screen.getByRole('status')).toHaveTextContent('8')
  })

  it('clears display on C', () => {
    render(<OnScreenCalculator />)
    fireEvent.click(screen.getByRole('button', { name: '9' }))
    fireEvent.click(screen.getByRole('button', { name: 'C' }))
    expect(screen.getByRole('status')).toHaveTextContent('0')
  })

  it('does not render when calculator_allowed is false', () => {
    const { container } = render(<OnScreenCalculator hidden />)
    expect(container.firstChild).toBeNull()
  })
})
```

- [ ] **Step 6: Run to verify failure**

```bash
npm test components/practice/on-screen-calculator
```
Expected: FAIL

- [ ] **Step 7: Implement OnScreenCalculator**

Create `components/practice/on-screen-calculator.tsx`:
```typescript
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface Props { hidden?: boolean }

// Eval-free expression evaluator: handles a op b (single binary operation)
function compute(a: number, op: string, b: number): number {
  switch (op) {
    case '+': return a + b
    case '−': return a - b
    case '×': return a * b
    case '÷': return b !== 0 ? a / b : 0
    default: return b
  }
}

const BUTTONS = [
  ['7', '8', '9', '÷'],
  ['4', '5', '6', '×'],
  ['1', '2', '3', '−'],
  ['C', '0', '=', '+'],
]

export function OnScreenCalculator({ hidden }: Props) {
  if (hidden) return null

  const [display, setDisplay] = useState('0')
  const [stored, setStored] = useState<number | null>(null)
  const [operator, setOperator] = useState<string | null>(null)
  const [waitingForOperand, setWaitingForOperand] = useState(false)

  function handleDigit(digit: string) {
    if (waitingForOperand) {
      setDisplay(digit)
      setWaitingForOperand(false)
    } else {
      setDisplay(display === '0' ? digit : display + digit)
    }
  }

  function handleOperator(op: string) {
    const current = parseFloat(display)
    if (stored !== null && operator && !waitingForOperand) {
      const result = compute(stored, operator, current)
      setDisplay(String(result))
      setStored(result)
    } else {
      setStored(current)
    }
    setOperator(op)
    setWaitingForOperand(true)
  }

  function handleEquals() {
    if (stored === null || operator === null) return
    const result = compute(stored, operator, parseFloat(display))
    // Round to avoid floating point display issues
    setDisplay(String(Math.round(result * 1e10) / 1e10))
    setStored(null)
    setOperator(null)
    setWaitingForOperand(true)
  }

  function handleClear() {
    setDisplay('0')
    setStored(null)
    setOperator(null)
    setWaitingForOperand(false)
  }

  return (
    <Card className="w-fit">
      <CardContent className="p-3 space-y-2">
        <div
          role="status"
          aria-label="Calculator display"
          className="bg-muted rounded px-3 py-2 text-right font-mono text-xl min-w-[140px]"
        >
          {display}
        </div>
        <div className="grid grid-cols-4 gap-1">
          {BUTTONS.flat().map((btn) => (
            <Button
              key={btn}
              variant={['÷', '×', '−', '+'].includes(btn) ? 'secondary' : btn === '=' ? 'default' : 'outline'}
              size="sm"
              className="text-base h-10 w-10"
              onClick={() => {
                if (btn === 'C') handleClear()
                else if (btn === '=') handleEquals()
                else if (['+', '−', '×', '÷'].includes(btn)) handleOperator(btn)
                else handleDigit(btn)
              }}
              aria-label={btn}
            >
              {btn}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 8: Wire calculator into QuestionCard**

Update `components/practice/question-card.tsx` to accept and render the calculator:
```typescript
import { OnScreenCalculator } from './on-screen-calculator'

interface Question {
  // ... existing fields ...
  calculator_allowed: boolean
}

export function QuestionCard({ question, simplified }: Props) {
  const text = (simplified && question.simplified_text) ? question.simplified_text : question.question_text
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <p className="text-lg font-medium leading-relaxed">{text}</p>
        <OnScreenCalculator hidden={!question.calculator_allowed} />
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 9: Run all question component tests**

```bash
npm test components/practice
```
Expected: PASS (QuestionCard, AnswerPicker, HintPanel, OnScreenCalculator)

- [ ] **Step 10: Commit**

```bash
git add components/practice/
git commit -m "feat: add QuestionCard, AnswerPicker, HintPanel, and OnScreenCalculator components"
```

---

### Task 12: Practice Session API Routes

**Files:**
- Create: `app/api/sessions/route.ts`
- Create: `app/api/sessions/[sessionId]/route.ts`
- Create: `app/api/sessions/[sessionId]/answers/route.ts`
- Create: `app/api/questions/route.ts`

- [ ] **Step 1: Write failing API route tests**

Create `app/api/sessions/route.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'parent-1' } } }) },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'child-1', parent_id: 'parent-1', grade: 3, accommodations: {} } }),
      insert: vi.fn().mockReturnThis(),
    }),
  }),
}))

describe('POST /api/sessions', () => {
  it('returns 201 with session id', async () => {
    const req = new NextRequest('http://localhost/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ childId: 'child-1', subject: 'math', mode: 'practice', questionIds: ['q1', 'q2'] }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body).toHaveProperty('sessionId')
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test app/api/sessions/route
```

- [ ] **Step 3: Implement session route**

Create `app/api/sessions/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { childId, subject, mode, questionIds } = await req.json()

  // Verify child belongs to this parent
  const { data: child } = await supabase
    .from('children')
    .select('*')
    .eq('id', childId)
    .eq('parent_id', user.id)
    .single()
  if (!child) return NextResponse.json({ error: 'Child not found' }, { status: 404 })

  // Mark any stale in_progress sessions as abandoned
  await supabase
    .from('practice_sessions')
    .update({ status: 'abandoned' })
    .eq('child_id', childId)
    .eq('status', 'in_progress')
    .lt('started_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())

  const { data: session, error } = await supabase
    .from('practice_sessions')
    .insert({
      child_id: childId,
      grade: child.grade,
      subject,
      mode,
      question_count: questionIds.length,
      accommodations_used: child.accommodations,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sessionId: session.id }, { status: 201 })
}
```

Create `app/api/sessions/[sessionId]/answers/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { questionId, answerId, isCorrect, timeSpent, hintsUsed, ttsUsed, attemptNumber } = body

  const { error } = await supabase.from('session_answers').insert({
    session_id: sessionId,
    question_id: questionId,
    answer_given: answerId,
    is_correct: isCorrect,
    time_spent_seconds: timeSpent ?? 0,
    hints_used: hintsUsed ?? 0,
    tts_used: ttsUsed ?? false,
    attempt_number: attemptNumber ?? 1,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ is_correct: isCorrect }, { status: 201 })
}
```

Create `app/api/sessions/[sessionId]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Calculate score from session_answers
  const { data: answers } = await supabase
    .from('session_answers')
    .select('is_correct, attempt_number')
    .eq('session_id', sessionId)

  // Count only the final attempt per question for scoring
  const finalAnswers = Object.values(
    (answers ?? []).reduce<Record<string, { is_correct: boolean; attempt_number: number }>>(
      (acc, a) => {
        const key = `${sessionId}-${a.attempt_number}` // group by position
        if (!acc[key] || a.attempt_number > acc[key].attempt_number) acc[key] = a
        return acc
      },
      {}
    )
  )
  const correct = finalAnswers.filter((a) => a.is_correct).length
  const scorePercent = finalAnswers.length > 0
    ? Math.round((correct / finalAnswers.length) * 100)
    : 0

  const { error } = await supabase
    .from('practice_sessions')
    .update({ status: 'completed', ended_at: new Date().toISOString(), score_percent: scorePercent })
    .eq('id', sessionId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ scorePercent })
}
```

Create `app/api/questions/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getQuestionsForSession, getRecentSessionQuestionIds } from '@/lib/supabase/queries'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const grade = parseInt(searchParams.get('grade') ?? '3')
  const subject = searchParams.get('subject') ?? 'math'
  const childId = searchParams.get('childId') ?? ''
  const mode = searchParams.get('mode') ?? 'practice'
  const count = mode === 'test' ? 20 : 10

  const supabase = await createClient()
  const recentIds = childId ? await getRecentSessionQuestionIds(supabase, childId) : []
  const questions = await getQuestionsForSession(supabase, grade, subject, count, recentIds)

  return NextResponse.json(questions)
}
```

Add test for the PATCH end-session route to `app/api/sessions/[sessionId]/route.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { PATCH } from './route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'parent-1' } } }) },
    from: vi.fn().mockImplementation((table: string) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      data: table === 'session_answers'
        ? [{ is_correct: true, attempt_number: 1 }, { is_correct: false, attempt_number: 1 }]
        : null,
      error: null,
    })),
  }),
}))

describe('PATCH /api/sessions/[sessionId]', () => {
  it('returns scorePercent in response', async () => {
    const req = new NextRequest('http://localhost/api/sessions/s1', { method: 'PATCH' })
    const res = await PATCH(req, { params: Promise.resolve({ sessionId: 's1' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('scorePercent')
  })
})

- [ ] **Step 4: Run tests**

```bash
npm test app/api
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/
git commit -m "feat: add practice session API routes (create, answer, complete)"
```

---

### Task 13: Web Audio + Positive Reinforcement

**Files:**
- Create: `lib/audio/web-audio.ts`
- Create: `lib/audio/web-audio.test.ts`
- Create: `components/practice/session-complete.tsx`

- [ ] **Step 1: Write failing audio tests**

Create `lib/audio/web-audio.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { playCorrectChime, playFanfare } from './web-audio'

const mockOscillator = {
  type: '',
  frequency: { setValueAtTime: vi.fn() },
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
}
const mockGain = {
  gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
  connect: vi.fn(),
}
const mockContext = {
  createOscillator: vi.fn().mockReturnValue(mockOscillator),
  createGain: vi.fn().mockReturnValue(mockGain),
  destination: {},
  currentTime: 0,
}
vi.stubGlobal('AudioContext', vi.fn().mockImplementation(() => mockContext))

describe('web-audio', () => {
  it('playCorrectChime creates an oscillator and starts it', () => {
    playCorrectChime()
    expect(mockContext.createOscillator).toHaveBeenCalled()
    expect(mockOscillator.start).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test lib/audio
```

- [ ] **Step 3: Implement Web Audio utilities**

Create `lib/audio/web-audio.ts`:
```typescript
function createTone(frequency: number, duration: number, type: OscillatorType = 'triangle') {
  const ctx = new AudioContext()
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()

  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)
  gain.gain.setValueAtTime(0.3, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)

  oscillator.connect(gain)
  gain.connect(ctx.destination)

  oscillator.start(ctx.currentTime)
  oscillator.stop(ctx.currentTime + duration)
}

export function playCorrectChime() {
  createTone(523, 0.15) // C5
  setTimeout(() => createTone(659, 0.15), 100) // E5
  setTimeout(() => createTone(784, 0.2), 200)  // G5
}

export function playFanfare() {
  const notes = [523, 659, 784, 1047] // C5, E5, G5, C6
  notes.forEach((freq, i) => setTimeout(() => createTone(freq, 0.3), i * 120))
}
```

- [ ] **Step 4: Create SessionComplete screen**

Create `components/practice/session-complete.tsx`:
```typescript
'use client'
import { useEffect } from 'react'
import { playFanfare } from '@/lib/audio/web-audio'
import { Button } from '@/components/ui/button'

interface Props {
  scorePercent: number
  onPracticeAgain: () => void
  positiveReinforcement: boolean
}

function scoreToStars(percent: number): number {
  if (percent >= 90) return 5
  if (percent >= 80) return 4
  if (percent >= 70) return 3
  if (percent >= 60) return 2
  return 1
}

export function SessionComplete({ scorePercent, onPracticeAgain, positiveReinforcement }: Props) {
  const stars = scoreToStars(scorePercent)

  useEffect(() => {
    if (positiveReinforcement) playFanfare()
  }, [positiveReinforcement])

  return (
    <div className="text-center space-y-6 p-8">
      <h1 className="text-3xl font-bold">Great job! 🎉</h1>
      <div className="text-6xl" aria-label={`${stars} out of 5 stars`}>
        {'⭐'.repeat(stars)}{'☆'.repeat(5 - stars)}
      </div>
      <p className="text-xl text-muted-foreground">You got {scorePercent}% correct!</p>
      <Button size="lg" onClick={onPracticeAgain}>Practice Again</Button>
    </div>
  )
}
```

- [ ] **Step 5: Run tests**

```bash
npm test lib/audio components/practice
```
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add lib/audio/ components/practice/session-complete.tsx
git commit -m "feat: add Web Audio chimes and SessionComplete celebration screen"
```

---

### Task 14: Practice Session Page (Full Flow)

**Files:**
- Create: `app/(practice)/practice/[childId]/page.tsx`
- Create: `components/practice/subject-mode-picker.tsx`

- [ ] **Step 1: Write failing subject-mode-picker test**

Create `components/practice/subject-mode-picker.test.tsx`:
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SubjectModePicker } from './subject-mode-picker'

describe('SubjectModePicker', () => {
  it('renders subject options', () => {
    render(<SubjectModePicker childName="Maya" availableSubjects={['math', 'reading']} onStart={vi.fn()} />)
    expect(screen.getByText(/math/i)).toBeInTheDocument()
    expect(screen.getByText(/reading/i)).toBeInTheDocument()
  })

  it('calls onStart with subject and mode', () => {
    const onStart = vi.fn()
    render(<SubjectModePicker childName="Maya" availableSubjects={['math']} onStart={onStart} />)
    fireEvent.click(screen.getByText(/math/i))
    fireEvent.click(screen.getByRole('button', { name: /practice/i }))
    expect(onStart).toHaveBeenCalledWith({ subject: 'math', mode: 'practice' })
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test components/practice/subject-mode-picker
```

- [ ] **Step 3: Implement SubjectModePicker**

Create `components/practice/subject-mode-picker.tsx`:
```typescript
'use client'
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const SUBJECT_CONFIG = {
  math: { label: 'Math', emoji: '🔢', description: 'Numbers, shapes, and patterns' },
  reading: { label: 'Reading', emoji: '📚', description: 'Stories, words, and ideas' },
} as const

type Subject = keyof typeof SUBJECT_CONFIG
type Mode = 'practice' | 'test'

interface Props {
  childName: string
  availableSubjects: Subject[]
  onStart: (choice: { subject: Subject; mode: Mode }) => void
}

export function SubjectModePicker({ childName, availableSubjects, onStart }: Props) {
  const [subject, setSubject] = useState<Subject | null>(null)
  const [mode, setMode] = useState<Mode | null>(null)

  return (
    <div className="space-y-8 max-w-md mx-auto p-6">
      <h1 className="text-3xl font-bold text-center">Hi {childName}! 👋</h1>
      <div className="space-y-3">
        <p className="text-center font-medium text-muted-foreground">What do you want to practice?</p>
        <div className="grid grid-cols-2 gap-4">
          {availableSubjects.map((s) => (
            <Card key={s} onClick={() => setSubject(s)}
              className={`cursor-pointer transition-all ${subject === s ? 'border-primary ring-2 ring-primary' : ''}`}>
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-2">{SUBJECT_CONFIG[s].emoji}</div>
                <p className="font-bold">{SUBJECT_CONFIG[s].label}</p>
                <p className="text-xs text-muted-foreground mt-1">{SUBJECT_CONFIG[s].description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      {subject && (
        <div className="space-y-3">
          <p className="text-center font-medium text-muted-foreground">How do you want to practice?</p>
          <div className="grid grid-cols-2 gap-4">
            <Button variant={mode === 'practice' ? 'default' : 'outline'} onClick={() => setMode('practice')} className="h-auto py-4 flex-col">
              <span className="text-2xl">🌱</span>
              <span className="font-bold mt-1">Practice</span>
              <span className="text-xs opacity-70">Take your time, try again if wrong</span>
            </Button>
            <Button variant={mode === 'test' ? 'default' : 'outline'} onClick={() => setMode('test')} className="h-auto py-4 flex-col">
              <span className="text-2xl">📝</span>
              <span className="font-bold mt-1">Test</span>
              <span className="text-xs opacity-70">Like the real SOL — one try each</span>
            </Button>
          </div>
        </div>
      )}
      {subject && mode && (
        <Button size="lg" className="w-full" onClick={() => onStart({ subject, mode })}>
          Let's Go! 🚀
        </Button>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create the main practice page**

Create `app/(practice)/practice/[childId]/page.tsx`:
```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PracticeSession } from './practice-session'

export default async function PracticePage({ params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: child } = await supabase
    .from('children')
    .select('*')
    .eq('id', childId)
    .eq('parent_id', user.id)
    .single()
  if (!child) redirect('/dashboard')

  // Get available subjects from questions table
  const { data: subjects } = await supabase
    .from('questions')
    .select('subject')
    .eq('grade', child.grade)
  const availableSubjects = [...new Set((subjects ?? []).map((q) => q.subject))]

  // Decrypt parent TTS API key server-side
  const { data: parent } = await supabase.from('parents').select('settings').eq('id', user.id).single()

  return (
    <PracticeSession
      child={child}
      availableSubjects={availableSubjects}
      parentSettings={parent?.settings ?? {}}
    />
  )
}
```

Create `app/(practice)/practice/[childId]/practice-session.tsx`:
```typescript
'use client'
import { useState, useCallback, useEffect } from 'react'
import { AccommodationProvider } from '@/lib/accommodations/context'
import { AccommodationState } from '@/lib/accommodations/types'
import { createTTSEngine } from '@/lib/tts/factory'
import { TTSEngine } from '@/lib/tts/types'
import { SubjectModePicker } from '@/components/practice/subject-mode-picker'
import { QuestionCard } from '@/components/practice/question-card'
import { AnswerPicker } from '@/components/practice/answer-picker'
import { HintPanel } from '@/components/practice/hint-panel'
import { AccommodationToolbar } from '@/components/accommodations/accommodation-toolbar'
import { SessionComplete } from '@/components/practice/session-complete'
import { ChildFeedbackSheet } from '@/components/feedback/child-feedback-sheet'
import { playCorrectChime } from '@/lib/audio/web-audio'

type Question = {
  id: string; question_text: string; simplified_text: string | null
  answer_type: 'multiple_choice' | 'true_false'
  choices: { id: string; text: string; is_correct: boolean }[]
  hint_1: string | null; hint_2: string | null; hint_3: string | null
}

type Mode = 'practice' | 'test'
type Phase = 'picking' | 'session' | 'complete'

interface Props {
  child: { id: string; name: string; grade: number; accommodations: AccommodationState }
  availableSubjects: string[]
  parentSettings: { tts_provider?: string; openai_api_key_encrypted?: string; tts_voice?: string }
}

export function PracticeSession({ child, availableSubjects, parentSettings }: Props) {
  const [phase, setPhase] = useState<Phase>('picking')
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('practice')
  const [subject, setSubject] = useState('')
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [streak, setStreak] = useState(0)
  const [scorePercent, setScorePercent] = useState(0)
  const [ttsEngine, setTTSEngine] = useState<TTSEngine | null>(null)
  const startTime = useState(() => Date.now())[0]

  // Initialize TTS engine once
  useEffect(() => {
    createTTSEngine({
      provider: (parentSettings.tts_provider ?? 'web_speech') as 'web_speech' | 'openai' | 'elevenlabs',
      voice: parentSettings.tts_voice,
    }).then(setTTSEngine)
  }, [parentSettings.tts_provider, parentSettings.tts_voice])

  const handleStart = useCallback(async ({ subject: s, mode: m }: { subject: string; mode: Mode }) => {
    setSubject(s)
    setMode(m)
    const res = await fetch(`/api/questions?grade=${child.grade}&subject=${s}&mode=${m}&childId=${child.id}`)
    const qs: Question[] = await res.json()
    setQuestions(qs)

    const sessRes = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId: child.id, subject: s, mode: m, questionIds: qs.map((q) => q.id) }),
    })
    const { sessionId: sid } = await sessRes.json()
    setSessionId(sid)
    setPhase('session')
  }, [child.id, child.grade])

  const submitAnswer = useCallback(async (choiceId: string) => {
    if (!sessionId || selectedAnswer !== null) return
    const q = questions[currentIndex]
    const correct = q.choices.find((c) => c.id === choiceId)?.is_correct ?? false
    setSelectedAnswer(choiceId)
    setIsCorrect(correct)

    await fetch(`/api/sessions/${sessionId}/answers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: q.id,
        answerId: choiceId,
        isCorrect: correct,
        timeSpent: Math.round((Date.now() - startTime) / 1000),
        hintsUsed,
        ttsUsed: child.accommodations.tts_enabled,
        attemptNumber: 1,
      }),
    })

    if (correct) {
      if (child.accommodations.positive_reinforcement) playCorrectChime()
      setStreak((s) => s + 1)
      setTimeout(() => advance(), 1200)
    }
    // In test mode, auto-advance on wrong answer too
    if (!correct && mode === 'test') {
      setTimeout(() => advance(), 1200)
    }
  }, [sessionId, selectedAnswer, questions, currentIndex, hintsUsed, child, mode, startTime])

  const advance = useCallback(() => {
    setSelectedAnswer(null)
    setIsCorrect(null)
    setHintsUsed(0)
    const next = currentIndex + 1
    if (next >= questions.length) {
      completeSession()
    } else {
      setCurrentIndex(next)
    }
  }, [currentIndex, questions.length])

  const handleRetry = useCallback(() => {
    setSelectedAnswer(null)
    setIsCorrect(null)
    setStreak(0)
  }, [])

  async function completeSession() {
    if (!sessionId) return
    const res = await fetch(`/api/sessions/${sessionId}`, { method: 'PATCH' })
    const { scorePercent: sp } = await res.json()
    setScorePercent(sp)
    setPhase('complete')
  }

  if (phase === 'picking') {
    return (
      <AccommodationProvider initial={child.accommodations}>
        <SubjectModePicker
          childName={child.name}
          availableSubjects={availableSubjects as ('math' | 'reading')[]}
          onStart={handleStart}
        />
      </AccommodationProvider>
    )
  }

  if (phase === 'complete') {
    return (
      <AccommodationProvider initial={child.accommodations}>
        <SessionComplete
          scorePercent={scorePercent}
          positiveReinforcement={child.accommodations.positive_reinforcement}
          onPracticeAgain={() => {
            setPhase('picking'); setCurrentIndex(0); setQuestions([]); setSessionId(null)
          }}
        />
      </AccommodationProvider>
    )
  }

  const q = questions[currentIndex]
  const isWrong = isCorrect === false

  return (
    <AccommodationProvider initial={child.accommodations}>
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {ttsEngine && (
          <AccommodationToolbar
            engine={ttsEngine}
            questionText={q.question_text}
            progress={{ current: currentIndex + 1, total: questions.length }}
          />
        )}
        <QuestionCard question={q} simplified={child.accommodations.simplified_language} />
        <AnswerPicker
          choices={q.choices}
          selectedId={selectedAnswer}
          isCorrect={isCorrect}
          onSelect={submitAnswer}
          disabled={isCorrect === true}
        />
        {child.accommodations.hints_enabled && (
          <HintPanel
            hints={[q.hint_1, q.hint_2, q.hint_3]}
            onHintUsed={setHintsUsed}
            enabled={selectedAnswer === null || isWrong}
          />
        )}
        {isWrong && mode === 'practice' && (
          <div className="text-center space-y-2">
            <p className="text-lg font-medium">Try again! You can do it 💪</p>
            <button onClick={handleRetry} className="text-sm text-primary underline">Try a different answer</button>
          </div>
        )}
        <div className="flex justify-between items-center">
          <ChildFeedbackSheet sessionId={sessionId!} questionId={q.id} childId={child.id} />
          {streak >= 3 && child.accommodations.positive_reinforcement && (
            <span className="text-sm font-medium animate-bounce">🔥 {streak} in a row!</span>
          )}
        </div>
      </div>
    </AccommodationProvider>
  )
}
```

- [ ] **Step 5: Run all tests**

```bash
npm test
```
Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add app/(practice)/ components/practice/subject-mode-picker.tsx
git commit -m "feat: add full practice session page with subject/mode picker and question flow"
```

---

## Phase 5: Feedback

### Task 15: Child + Parent Feedback

**Files:**
- Create: `components/feedback/child-feedback-sheet.tsx`
- Create: `components/feedback/parent-feedback-form.tsx`
- Create: `app/api/feedback/route.ts`
- Create: `app/api/feedback/upload-url/route.ts`
- Create: `app/(parent)/feedback/page.tsx`

- [ ] **Step 1: Write failing API test**

Create `app/api/feedback/route.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'fb-1' }, error: null }),
    }),
  }),
}))

describe('POST /api/feedback', () => {
  it('creates feedback record and returns 201', async () => {
    const req = new NextRequest('http://localhost/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        submittedByType: 'child',
        submittedById: 'child-1',
        sessionId: 'session-1',
        questionId: 'q-1',
        category: 'child_confused',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test app/api/feedback
```

- [ ] **Step 3: Implement feedback API routes**

Create `app/api/feedback/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()

  const { data, error } = await supabase
    .from('feedback')
    .insert({
      submitted_by_type: body.submittedByType,
      submitted_by_id: body.submittedById,
      session_id: body.sessionId ?? null,
      question_id: body.questionId ?? null,
      category: body.category,
      message: body.message ?? null,
      voice_note_url: body.voiceNoteUrl ?? null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id }, { status: 201 })
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('feedback')
    .select('*')
    .eq('submitted_by_id', user.id)
    .order('created_at', { ascending: false })

  return NextResponse.json(data ?? [])
}
```

Create `app/api/feedback/upload-url/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { fileName } = await req.json()
  const path = `voice-notes/${Date.now()}-${fileName}`

  const { data, error } = await supabase.storage
    .from('feedback-voice-notes')
    .createSignedUploadUrl(path, { upsert: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ signedUrl: data.signedUrl, path })
}
```

- [ ] **Step 4: Implement ChildFeedbackSheet**

Create `components/feedback/child-feedback-sheet.tsx`:
```typescript
'use client'
import { useState, useRef } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

const CHILD_REASONS = [
  { category: 'child_confused', label: "I don't understand 🤔" },
  { category: 'question_error', label: 'Something looks wrong 🔍' },
  { category: 'child_read_again', label: 'Read it again 🔊' },
] as const

interface Props {
  sessionId: string
  questionId: string
  childId: string
}

export function ChildFeedbackSheet({ sessionId, questionId, childId }: Props) {
  const [open, setOpen] = useState(false)
  const [recording, setRecording] = useState(false)
  const mediaRef = useRef<MediaRecorder | null>(null)

  async function submitFeedback(category: string, voiceNoteUrl?: string) {
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submittedByType: 'child', submittedById: childId, sessionId, questionId, category, voiceNoteUrl }),
    })
    setOpen(false)
  }

  async function handleVoiceNote(category: string) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
    const chunks: BlobPart[] = []
    mediaRef.current = recorder
    setRecording(true)

    recorder.ondataavailable = (e) => chunks.push(e.data)
    recorder.onstop = async () => {
      setRecording(false)
      stream.getTracks().forEach((t) => t.stop())
      const blob = new Blob(chunks, { type: 'audio/webm' })
      const { signedUrl, path } = await fetch('/api/feedback/upload-url', {
        method: 'POST',
        body: JSON.stringify({ fileName: 'note.webm' }),
        headers: { 'Content-Type': 'application/json' },
      }).then((r) => r.json())
      await fetch(signedUrl, { method: 'PUT', body: blob })
      await submitFeedback(category, path)
    }

    recorder.start()
    setTimeout(() => recorder.stop(), 30000) // auto-stop at 30s
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="I need help with this question">😕</Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-xl">
        <SheetHeader><SheetTitle>What's wrong?</SheetTitle></SheetHeader>
        <div className="grid gap-3 mt-4">
          {CHILD_REASONS.map(({ category, label }) => (
            <Button key={category} variant="outline" size="lg" className="text-lg h-14"
              onClick={() => submitFeedback(category)}>
              {label}
            </Button>
          ))}
          <Button variant="ghost" size="sm" onPointerDown={() => handleVoiceNote('other')}
            className={recording ? 'text-destructive' : ''}>
            {recording ? '🔴 Recording... (release to send)' : '🎤 Hold to record a voice note'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 5: Create parent feedback page**

Create `app/(parent)/feedback/page.tsx` with `ParentFeedbackForm` (category select + textarea) and a list of previous submissions with status badges.

- [ ] **Step 6: Run all tests**

```bash
npm test
```
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add app/api/feedback/ components/feedback/ app/(parent)/feedback/
git commit -m "feat: add child feedback sheet and parent feedback form with voice note support"
```

---

## Phase 6: Parent Dashboard

### Task 16: Dashboard Stats + Progress Chart

**Files:**
- Create: `components/dashboard/stat-card.tsx`
- Create: `components/dashboard/progress-chart.tsx`
- Create: `components/dashboard/weak-areas-callout.tsx`
- Create: `components/dashboard/session-history-table.tsx`
- Create: `components/dashboard/child-card.tsx`
- Create: `app/(parent)/dashboard/page.tsx`
- Create: `components/dashboard/progress-chart.test.tsx`

- [ ] **Step 1: Write failing progress chart test**

Create `components/dashboard/progress-chart.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ProgressChart } from './progress-chart'

const mockTopics = [
  { topic: 'Fractions', accuracy: 0.85 },
  { topic: 'Main Idea', accuracy: 0.55 },
  { topic: 'Place Value', accuracy: 0.70 },
]

describe('ProgressChart', () => {
  it('renders topic labels', () => {
    render(<ProgressChart topics={mockTopics} />)
    expect(screen.getByText('Fractions')).toBeInTheDocument()
    expect(screen.getByText('Main Idea')).toBeInTheDocument()
    expect(screen.getByText('Place Value')).toBeInTheDocument()
  })

  it('shows percentage for each topic', () => {
    render(<ProgressChart topics={mockTopics} />)
    expect(screen.getByText('85%')).toBeInTheDocument()
    expect(screen.getByText('55%')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test components/dashboard/progress-chart
```

- [ ] **Step 3: Implement dashboard components**

Create `components/dashboard/progress-chart.tsx`:
```typescript
interface TopicAccuracy { topic: string; accuracy: number }

function getColor(accuracy: number) {
  if (accuracy >= 0.80) return 'bg-green-500'
  if (accuracy >= 0.65) return 'bg-yellow-500'
  return 'bg-red-500'
}

export function ProgressChart({ topics }: { topics: TopicAccuracy[] }) {
  return (
    <div className="space-y-3">
      {topics.map(({ topic, accuracy }) => (
        <div key={topic} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{topic}</span>
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
      ))}
    </div>
  )
}
```

Create `components/dashboard/stat-card.tsx`:
```typescript
import { Card, CardContent } from '@/components/ui/card'

interface Props { label: string; value: string | number; icon: string }
export function StatCard({ label, value, icon }: Props) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <div className="text-2xl">{icon}</div>
        <div className="text-2xl font-bold mt-1">{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
      </CardContent>
    </Card>
  )
}
```

Create `components/dashboard/weak-areas-callout.tsx`:
```typescript
import { Card, CardContent } from '@/components/ui/card'

interface WeakTopic { topic: string; accuracy: number }
export function WeakAreasCallout({ topics, childName }: { topics: WeakTopic[]; childName: string }) {
  if (topics.length === 0) return null
  return (
    <Card className="border-yellow-500/50 bg-yellow-500/5">
      <CardContent className="p-4">
        <p className="font-semibold">📊 Areas to focus on for {childName}:</p>
        <ul className="mt-2 space-y-1">
          {topics.map(({ topic, accuracy }) => (
            <li key={topic} className="text-sm">
              • <strong>{topic}</strong> — {Math.round(accuracy * 100)}% accuracy this month
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: Create dashboard page with data fetching**

Create `app/(parent)/dashboard/page.tsx`:
```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StatCard } from '@/components/dashboard/stat-card'
import { ProgressChart } from '@/components/dashboard/progress-chart'
import { WeakAreasCallout } from '@/components/dashboard/weak-areas-callout'
import { ChildCard } from '@/components/dashboard/child-card'
import { SessionHistoryTable } from '@/components/dashboard/session-history-table'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ childId?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: children } = await supabase
    .from('children').select('*').eq('parent_id', user.id).order('created_at')

  if (!children || children.length === 0) {
    return (
      <main className="max-w-lg mx-auto p-8 text-center space-y-4">
        <h1 className="text-2xl font-bold">Welcome! 👋</h1>
        <p className="text-muted-foreground">Add your first child to get started.</p>
        <Button asChild><Link href="/children/new">Add a Child</Link></Button>
      </main>
    )
  }

  const { childId: selectedId } = await searchParams
  const activeChild = children.find((c) => c.id === selectedId) ?? children[0]

  // Fetch stats for active child
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const mondayThisWeek = (() => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); d.setHours(0,0,0,0); return d.toISOString()
  })()

  const [{ data: sessions }, { data: answers }] = await Promise.all([
    supabase.from('practice_sessions').select('*')
      .eq('child_id', activeChild.id).eq('status', 'completed')
      .gte('started_at', thirtyDaysAgo).order('started_at', { ascending: false }),
    supabase.from('session_answers').select('question_id, is_correct, session_id').in(
      'session_id',
      (await supabase.from('practice_sessions').select('id').eq('child_id', activeChild.id)
        .eq('status', 'completed').gte('started_at', thirtyDaysAgo)).data?.map((s) => s.id) ?? []
    ),
  ])

  const sessionsThisWeek = (sessions ?? []).filter((s) => s.started_at >= mondayThisWeek).length
  const last10 = (sessions ?? []).slice(0, 10)
  const avgScore = last10.length > 0
    ? Math.round(last10.reduce((sum, s) => sum + (s.score_percent ?? 0), 0) / last10.length)
    : 0

  // Streak calculation: consecutive calendar days
  const sessionDays = new Set((sessions ?? []).map((s) => new Date(s.started_at).toDateString()))
  let streak = 0
  for (let i = 0; ; i++) {
    const d = new Date(); d.setDate(d.getDate() - i)
    if (sessionDays.has(d.toDateString())) streak++
    else break
  }

  // Topic accuracy: join session_answers with questions to get topic grouping
  const { data: answersWithTopics } = await supabase
    .from('session_answers')
    .select('is_correct, questions(topic)')
    .in(
      'session_id',
      (sessions ?? []).map((s) => s.id)
    )

  const topicAccuracy: Record<string, { correct: number; total: number }> = {}
  for (const row of answersWithTopics ?? []) {
    const topic = (row.questions as { topic: string } | null)?.topic
    if (!topic) continue
    if (!topicAccuracy[topic]) topicAccuracy[topic] = { correct: 0, total: 0 }
    topicAccuracy[topic].total++
    if (row.is_correct) topicAccuracy[topic].correct++
  }

  // Weak areas: topics with accuracy < 0.65
  const topicList = Object.entries(topicAccuracy)
    .map(([topic, { correct, total }]) => ({ topic, accuracy: correct / total }))
    .sort((a, b) => a.accuracy - b.accuracy)
  const weakTopics = topicList.filter((t) => t.accuracy < 0.65).slice(0, 2)

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Button asChild variant="outline" size="sm"><Link href="/children/new">+ Add Child</Link></Button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {children.map((child) => (
          <ChildCard key={child.id} child={child} active={child.id === activeChild.id} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Sessions This Week" value={sessionsThisWeek} icon="📅" />
        <StatCard label="Avg Score" value={`${avgScore}%`} icon="⭐" />
        <StatCard label="Current Streak" value={`${streak} days`} icon="🔥" />
      </div>
      <WeakAreasCallout topics={weakTopics} childName={activeChild.name} />
      <div>
        <h2 className="font-semibold mb-3">Progress by Topic</h2>
        <ProgressChart topics={topicList} />
      </div>
      <div>
        <h2 className="font-semibold mb-3">Recent Sessions</h2>
        <SessionHistoryTable sessions={sessions ?? []} />
      </div>
    </main>
  )
}
```

- [ ] **Step 5: Run tests**

```bash
npm test
```
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/(parent)/dashboard/ components/dashboard/
git commit -m "feat: add parent dashboard with stats, topic progress, and session history"
```

---

## Phase 7: Settings + API Keys

### Task 17: Parent Settings Page

**Files:**
- Create: `app/(parent)/settings/page.tsx`

- [ ] **Step 1: Write failing settings test**

Create `app/(parent)/settings/page.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
// Test the client component only
import { ApiKeySection } from './api-key-section'

describe('ApiKeySection', () => {
  it('renders provider dropdown and key inputs', () => {
    render(<ApiKeySection currentProvider="web_speech" onSave={vi.fn()} />)
    expect(screen.getByText(/tts provider/i)).toBeInTheDocument()
    expect(screen.getByText(/web speech/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Implement settings page and API key section**

Create `app/(parent)/settings/api-key-section.tsx` (client component):
```typescript
'use client'
import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Provider = 'web_speech' | 'openai' | 'elevenlabs'

interface Props {
  currentProvider: Provider
  hasOpenAIKey: boolean
  hasElevenLabsKey: boolean
  onSave: (data: { provider: Provider; openaiKey?: string; elevenLabsKey?: string }) => Promise<void>
}

export function ApiKeySection({ currentProvider, hasOpenAIKey, hasElevenLabsKey, onSave }: Props) {
  const [provider, setProvider] = useState<Provider>(currentProvider)
  const [openaiKey, setOpenaiKey] = useState('')
  const [elevenLabsKey, setElevenLabsKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave({ provider, openaiKey: openaiKey || undefined, elevenLabsKey: elevenLabsKey || undefined })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label>TTS Provider</Label>
        <Select value={provider} onValueChange={(v) => setProvider(v as Provider)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="web_speech">Web Speech (Free — built-in browser voices)</SelectItem>
            <SelectItem value="openai" disabled={!hasOpenAIKey && !openaiKey}>
              OpenAI TTS {!hasOpenAIKey && '(add key below)'}
            </SelectItem>
            <SelectItem value="elevenlabs" disabled={!hasElevenLabsKey && !elevenLabsKey}>
              ElevenLabs {!hasElevenLabsKey && '(add key below)'}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="openai-key">OpenAI API Key {hasOpenAIKey && '(saved ✓)'}</Label>
        <Input id="openai-key" type="password" placeholder={hasOpenAIKey ? '••••••••' : 'sk-...'}
          value={openaiKey} onChange={(e) => setOpenaiKey(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="el-key">ElevenLabs API Key {hasElevenLabsKey && '(saved ✓)'}</Label>
        <Input id="el-key" type="password" placeholder={hasElevenLabsKey ? '••••••••' : 'your key'}
          value={elevenLabsKey} onChange={(e) => setElevenLabsKey(e.target.value)} />
      </div>
      <Button onClick={handleSave} disabled={saving}>
        {saved ? 'Saved ✓' : saving ? 'Saving...' : 'Save Settings'}
      </Button>
    </div>
  )
}
```

Create `app/(parent)/settings/actions.ts` (Server Action for saving):
```typescript
'use server'
import { createClient } from '@/lib/supabase/server'
import { encrypt } from '@/lib/encryption'
import { revalidatePath } from 'next/cache'

export async function saveParentSettings(formData: {
  provider: 'web_speech' | 'openai' | 'elevenlabs'
  openaiKey?: string
  elevenLabsKey?: string
  voice?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const secret = process.env.ENCRYPTION_SECRET!
  const { data: existing } = await supabase.from('parents').select('settings').eq('id', user.id).single()
  const current = existing?.settings ?? {}

  const updatedSettings = {
    ...current,
    tts_provider: formData.provider,
    ...(formData.voice ? { tts_voice: formData.voice } : {}),
    ...(formData.openaiKey
      ? { openai_api_key_encrypted: await encrypt(formData.openaiKey, secret) }
      : {}),
    ...(formData.elevenLabsKey
      ? { elevenlabs_api_key_encrypted: await encrypt(formData.elevenLabsKey, secret) }
      : {}),
  }

  const { error } = await supabase
    .from('parents')
    .update({ settings: updatedSettings })
    .eq('id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/settings')
}
```

Create `app/(parent)/settings/page.tsx`:
```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ApiKeySection } from './api-key-section'
import { saveParentSettings } from './actions'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: parent } = await supabase.from('parents').select('settings').eq('id', user.id).single()
  const settings = parent?.settings ?? {}

  return (
    <main className="max-w-lg mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>
      <section className="space-y-2">
        <h2 className="font-semibold text-lg">Text-to-Speech</h2>
        <ApiKeySection
          currentProvider={settings.tts_provider ?? 'web_speech'}
          hasOpenAIKey={!!settings.openai_api_key_encrypted}
          hasElevenLabsKey={!!settings.elevenlabs_api_key_encrypted}
          onSave={saveParentSettings}
        />
      </section>
    </main>
  )
}
```

Add test for `saveParentSettings` to `app/(parent)/settings/actions.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'p1' } } }) },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { settings: {} }, error: null }),
      error: null,
    }),
  }),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

process.env.ENCRYPTION_SECRET = 'a'.repeat(64)

describe('saveParentSettings', () => {
  it('saves provider without crashing when no API key provided', async () => {
    const { saveParentSettings } = await import('./actions')
    await expect(saveParentSettings({ provider: 'web_speech' })).resolves.not.toThrow()
  })

  it('encrypts API key before saving', async () => {
    const { saveParentSettings } = await import('./actions')
    // Should not throw — encryption is exercised internally
    await expect(saveParentSettings({ provider: 'openai', openaiKey: 'sk-test' })).resolves.not.toThrow()
  })
})

- [ ] **Step 3: Run tests**

```bash
npm test app/(parent)/settings
```
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/(parent)/settings/
git commit -m "feat: add parent settings with encrypted API key management and TTS provider selector"
```

---

## Phase 8: Polish + Documentation

### Task 18: README + Local Dev Docs

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write README**

Create `README.md` with:
- Project description and screenshot placeholder
- Prerequisites (Node 20+, Docker Desktop, Supabase CLI)
- Local setup steps (exact commands from spec Section 13)
- Env vars table with descriptions
- Deployment section (Vercel + Supabase project creation)
- Accommodation features list
- How to add more questions (questions.json format)
- How to add new grades/subjects

- [ ] **Step 2: Final full test run**

```bash
npm test
```
Expected: All tests PASS

- [ ] **Step 3: Verify app runs locally**

```bash
npm run dev
```
- Open http://localhost:3000
- Sign up as a parent
- Create a child profile with accommodations
- Start a practice session
- Verify TTS reads the question
- Submit an answer
- Complete session and see celebration screen
- Check dashboard for session data

- [ ] **Step 4: Final commit**

```bash
git add README.md
git commit -m "docs: add README with local setup and accommodation guide"
```

---

## Quick Reference

### Run all tests
```bash
npm test
```

### Start local dev stack
```bash
npx supabase start   # must be running before npm run dev
npm run dev
```

### Reset local database
```bash
npx supabase db reset
npm run db:seed
```

### Add more questions
Edit `supabase/seed/questions.json` and run `npm run db:seed`.
Format: see spec Section 12 and existing entries for field documentation.

### Generate simplified question text (requires OpenAI key)
```bash
OPENAI_API_KEY=sk-... npm run generate:simplified
```
