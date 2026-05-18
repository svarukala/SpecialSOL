# Grade 5 Science Subject Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Science as a third subject for Grade 5, wiring 8 SOL topics through the curriculum definition, AI generation pipeline, and admin UI.

**Architecture:** Science slots into the existing subject-agnostic infrastructure (DB, practice session flow, topic-level tracking) with changes to exactly 4 files. The curriculum definition gets a new `science` key; the generation prompt gets science-specific guidance; the admin dropdown exposes science for Grade 5.

**Tech Stack:** TypeScript, Next.js App Router, Anthropic SDK, Vitest, Supabase

---

## File Map

| File | Change |
|---|---|
| `lib/curriculum/sol-curriculum.ts` | Add `Subject` type, `science?` to `SolSubject`, Grade 5 topics, update `getTopicsForGradeSubject` signature |
| `lib/generation/generate-topic.ts` | Update `subject` param type, add `sciencePromptGuidance()` helper |
| `lib/generation/generate-topic.test.ts` | Add tests for science subject routing and prompt content |
| `components/admin/generate-review-client.tsx` | Add science option to subject dropdown (Grade 5 only) |

---

## Task 1: Add `Subject` type and science curriculum to `sol-curriculum.ts`

**Files:**
- Modify: `lib/curriculum/sol-curriculum.ts`

- [ ] **Step 1: Add `Subject` type and update `SolSubject` interface**

In `lib/curriculum/sol-curriculum.ts`, make these changes:

```ts
// Replace the existing SolSubject interface
export type Subject = 'math' | 'reading' | 'science'

export interface SolSubject {
  math: SolTopic[]
  reading: SolTopic[]
  science?: SolTopic[]
}
```

- [ ] **Step 2: Add Grade 5 science topics to `SOL_CURRICULUM`**

Inside the `5:` block in `SOL_CURRICULUM`, after the existing `reading` array, add:

```ts
    science: [
      { name: 'scientific investigation', solStandard: '5.1', description: 'Design and conduct investigations using the scientific method; identify variables and controls; record and analyze data; follow lab safety procedures' },
      { name: 'force and motion',         solStandard: '5.3', description: 'Describe motion by direction and speed; kinetic energy; net force and mass affect changes in motion; friction opposes motion; energy transfer in collisions' },
      { name: 'energy',                   solStandard: '5.2', description: 'Identify forms of energy (thermal, radiant, mechanical, electrical/magnetic); describe energy transformations; energy cannot be created or destroyed' },
      { name: 'electricity',              solStandard: '5.4', description: 'Distinguish open from closed circuits; compare conductors and insulators; describe static electricity; explain how electric current creates a magnetic field' },
      { name: 'sound and light',          solStandard: '5.5', description: 'Explain sound production and transmission; describe pitch and volume; describe light reflection, refraction, and absorption; explain color separation' },
      { name: 'matter',                   solStandard: '5.7', description: 'Describe atomic composition of matter; distinguish physical from chemical properties; distinguish mixtures from solutions; describe phase changes and energy' },
      { name: 'earth and space systems',  solStandard: '5.8', description: 'Explain plate tectonics and the rock cycle; describe weathering and erosion; identify how fossils form; describe layers of Earth; describe solar system relationships' },
      { name: 'earth resources',          solStandard: '5.9', description: 'Distinguish renewable from nonrenewable energy sources; describe conservation practices; explain human impact on natural resources' },
    ],
```

- [ ] **Step 3: Update `getTopicsForGradeSubject` signature**

Replace the existing function:

```ts
export function getTopicsForGradeSubject(grade: number, subject: Subject): SolTopic[] {
  return SOL_CURRICULUM[grade]?.[subject] ?? []
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add lib/curriculum/sol-curriculum.ts
git commit -m "feat(curriculum): add Subject type and Grade 5 science topics to SOL_CURRICULUM"
```

---

## Task 2: Add science prompt guidance to `generate-topic.ts`

**Files:**
- Modify: `lib/generation/generate-topic.ts`
- Modify: `lib/generation/generate-topic.test.ts`

- [ ] **Step 1: Write failing tests for science subject support**

Add to `lib/generation/generate-topic.test.ts`:

