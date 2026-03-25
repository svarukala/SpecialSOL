# Admin Question Management Design

**Date:** 2026-03-25

## Goal

Build an admin section at `/admin` that lets authorised users trigger AI question generation, review and inline-edit generated questions before publishing, and browse/edit all published questions. Non-admin users never see the section.

## Context

Question generation currently runs entirely via CLI scripts:
- `scripts/generate-questions.ts` — calls Claude API, writes JSON to `supabase/seed/generated/`
- `scripts/consolidate-questions.ts` — merges generated files into `supabase/seed/questions.json`
- `npx supabase db reset` — re-seeds the DB from the JSON file

The admin UI replaces the review and publish steps with a browser workflow. Approved questions are inserted directly into the live `questions` table — no file step, no DB reset needed.

---

## Schema Changes

### Migration `0010_admin_flag.sql`

```sql
ALTER TABLE parents ADD COLUMN is_admin boolean NOT NULL DEFAULT false;
```

### Migration `0011_questions_pending.sql`

```sql
CREATE TABLE questions_pending (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade integer NOT NULL,
  subject text NOT NULL,
  topic text NOT NULL,
  subtopic text NOT NULL,
  sol_standard text NOT NULL,
  difficulty integer NOT NULL CHECK (difficulty IN (1, 2, 3)),
  question_text text NOT NULL,
  simplified_text text NOT NULL,
  answer_type text NOT NULL DEFAULT 'multiple_choice'
    CHECK (answer_type IN (
      'multiple_choice', 'true_false', 'multiple_select',
      'short_answer', 'ordering', 'matching', 'fill_in_blank'
    )),
  choices jsonb NOT NULL,
  hint_1 text NOT NULL,
  hint_2 text NOT NULL,
  hint_3 text NOT NULL,
  calculator_allowed boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'ai_generated'
    CHECK (source IN ('doe_released', 'ai_generated')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  generated_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES parents(id)
);
```

**Note on nullability:** `subtopic`, `sol_standard`, `simplified_text`, `hint_1`, `hint_2`, `hint_3` are nullable in the live `questions` table but `NOT NULL` here. This is intentional — AI-generated questions must always populate these fields (enforced by prompt + `validateQuestionBatch`), so the stricter constraint acts as a data-quality gate on the staging side.

`reviewed_at` and `reviewed_by` are nullable — both are set together when a question is approved or rejected. A CHECK constraint enforces consistency:

```sql
ALTER TABLE questions_pending
  ADD CONSTRAINT review_columns_consistent
    CHECK (
      (reviewed_at IS NULL AND reviewed_by IS NULL) OR
      (reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL)
    );
```

---

## Shared Generation Logic

**`lib/generation/generate-topic.ts`** — extracted from `scripts/generate-questions.ts`.

The `SolTopic` type and `SOL_CURRICULUM` data currently live in `scripts/sol-curriculum.ts`. As part of this work, they are moved to **`lib/curriculum/sol-curriculum.ts`** so both the Next.js API routes and the CLI scripts can import from a shared `lib/` location without cross-boundary dependencies. The CLI scripts are updated to import from `lib/curriculum/sol-curriculum.ts`.

```ts
export async function generateTopic(
  grade: number,
  subject: 'math' | 'reading',
  topic: SolTopic
): Promise<GeneratedQuestion[]>
```

- Calls the Anthropic API (`claude-opus-4-6`, same model and prompt as the CLI script)
- Validates the response with `validateQuestionBatch`
- Returns the validated questions — does **not** write files or insert into DB
- Throws on API error or validation failure

The existing CLI script (`scripts/generate-questions.ts`) is updated to import and call this function instead of duplicating the logic. API key is read from `process.env.ANTHROPIC_API_KEY`.

---

## Parent Nav Update

**`app/(parent)/layout.tsx`** — Server Component already fetches the authenticated user. Add one extra select:

```ts
const { data: parent } = await supabase
  .from('parents')
  .select('is_admin')
  .eq('id', user.id)
  .single()
```

Conditionally render an Admin nav link:

```tsx
{parent?.is_admin && (
  <Link href="/admin/generate" className={navLinkClass}>
    <span>🛠️</span>
    <span className="hidden sm:inline">Admin</span>
  </Link>
)}
```

Non-admin users never see the link. The link is discoverability only — the `(admin)` layout independently enforces access.

---

## Route Group `app/(admin)/`

### `app/(admin)/layout.tsx`

Server Component. Fetches `is_admin` from `parents` for the current user. Redirects to `/dashboard` if the user is not an admin or is not authenticated. Renders a minimal two-link admin nav:

```
🛠️ Admin  |  Generate & Review  |  Published Questions  |  ← Dashboard
```

### `app/(admin)/admin/generate/page.tsx`

Server Component shell. Renders `<GenerateReviewClient />` — a Client Component that owns all interactive state (generation form, pending queue, inline edits).

### `app/(admin)/admin/questions/page.tsx`

