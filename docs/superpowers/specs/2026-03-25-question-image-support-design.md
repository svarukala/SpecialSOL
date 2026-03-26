# Question Image Support Design

**Date:** 2026-03-25
**Status:** Approved

---

## Goal

Allow practice questions to display a simple inline SVG image alongside the question text, generated automatically by the AI pipeline when a visual genuinely helps comprehension (fraction diagrams, number lines, geometric shapes, bar graphs, etc.).

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Image source | AI-generated SVG | No manual upload workflow needed; Claude produces compact SVG for visual topics |
| When to generate | AI decides per-question | Only include when genuinely helpful; text-only questions get `null` |
| Storage | Inline `image_svg text` column in DB | SVGs are small text; no storage bucket, no URLs, no file lifecycle |
| Layout | Image below question text, above answer choices | Natural reading order; text establishes context before visual |
| Admin edit | Raw SVG textarea + live preview in edit mode | Admin can correct or clear AI-generated SVGs |

---

## Architecture

### 1. Data Layer

**Migration `0014_question_image.sql`:**
```sql
ALTER TABLE questions ADD COLUMN image_svg text;
ALTER TABLE questions_pending ADD COLUMN image_svg text;
```
Both columns are nullable — most questions will have `null`.

**`lib/generation/question-schema.ts`:**
- Add `image_svg?: string | null` to `GeneratedQuestion` interface
- No change to required field validation — `image_svg` is always optional

---

### 2. Generation Pipeline

**`lib/generation/generate-topic.ts` — `buildPrompt`:**

Add to the prompt instructions:
```
For each question, include an "image_svg" field:
- Set to a compact inline SVG string when a visual genuinely helps (fraction diagrams,
  number lines, geometric shapes, bar/line graphs, coordinate grids, place value blocks).
- Set to null for text-only questions (arithmetic word problems, vocabulary, reading
  comprehension, poetry).
SVG rules:
- Use a viewBox (e.g. viewBox="0 0 200 100"), no fixed pixel width/height
- No <style> tags, no external hrefs, no JavaScript, no on* attributes
- Monochrome or 2-color max; simple strokes and fills only
- Keep it small — target under 1 KB
```

Add `"image_svg": null` to the JSON schema example in the prompt so Claude knows the field name.

No changes needed to `scripts/generate-questions.ts` or `scripts/consolidate-questions.ts` — they pass all question fields through as-is.

---

### 3. Practice Session UI

**`lib/practice/question-types.ts`:**
- Add `image_svg: string | null` to the `Question` interface

**`components/practice/question-card.tsx`:**
- Render SVG below question text, above the calculator, when `question.image_svg` is non-null
- Use `dangerouslySetInnerHTML` inside a constrained wrapper:
  ```tsx
  {question.image_svg && (
    <div className="flex justify-center my-3">
      <div
        className="max-w-xs w-full rounded border border-border p-2 bg-muted/30"
        dangerouslySetInnerHTML={{ __html__: sanitizeSvg(question.image_svg) }}
      />
    </div>
  )}
  ```
- **SVG sanitizer** — a small `lib/svg/sanitize.ts` utility that strips `<script>` tags and `on*` event attributes before rendering. SVG content originates from our own pipeline but defence-in-depth is worth it.

---

### 4. Admin UI

**`components/admin/published-questions-client.tsx`:**

- **List view:** Show a small `[img]` badge on cards that have a non-null `image_svg` (similar to the existing Foundational badge)
- **Edit view:**
  - If `image_svg` is non-null, render a live SVG preview above the textarea
  - Textarea for raw SVG markup (can be cleared by emptying the field)
  - Change is included in the `drafts` patch object like any other field

**`app/api/admin/questions/[id]/route.ts`:**
- Add `'image_svg'` to the `EDITABLE_FIELDS` whitelist so the PATCH endpoint accepts and persists SVG edits from the admin UI

---

## SVG Sanitizer

**`lib/svg/sanitize.ts`** (new file):
```ts
export function sanitizeSvg(svg: string): string {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
}
```

Simple string-based stripping. SVG content is admin/AI-controlled (not user input), so this is a lightweight safeguard rather than a full sanitization library.

---

## Files Changed

| File | Action |
|------|--------|
| `supabase/migrations/0014_question_image.sql` | Create |
| `lib/generation/question-schema.ts` | Modify — add `image_svg` field |
| `lib/generation/generate-topic.ts` | Modify — add image_svg instructions to prompt |
| `lib/svg/sanitize.ts` | Create — SVG sanitizer utility |
| `lib/practice/question-types.ts` | Modify — add `image_svg` to Question interface |
| `components/practice/question-card.tsx` | Modify — render SVG when present |
| `app/api/admin/questions/[id]/route.ts` | Modify — add `'image_svg'` to `EDITABLE_FIELDS` |
| `components/admin/published-questions-client.tsx` | Modify — add `image_svg` to local `Question` type, badge in list view, textarea + preview in edit view |

---

## Other Notes

- Add `.superpowers/` to `.gitignore` (brainstorming artifacts, not for commit)

---

## Out of Scope

- PNG/JPEG support (future: could add `image_url` column pointing to Supabase Storage)
- Admin image upload UI
- Re-generating images for existing questions (can be done via `--regenerate` flag in a future script)
- Images on answer choices (only question-level images for now)