```ts
const mockScienceTopic: SolTopic = {
  name: 'electricity',
  solStandard: '5.4',
  description: 'Circuits, conductors, insulators, static electricity, magnetic fields',
}

const mockScienceQuestion = {
  grade: 5, subject: 'science', topic: 'electricity', subtopic: 'conductors and insulators',
  sol_standard: '5.4', difficulty: 1,
  question_text: 'Which material allows electricity to flow through it?',
  simplified_text: 'Which material lets electricity pass through it?',
  answer_type: 'multiple_choice',
  choices: [
    { id: 'a', text: 'Copper wire', is_correct: true },
    { id: 'b', text: 'Rubber band', is_correct: false },
    { id: 'c', text: 'Plastic cup', is_correct: false },
    { id: 'd', text: 'Wood block', is_correct: false },
  ],
  hint_1: 'Think about what materials let electricity flow.',
  hint_2: 'Metals are usually good at letting electricity through.',
  hint_3: 'Copper is a metal commonly used in wires.',
  calculator_allowed: false, source: 'ai_generated',
  image_svg: null,
}

describe('generateTopic — science subject', () => {
  it('accepts science as a subject and returns validated questions', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify([mockScienceQuestion]) }],
    })
    const result = await generateTopic(5, 'science', mockScienceTopic)
    expect(result).toHaveLength(1)
    expect(result[0].subject).toBe('science')
  })

  it('includes science-specific guidance in the prompt (no reading passage)', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify([mockScienceQuestion]) }],
    })
    await generateTopic(5, 'science', mockScienceTopic)
    const lastCall = mockCreate.mock.calls[mockCreate.mock.calls.length - 1]
    const prompt: string = lastCall[0].messages[0].content
    expect(prompt).toContain('reading_passage": null')
    expect(prompt).toContain('calculator_allowed": false')
  })

  it('includes real-world anchor guidance in science prompt', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify([mockScienceQuestion]) }],
    })
    await generateTopic(5, 'science', mockScienceTopic)
    const lastCall = mockCreate.mock.calls[mockCreate.mock.calls.length - 1]
    const prompt: string = lastCall[0].messages[0].content
    expect(prompt.toLowerCase()).toContain('real-world')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --reporter=verbose lib/generation/generate-topic.test.ts
```

Expected: 3 new tests fail — `generateTopic` doesn't accept `'science'` yet.

- [ ] **Step 3: Update `subject` parameter type in `generate-topic.ts`**

At the top of `lib/generation/generate-topic.ts`, update the import and the `generateTopic` signature:

```ts
import { type SolTopic, type Subject } from '@/lib/curriculum/sol-curriculum'
```

Update all occurrences of `subject: 'math' | 'reading'` to `subject: Subject`:

```ts
// gradeBandInstructions — update signature
function gradeBandInstructions(grade: number, subject: Subject): string {

// buildPrompt — update signature
function buildPrompt(grade: number, subject: Subject, topic: SolTopic, tier: 'foundational' | 'standard'): string {

// generateTopic — update signature
export async function generateTopic(
  grade: number,
  subject: Subject,
  topic: SolTopic,
  tier: 'foundational' | 'standard' = 'standard'
): Promise<GeneratedQuestion[]> {
```

- [ ] **Step 4: Add `sciencePromptGuidance()` helper**

Add this function after `gradeBandInstructions` in `lib/generation/generate-topic.ts`:

```ts
function sciencePromptGuidance(tier: 'foundational' | 'standard'): string {
  const foundationalNote = tier === 'foundational'
    ? `
FOUNDATIONAL SCIENCE:
- Each question tests a single observable fact or straightforward classification.
- Use everyday objects as anchors: a flashlight (circuits), a river (erosion), a refrigerator magnet, an ice cube melting.
- Avoid any question that requires reading a diagram, chart, or table.
- Good: "Which material would make the best conductor of electricity — copper wire, rubber band, wooden stick, or plastic straw?"
- Bad: "Based on the circuit diagram, what happens when the switch is opened?" (requires diagram)`
    : ''

  return `
SCIENCE SUBJECT GUIDANCE:
- "reading_passage" must always be null. Science questions are self-contained.
- "calculator_allowed" must always be false for Grade 5 science.
- Anchor questions in concrete real-world scenarios: a flashlight bulb going out (open circuit), a river carving a canyon (erosion), a magnet picking up paper clips (magnetic field).
- Vocabulary fill-in-the-blank questions work well for science: "The force that opposes motion between two surfaces is called ___."
- Do NOT write questions that inherently require a visual (circuit diagram, force arrows, rock cycle diagram, coordinate system). If a visual is essential to answering the question, skip it and write a different question instead.
- Strong distractor categories for science at Grade 5:
  - Conductor vs. insulator confusion (rubber vs. copper)
  - Renewable vs. nonrenewable confusion (solar vs. coal)
  - Physical vs. chemical change confusion (melting vs. burning)
  - Weathering vs. erosion confusion
  - Open vs. closed circuit confusion
