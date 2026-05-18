# Grade 5 Science Subject — Design Spec

**Date:** 2026-05-17
**Status:** Approved
**Approach:** C — Text questions first, visual enhancements as a follow-up sprint

---

## Overview

Add Science as a third subject alongside Math and Reading, starting with Grade 5.
Virginia SOL tests Science at Grade 5 (general science) and Grade 8 (Physical Science).
This spec covers Grade 5 only.

Grade 5 Science SOL test is based on the 2018 Virginia Science Standards of Learning.
The test is multiple-choice, administered in spring. First year under 2018 standards: Spring 2023.

---

## Curriculum Definition

8 topics to add to `SOL_CURRICULUM[5].science` in `lib/curriculum/sol-curriculum.ts`:

| Topic name | SOL standard | Description |
|---|---|---|
| `scientific investigation` | 5.1 | Design/conduct investigations; scientific method, variables, controls, data analysis, lab safety |
| `force and motion` | 5.3 | Kinetic energy; net force and mass; describe motion by direction and speed; friction as opposing force; energy transfer in collisions |
| `energy` | 5.2 | Forms of energy (thermal, radiant, mechanical, electrical/magnetic); energy transformations; conservation of energy |
| `electricity` | 5.4 | Open vs. closed circuits; conductors vs. insulators; static electricity; magnetic fields created by electric current |
| `sound and light` | 5.5–5.6 | Sound production, transmission, pitch, volume; light reflection, refraction, absorption, color separation |
| `matter` | 5.7 | Atomic composition; physical vs. chemical properties; mixtures vs. solutions; phase changes and energy |
| `earth and space systems` | 5.8 | Plate tectonics; rock cycle; weathering and erosion; fossils; layers of Earth; solar system relationships |
| `earth resources` | 5.9 | Renewable vs. nonrenewable energy sources; conservation practices; human impact on natural resources |

Sound and light are combined into one topic because they appear in the same SOL reporting category at Grade 5 and share thematic treatment in the test.

---

## Tier Support

Science inherits the full three-tier system with no DB changes:

| Tier | Generation | Serving behavior |
|---|---|---|
| **Foundational** | `tier: 'foundational'` pass — difficulty 1 only, no `simplified_text`, SVG diagrams | Never auto-promoted; parent-controlled entry/exit |
| **Simplified** | `tier: 'standard'` questions, prefers those with `simplified_text` | Default starting level; promotes to Standard after 2 sessions ≥ 80% |
| **Standard** | `tier: 'standard'` questions, no `simplified_text` filter | Awards mastery after 2 sessions ≥ 80% |

The `queries.ts` serving logic, `child_topic_levels` promotion engine, DB `tier` column, and `generateTopic` function are all subject-agnostic and require no changes.

---

## Files Changed

### 1. `lib/curriculum/sol-curriculum.ts`

- Add `science?: SolTopic[]` to the `SolSubject` interface
- Export `type Subject = 'math' | 'reading' | 'science'` as the canonical subject union
- Add `SOL_CURRICULUM[5].science` with the 8 topics above
- Update `getTopicsForGradeSubject(grade, subject: Subject)` signature

### 2. `lib/generation/generate-topic.ts`

- Update `subject` parameter type from `'math' | 'reading'` to `Subject`
- Add `sciencePromptGuidance(grade, tier)` helper injected into `buildPrompt`:
  - `reading_passage` always `null`
  - `calculator_allowed` always `false`
  - Encourage concrete real-world anchors (flashlight circuits, river erosion, iron filings near a magnet)
  - Encourage vocabulary fill-in-the-blank (e.g. "The force that opposes motion is called ___")
  - Avoid diagram-dependent questions — write them as self-contained text; if a visual is genuinely required, omit the question (it will be caught by the `find-visual-reference-questions` script at review time)
  - Foundational tier science: single observable fact per question; everyday objects and phenomena; ≤10-word sentences; no multi-step reasoning
- No changes to `buildPrompt` structure — science guidance slots in alongside the existing `gradeBandInstructions` and `calculatorRule` helpers

### 3. `components/admin/generate-review-client.tsx`

- Change `subject` state type from `'math' | 'reading'` to `Subject`
- Add `'science'` option to the subject `<select>` dropdown
- Disable science option when `grade !== 5` (only Grade 5 is in scope for this sprint); show a tooltip "Science available for Grade 5 only"