Server Component. Pre-fetches the first page of published questions (no filters, offset 0, limit 20) and passes them as initial props to `<PublishedQuestionsClient />`. Client Component handles filter changes and pagination via fetch.

---

## API Routes

All routes live under `app/api/admin/`. Every route independently verifies `is_admin` via a shared helper — the layout redirect is not sufficient for API protection.

```ts
// lib/admin/assert-admin.ts
export async function assertAdmin(supabase: SupabaseClient): Promise<string> {
  // Returns the user id if admin.
  // Throws a Response with status 403 and body { error: 'forbidden' } if not admin or not authenticated.
  // Any other error (e.g. DB failure) is re-thrown as-is (not wrapped in a Response).
  // Usage in route handlers:
  //   const userIdOrErr = await assertAdmin(supabase).catch(e => e)
  //   if (userIdOrErr instanceof Response) return userIdOrErr
  //   // userIdOrErr is now string (userId)
}
```

### `POST /api/admin/generate`

**Body:** `{ grade: number, subject: string, topic: string }`

1. Asserts admin
2. Looks up the `SolTopic` from `SOL_CURRICULUM` by grade/subject/topic name — returns 400 with `{ error: 'unknown_topic' }` if no match found
3. Calls `generateTopic(grade, subject, topic)`
4. Bulk-inserts all returned questions into `questions_pending` with `status = 'pending'`
5. Returns `{ count: number, ids: string[] }`

On generation or validation failure: returns 500 with `{ error: string }`. No partial inserts — if any question fails validation the whole batch is discarded.

### `GET /api/admin/pending`

1. Asserts admin

**Query params:** `?includeRejected=true|false` (default false)

Returns all pending questions (and optionally rejected ones) ordered by `generated_at DESC`.

### `PATCH /api/admin/pending/[id]`

1. Asserts admin

**Body:** Partial question fields (any of: `question_text`, `simplified_text`, `choices`, `hint_1`, `hint_2`, `hint_3`, `difficulty`, `calculator_allowed`).

Updates the `questions_pending` row. Only `status = 'pending'` rows can be edited (returns 409 if already approved/rejected).

### `POST /api/admin/pending/[id]/approve`

1. Asserts admin
2. Reads the `questions_pending` row
3. Checks for an existing row in `questions` with the same `sol_standard + question_text` — returns 409 with `{ error: 'already_published' }` if found
4. Within a single database transaction: inserts into `questions` table and updates `questions_pending` row (`status = 'approved'`, `reviewed_at = now()`, `reviewed_by = userId`)
5. Returns `{ questionId: string }`

### `POST /api/admin/pending/[id]/reject`

1. Asserts admin

Sets `status = 'rejected'`, `reviewed_at = now()`, `reviewed_by = userId`. Returns 200.

### `POST /api/admin/pending/[id]/restore`

1. Asserts admin

Resets a rejected question back to `status = 'pending'`, clears `reviewed_at = null`, `reviewed_by = null`. Returns 200. Returns 409 if the row is already `status = 'pending'` or `'approved'`.

### `GET /api/admin/questions`

1. Asserts admin

**Query params:** `?grade=&subject=&topic=&offset=0&limit=20`

Returns published questions filtered by the provided params. All params optional. Returns `{ questions: Question[], total: number }`.

Offset-based pagination is intentional for this internal tool; duplicate/skip edge cases under concurrent edits are accepted.

### `PATCH /api/admin/questions/[id]`

1. Asserts admin

**Body:** Partial question fields (same set as pending PATCH).

Updates a row in the `questions` table directly. Returns the updated question.

---

## UI Components

### `<GenerateReviewClient />`

Client Component at `components/admin/generate-review-client.tsx`.

**State:**
- `grade`, `subject`, `topic` — generation form selects (topic list derived from `SOL_CURRICULUM` based on current grade+subject)
- `generating: boolean` — shows spinner on the Generate button
- `pendingQuestions: PendingQuestion[]` — fetched on mount, updated after each approve/reject/generate
- `showRejected: boolean` — filter toggle

**Behaviour:**
- Topic select is repopulated when grade or subject changes
- Generate button calls `POST /api/admin/generate`, then refreshes the pending list
- Each card: all text fields are `<textarea>` / `<input>` elements — changes call `PATCH /api/admin/pending/[id]` on blur (no separate Save button for pending — auto-saves on blur)
- Correct answer: clicking a choice radio marks it as `is_correct: true` (updates choices array, auto-saves)
- Approve / Reject buttons update the card UI optimistically, then call the respective API
- Rejected cards are shown dimly with a Restore button (calls `POST /api/admin/pending/[id]/restore`)

### `<PublishedQuestionsClient />`

Client Component at `components/admin/published-questions-client.tsx`.

**State:**
- `filters: { grade, subject, topic }` — controlled by the filter row
- `questions: Question[]` — initialised from server props, refreshed on filter change
- `offset: number` — for Load More pagination
- `editingId: string | null` — which card is expanded for editing