${foundationalNote}`
}
```

- [ ] **Step 5: Inject `sciencePromptGuidance` into `buildPrompt`**

Inside `buildPrompt`, after the `${gradeBandInstructions(grade, subject)}` line, add:

```ts
${subject === 'science' ? sciencePromptGuidance(tier) : ''}
```

The relevant section in `buildPrompt` should look like:

```ts
  return `${foundationalInstructions}You are creating Virginia SOL practice questions for Grade ${grade} ${subject}.

Topic: ${topic.name}
SOL Standard: ${topic.solStandard}
Standard Description: ${topic.description}
${gradeBandInstructions(grade, subject)}
${subject === 'science' ? sciencePromptGuidance(tier) : ''}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npm test -- --reporter=verbose lib/generation/generate-topic.test.ts
```

Expected: all tests pass, including the 3 new science tests.

- [ ] **Step 7: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add lib/generation/generate-topic.ts lib/generation/generate-topic.test.ts
git commit -m "feat(generation): add science subject support and sciencePromptGuidance helper"
```

---

## Task 3: Add science option to admin generate UI

**Files:**
- Modify: `components/admin/generate-review-client.tsx`

- [ ] **Step 1: Update `subject` state type**

In `components/admin/generate-review-client.tsx`, change the state declaration from:

```ts
const [subject, setSubject] = useState<'math' | 'reading'>('math')
```

to:

```ts
import type { Subject } from '@/lib/curriculum/sol-curriculum'
// ...
const [subject, setSubject] = useState<Subject>('math')
```

- [ ] **Step 2: Add science option to the subject dropdown**

Locate the subject `<select>` element in the JSX and add the science option. The science option is disabled unless `grade === 5`:

```tsx
<select
  value={subject}
  onChange={(e) => setSubject(e.target.value as Subject)}
  // ... existing className and other props
>
  <option value="math">Math</option>
  <option value="reading">Reading</option>
  <option value="science" disabled={grade !== 5}>
    Science{grade !== 5 ? ' (Grade 5 only)' : ''}
  </option>
</select>
```

- [ ] **Step 3: Reset subject when grade changes away from 5**

Locate the existing `useEffect` that resets `topicName` when grade/subject changes. Add a guard to reset subject if it's `'science'` and grade changes away from 5:

```ts
useEffect(() => {
  if (subject === 'science' && grade !== 5) {
    setSubject('math')
  }
  setTopicName(topicsForCurrent[0]?.name ?? '')
}, [grade, subject]) // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Run full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add components/admin/generate-review-client.tsx
git commit -m "feat(admin): add Science subject option to generate UI (Grade 5 only)"
```

---

## Task 4: Smoke test — generate science questions via admin panel

This task verifies the end-to-end pipeline works before pushing.

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Navigate to the admin generate page**

Open `http://localhost:3000/admin/generate` and log in as an admin.

- [ ] **Step 3: Select Grade 5 and Science**

- Set Grade to `5`
- Confirm Science is now selectable in the subject dropdown
- Select topic `electricity`
- Tier: `standard`
- Click Generate

- [ ] **Step 4: Verify generated questions**

Check that the generated questions:
- Have `subject: 'science'`
- Have `reading_passage: null`
- Have `calculator_allowed: false`
- Do not reference a diagram or chart as if it's visible
- Have 4 plausible answer choices with common misconceptions as distractors

- [ ] **Step 5: Test Grade 4 locks out Science**

Change Grade to `4`. Verify the Science option is disabled (grayed out, labeled "Science (Grade 5 only)"). Verify the subject resets to Math automatically.

- [ ] **Step 6: Push**

```bash
git push
```

---

## Task 5: Run `find-visual-reference-questions` after first generation batch

After generating and approving the first batch of science questions in the admin panel, run the visual reference scanner to catch any diagram-dependent questions that slipped through.

- [ ] **Step 1: Run the scanner in dry-run mode**

```bash
set -a && source .env.prod && npx tsx scripts/find-visual-reference-questions.ts
```

Review the output. Science questions referencing "the diagram above", "shown below", "in the figure" etc. should be flagged.

- [ ] **Step 2: If flagged questions exist, apply the fix**

```bash
set -a && source .env.prod && npx tsx scripts/find-visual-reference-questions.ts --fix
```

- [ ] **Step 3: Verify science appears in practice for a Grade 5 child**

Log in as a parent with a Grade 5 child. Navigate to `/practice/[childId]`. Verify Science appears as an available subject in the session setup. Start a science session and complete a question.