### 4. `app/api/admin/generate/route.ts`

- Update any hardcoded subject validation to allow `'science'` (currently passes subject directly to `getTopicsForGradeSubject` — the type update propagates automatically; verify no runtime guard blocks it)

---

## What Does NOT Change

- **DB schema** — zero migrations; `questions.subject`, `practice_sessions.subject`, and `child_topic_levels.subject` are all free-text
- **Practice session flow** — `availableSubjects` is already derived dynamically from the questions table; science appears automatically once questions are generated and approved
- **`queries.ts` serving logic** — subject-agnostic
- **Promotion/demotion engine** — subject-agnostic
- **Dashboard, feedback, streaks, milestones** — all subject-agnostic

---

## Out of Scope (Follow-up Sprints)

- **Grade 8 Physical Science** — same pattern, different topic set; plan separately
- **Visual/diagram questions** — questions that inherently require a circuit diagram, force arrow, or rock cycle diagram. The `find-visual-reference-questions.ts` script will catch any that slip through generation and hide them with `needs_image=true`. A future sprint will add image assets or SVG generation for science.
- **Science-specific question types** — e.g. "label the diagram", drag-and-drop, ordering. Standard multiple-choice and fill-in-the-blank cover the Grade 5 SOL test format.

---

## Generation Quality Notes

Science questions at Grade 5 are largely fact-recall and single-concept application — closer to Math difficulty 1–2 than to the inference-heavy Reading questions. Distractors should reflect common misconceptions:
- Confusing conductors and insulators (rubber vs. copper)
- Confusing renewable and nonrenewable (solar vs. coal)
- Confusing physical and chemical changes (melting vs. burning)
- Confusing weathering and erosion
- Confusing open and closed circuits

After the first generation batch is reviewed in the admin panel, assess question quality and adjust `sciencePromptGuidance` if needed before generating remaining topics.

---

## Rollout Order

1. Implement code changes (4 files)
2. Generate + review `standard` tier for all 8 Grade 5 science topics in admin panel
3. Generate + review `foundational` tier for all 8 topics
4. Run `find-visual-reference-questions.ts` against new questions to catch any diagram-dependent ones
5. Science appears automatically in practice sessions for Grade 5 children

---

## Question Generation Workflow (Zero API Cost)

Use this workflow whenever generating questions from the terminal. It does not require the Anthropic API key — Claude Code in the terminal session IS the LLM.

The admin page (`/admin/generate`) still calls the API because there is no Claude Code session available in that context.

### Scripts

| Script | Purpose |
|---|---|
| `scripts/judge-pending.ts` | Formats a JSON file into a structured judge review prompt |
| `scripts/insert-pending.ts` | Validates and inserts reviewed questions into `questions_pending` |

### Steps

```bash
# 1. Ask Claude Code to generate questions for a topic
#    e.g. "Generate 6 standard Grade 5 science questions for Solar System (SOL 5.9)"
#    Claude writes the output to tmp/questions.json

# 2. Run the judge formatter — Claude reads output and judges inline
npx tsx scripts/judge-pending.ts --file tmp/questions.json

# 3. Claude applies any edits directly to tmp/questions.json

# 4. Dry-run to confirm shape is valid before insert
npx tsx scripts/insert-pending.ts --file tmp/questions.json --dry-run

# 5. Insert into questions_pending
npx tsx scripts/insert-pending.ts --file tmp/questions.json

# 6. Review and approve at /admin/generate
```

### JSON Format

See `tmp/questions-template.json` for a complete example. Required fields per question:

```
grade, subject, topic, tier, difficulty (1|2|3), answer_type,
question_text, simplified_text (string, "" if none),
choices, hint_1, hint_2, hint_3
```

Optional: `subtopic`, `sol_standard`, `reading_passage`, `calculator_allowed`, `image_svg`

### Judge Criteria (enforced by `judge-pending.ts`)

- **Correctness** — one correct answer for MC; ≥2 for multi-select; factually accurate
- **Distractors** — plausible misconceptions, not obviously wrong or secretly correct
- **Scope** — concept in grade/SOL scope; vocabulary appropriate; difficulty rating matches demand
- **Clarity** — unambiguous; no visual-reference dependency; stem doesn't give away answer
- **Hints** — escalate in specificity (nudge → concept → near-answer); none give it away outright
- **Simplified text** — shorter, simpler vocabulary, same intent; not empty for standard tier