**Behaviour:**
- Filter changes trigger `GET /api/admin/questions?...`, replace the list from offset 0
- Load More appends next page
- Collapsed cards show question text + an Edit button
- Expanded card shows all editable fields; **Save changes** button calls `PATCH /api/admin/questions/[id]`
- Save button disabled until a field has changed

---

## Error Handling

| Scenario | Behaviour |
|----------|-----------|
| Unknown topic in generate body | 400 returned with `{ error: 'unknown_topic' }` |
| Generation API error | 500 returned; inline error banner shown in the form area |
| Validation failure on generated batch | 500 returned; entire batch discarded, error shown |
| Approve duplicate question | 409 returned; card shows "already published" inline message |
| Non-admin accesses `/admin/*` | Layout redirects to `/dashboard` |
| Non-admin calls admin API | 403 returned |
| DB error on approve/reject | 500 returned; optimistic UI update rolled back |
| Restore called on non-rejected row | 409 returned |

---

## Testing

- **Unit:** `lib/generation/generate-topic.ts` — mock the Anthropic client, assert correct prompt construction and validation
- **API:**
  - `POST /api/admin/generate` — mock `generateTopic`, assert DB insert; assert 400 on unknown topic
  - `GET /api/admin/pending` — assert `includeRejected` filter behaviour
  - `PATCH /api/admin/pending/[id]` — assert field update; assert 409 when row is not pending
  - `POST /api/admin/pending/[id]/approve` — assert row appears in `questions`, assert 409 on duplicate, assert transaction atomicity (both writes succeed or neither does)
  - `POST /api/admin/pending/[id]/reject` — assert status update
  - `POST /api/admin/pending/[id]/restore` — assert status reset to pending, cleared review columns; assert 409 on non-rejected rows
  - `GET /api/admin/questions` — assert filter params passed correctly
  - `PATCH /api/admin/questions/[id]` — assert update applied to `questions` table
- **Auth guard:** assert all admin routes return 403 for a non-admin user
- **No component tests** for admin UI — internal tool, manual QA is sufficient

---

## Files

| Action | File | Purpose |
|--------|------|---------|
| Create | `supabase/migrations/0010_admin_flag.sql` | Add `is_admin` to `parents` |
| Create | `supabase/migrations/0011_questions_pending.sql` | Create `questions_pending` table |
| Move | `scripts/sol-curriculum.ts` → `lib/curriculum/sol-curriculum.ts` | Move curriculum data to shared lib |
| Create | `lib/generation/generate-topic.ts` | Shared generation logic |
| Modify | `scripts/generate-questions.ts` | Import from `lib/generation/generate-topic.ts` and `lib/curriculum/sol-curriculum.ts` |
| Modify | `app/(parent)/layout.tsx` | Conditionally show Admin nav link |
| Create | `app/(admin)/layout.tsx` | Admin route group, is_admin guard |
| Create | `app/(admin)/admin/generate/page.tsx` | Generate & Review page shell |
| Create | `app/(admin)/admin/questions/page.tsx` | Published Questions page shell |
| Create | `components/admin/generate-review-client.tsx` | Interactive Generate & Review UI |
| Create | `components/admin/published-questions-client.tsx` | Interactive Published Questions UI |
| Create | `lib/admin/assert-admin.ts` | Shared admin auth helper |
| Create | `app/api/admin/generate/route.ts` | Trigger generation |
| Create | `app/api/admin/pending/route.ts` | List pending questions |
| Create | `app/api/admin/pending/[id]/route.ts` | Edit pending question |
| Create | `app/api/admin/pending/[id]/approve/route.ts` | Approve pending question |
| Create | `app/api/admin/pending/[id]/reject/route.ts` | Reject pending question |
| Create | `app/api/admin/pending/[id]/restore/route.ts` | Restore rejected question to pending |
| Create | `app/api/admin/questions/route.ts` | List published questions |
| Create | `app/api/admin/questions/[id]/route.ts` | Edit published question |
| Create | `lib/generation/generate-topic.test.ts` | Unit tests for generation logic |
| Create | `app/api/admin/generate/route.test.ts` | API tests for generate route |
| Create | `app/api/admin/pending/route.test.ts` | API tests for list-pending route |
| Create | `app/api/admin/pending/[id]/route.test.ts` | API tests for edit-pending route |
| Create | `app/api/admin/pending/[id]/approve/route.test.ts` | API tests for approve route |
| Create | `app/api/admin/pending/[id]/reject/route.test.ts` | API tests for reject route |
| Create | `app/api/admin/pending/[id]/restore/route.test.ts` | API tests for restore route |
| Create | `app/api/admin/questions/route.test.ts` | API tests for list-questions route |
| Create | `app/api/admin/questions/[id]/route.test.ts` | API tests for edit-question route |
| Create | `app/api/admin/auth-guard.test.ts` | Auth guard: all routes return 403 for non-admin |
