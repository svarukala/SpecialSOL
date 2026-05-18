# Scratchpad & Highlighter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a floating freehand scratchpad overlay and a drag-to-highlight mode to the practice session UI.

**Architecture:** The scratchpad is a self-contained `Scratchpad` component (fixed-position SVG overlay, `perfect-freehand` for stroke smoothing, draggable via a handle). The highlighter extends `QuestionCard` to capture pointer-up text selections and render multiple highlight ranges; state lives in `practice-session.tsx`. Both features are activated from buttons in `AccommodationToolbar` and reset automatically on question advance.

**Tech Stack:** React, TypeScript, `perfect-freehand` (new dependency), Vitest + Testing Library, Tailwind CSS, shadcn/ui Button.

---

## File Map

| Action | File |
|--------|------|
| **Install** | `package.json` — add `perfect-freehand` |
| **Create** | `components/practice/scratchpad.tsx` — floating draggable drawing panel |
| **Create** | `components/practice/scratchpad.test.tsx` — render + tool tests |
| **Modify** | `components/accommodations/accommodation-toolbar.tsx` — add scratchpad + highlighter buttons |
| **Modify** | `components/practice/question-card.tsx` — extend `FormattedText` for multiple highlights + text-selection handler |
| **Modify** | `app/(practice)/practice/[childId]/practice-session.tsx` — manage `scratchpadOpen`, `highlightMode`, `questionHighlights`, `passageHighlights` state; wire everything together |

---

## Task 1: Install perfect-freehand

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the library**

```bash
npm install perfect-freehand
```

- [ ] **Step 2: Verify it appears in package.json**

```bash
grep perfect-freehand package.json
```

Expected output contains: `"perfect-freehand": "^1.2.2"` (or later)

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add perfect-freehand for scratchpad stroke smoothing"
```

---

## Task 2: Scratchpad Component

**Files:**
- Create: `components/practice/scratchpad.tsx`
- Create: `components/practice/scratchpad.test.tsx`

### Background

`perfect-freehand`'s `getStroke(points, options)` takes an array of `[x, y, pressure]` points and returns outline polygon points `[x, y][]`. We convert those to an SVG path string. Rendering happens in a `<svg>` element (not a bitmap canvas) so strokes are crisp at any DPI and don't need manual scaling.

Panel dragging uses `setPointerCapture` on the drag handle so drag events keep firing even if the pointer leaves the handle. Drawing uses a separate `setPointerCapture` on the SVG.

- [ ] **Step 1: Write the failing test**

Create `components/practice/scratchpad.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Scratchpad } from './scratchpad'

describe('Scratchpad', () => {
  it('renders the scratchpad panel', () => {
    render(<Scratchpad questionId="q1" onClose={vi.fn()} />)
    expect(screen.getByText('✏️ Scratch Pad')).toBeInTheDocument()
  })

  it('calls onClose when × button is clicked', () => {
    const onClose = vi.fn()
    render(<Scratchpad questionId="q1" onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('Close scratchpad'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('undo button is disabled when no strokes exist', () => {
    render(<Scratchpad questionId="q1" onClose={vi.fn()} />)
    expect(screen.getByLabelText('Undo last stroke')).toBeDisabled()
  })

  it('clear button is disabled when no strokes exist', () => {
    render(<Scratchpad questionId="q1" onClose={vi.fn()} />)
    expect(screen.getByLabelText('Clear all strokes')).toBeDisabled()
  })

  it('pen button is active by default', () => {
    render(<Scratchpad questionId="q1" onClose={vi.fn()} />)
    const penBtn = screen.getByLabelText('Pen tool')
    expect(penBtn).toHaveAttribute('data-active', 'true')
  })

  it('eraser button becomes active when clicked', () => {
    render(<Scratchpad questionId="q1" onClose={vi.fn()} />)
    fireEvent.click(screen.getByLabelText('Eraser tool'))
    expect(screen.getByLabelText('Eraser tool')).toHaveAttribute('data-active', 'true')
    expect(screen.getByLabelText('Pen tool')).toHaveAttribute('data-active', 'false')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run components/practice/scratchpad.test.tsx
```

Expected: FAIL — `scratchpad.tsx` does not exist yet.

- [ ] **Step 3: Create `components/practice/scratchpad.tsx`**

```tsx
'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { getStroke } from 'perfect-freehand'
import { Button } from '@/components/ui/button'

type Point = [number, number, number]   // x, y, pressure
type Tool = 'pen' | 'eraser'

const ERASER_RADIUS = 20
const STROKE_OPTIONS = { size: 6, thinning: 0.5, smoothing: 0.5, streamline: 0.5, simulatePressure: true }

function getSvgPath(points: Point[]): string {
  const outline = getStroke(points, STROKE_OPTIONS)
  if (!outline.length) return ''
  const d = outline.reduce((acc, [x0, y0], i, arr) => {
    const [x1, y1] = arr[(i + 1) % arr.length]
    return `${acc} ${x0},${y0} Q${x0},${y0} ${(x0 + x1) / 2},${(y0 + y1) / 2}`
  }, `M${outline[0][0]},${outline[0][1]} Q`)
  return `${d} Z`
}

interface Props {
  questionId: string
  onClose: () => void
}

export function Scratchpad({ questionId, onClose }: Props) {
  const [strokes, setStrokes] = useState<Point[][]>([])
  const [currentPoints, setCurrentPoints] = useState<Point[]>([])
  const [tool, setTool] = useState<Tool>('pen')
  const [pos, setPos] = useState({ x: 16, y: 300 })

  const isDrawing = useRef(false)
  const dragState = useRef<{ startX: number; startY: number; panelX: number; panelY: number } | null>(null)

  // Position bottom-right on first render
  useEffect(() => {
    setPos({ x: Math.max(16, window.innerWidth - 356), y: Math.max(16, window.innerHeight - 320) })
  }, [])

  // Clear strokes when question changes
  useEffect(() => {
    setStrokes([])
    setCurrentPoints([])
  }, [questionId])

  // ── Drawing ──────────────────────────────────────────────────────────────────
  const handleSvgPointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    isDrawing.current = true
    const rect = e.currentTarget.getBoundingClientRect()
    setCurrentPoints([[e.clientX - rect.left, e.clientY - rect.top, e.pressure || 0.5]])
  }, [])

  const handleSvgPointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawing.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const pressure = e.pressure || 0.5

    if (tool === 'eraser') {
      setStrokes(prev => prev.filter(stroke =>
        !stroke.some(([sx, sy]) => Math.hypot(sx - x, sy - y) < ERASER_RADIUS)
      ))
      return
    }
    setCurrentPoints(prev => [...prev, [x, y, pressure]])
  }, [tool])

  const handleSvgPointerUp = useCallback(() => {
    if (!isDrawing.current) return
    isDrawing.current = false
    setCurrentPoints(prev => {
      if (tool === 'pen' && prev.length > 0) {
        setStrokes(s => [...s, prev])
      }
      return []
    })
  }, [tool])

  // ── Panel drag ───────────────────────────────────────────────────────────────
  const handleDragPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragState.current = { startX: e.clientX, startY: e.clientY, panelX: pos.x, panelY: pos.y }
  }, [pos])

  const handleDragPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current) return
    setPos({
      x: dragState.current.panelX + (e.clientX - dragState.current.startX),
      y: dragState.current.panelY + (e.clientY - dragState.current.startY),
    })
  }, [])

  const handleDragPointerUp = useCallback(() => { dragState.current = null }, [])

  const handleUndo = () => setStrokes(prev => prev.slice(0, -1))
  const handleClear = () => setStrokes([])

  return (
    <div
      className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-xl flex flex-col select-none"
      style={{ left: pos.x, top: pos.y, width: 320, height: 280 }}
      data-testid="scratchpad"
    >
      {/* Drag handle + toolbar */}
      <div
        className="flex items-center gap-1 px-2 py-1.5 bg-gray-100 rounded-t-lg border-b cursor-grab active:cursor-grabbing"
        onPointerDown={handleDragPointerDown}
        onPointerMove={handleDragPointerMove}
        onPointerUp={handleDragPointerUp}
      >
        <span className="text-xs text-gray-500 mr-1 flex-1">✏️ Scratch Pad</span>
        <Button
          size="sm" variant={tool === 'pen' ? 'default' : 'outline'}
          className="h-6 px-2 text-xs"
          aria-label="Pen tool" data-active={String(tool === 'pen')}
          onPointerDown={e => e.stopPropagation()}
          onClick={() => setTool('pen')}
        >Pen</Button>
        <Button
          size="sm" variant={tool === 'eraser' ? 'default' : 'outline'}
          className="h-6 px-2 text-xs"
          aria-label="Eraser tool" data-active={String(tool === 'eraser')}
          onPointerDown={e => e.stopPropagation()}
          onClick={() => setTool('eraser')}
        >Erase</Button>
        <Button
          size="sm" variant="outline" className="h-6 px-2 text-xs"
          aria-label="Undo last stroke"
          disabled={strokes.length === 0}
          onPointerDown={e => e.stopPropagation()}
          onClick={handleUndo}
        >↩</Button>
        <Button
          size="sm" variant="outline" className="h-6 px-2 text-xs"
          aria-label="Clear all strokes"
          disabled={strokes.length === 0}
          onPointerDown={e => e.stopPropagation()}
          onClick={handleClear}
        >Clear</Button>
        <Button
          size="sm" variant="ghost" className="h-6 px-2 text-xs"
          aria-label="Close scratchpad"
          onPointerDown={e => e.stopPropagation()}
          onClick={onClose}
        >✕</Button>
      </div>

      {/* Drawing surface */}
      <svg
        className="flex-1 w-full rounded-b-lg bg-white"
        style={{ touchAction: 'none', cursor: tool === 'eraser' ? 'cell' : 'crosshair' }}
        onPointerDown={handleSvgPointerDown}
        onPointerMove={handleSvgPointerMove}
        onPointerUp={handleSvgPointerUp}
        onPointerLeave={handleSvgPointerUp}
        aria-label="Drawing canvas"
      >
        {strokes.map((pts, i) => (
          <path key={i} d={getSvgPath(pts)} fill="currentColor" className="text-gray-900" />
        ))}
        {currentPoints.length > 0 && tool === 'pen' && (
          <path d={getSvgPath(currentPoints)} fill="currentColor" className="text-gray-900" />
        )}
      </svg>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run components/practice/scratchpad.test.tsx
```

Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add components/practice/scratchpad.tsx components/practice/scratchpad.test.tsx
git commit -m "feat(scratchpad): freehand drawing overlay with pen/eraser/undo"
```

---

## Task 3: Wire Scratchpad into Practice Session

**Files:**
- Modify: `components/accommodations/accommodation-toolbar.tsx`
- Modify: `app/(practice)/practice/[childId]/practice-session.tsx`

### Background

`AccommodationToolbar` already renders a cluster of accessibility buttons. We add the scratchpad toggle here. The scratchpad button lives in the toolbar alongside TTS, contrast, etc. It is hidden when `reduce_distractions` is on (same as all other toolbar extras).

`practice-session.tsx` holds `scratchpadOpen` state and renders `<Scratchpad>` at the root of the session div (outside the question card) so it floats above everything.

- [ ] **Step 1: Extend `AccommodationToolbar` props and add the button**

Current file: `components/accommodations/accommodation-toolbar.tsx`

Replace the interface and the left button cluster:

```tsx
'use client'
import { useAccommodations } from '@/lib/accommodations/context'
import { TTSButton } from './tts-button'
import { TTSEngine } from '@/lib/tts/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface Props {
  engine: TTSEngine
  questionText: string
  progress: { current: number; total: number }
  onBoundary?: (charIndex: number, charLength: number) => void
  onSpeakEnd?: () => void
  scratchpadOpen?: boolean
  onScratchpadToggle?: () => void
  highlightMode?: boolean
  onHighlightModeToggle?: () => void
}

export function AccommodationToolbar({
  engine, questionText, progress, onBoundary, onSpeakEnd,
  scratchpadOpen, onScratchpadToggle,
  highlightMode, onHighlightModeToggle,
}: Props) {
  const { state, update } = useAccommodations()
  const percent = Math.round((progress.current / progress.total) * 100)

  function handleHighlightToggle() {
    if (!highlightMode && state.bionic_reading) {
      update({ bionic_reading: false })
    }
    onHighlightModeToggle?.()
  }

  return (
    <div className={`flex items-center gap-2 flex-wrap py-2 ${state.reduce_distractions ? 'justify-end' : 'justify-between'}`}>
      <div className="flex items-center gap-2">
        <TTSButton text={questionText} engine={engine} label="Read Question" onBoundary={onBoundary} onSpeakEnd={onSpeakEnd} />
        {!state.reduce_distractions && (
          <>
            <Button
              variant={state.high_contrast ? 'default' : 'outline'}
              size="sm"
              onClick={() => update({ high_contrast: !state.high_contrast })}
              aria-label="Toggle high contrast"
            >🌓</Button>
            <Button
              variant={state.dyslexia_font ? 'default' : 'outline'}
              size="sm"
              onClick={() => update({ dyslexia_font: !state.dyslexia_font })}
              aria-label="Toggle dyslexia font"
            >Aa</Button>
            <Button
              variant={state.bionic_reading ? 'default' : 'outline'}
              size="sm"
              onClick={() => update({ bionic_reading: !state.bionic_reading })}
              aria-label="Toggle bionic reading"
              title="Bionic Reading: bold the first letters of each word"
            >B</Button>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled={state.large_text === 0}
                onClick={() => update({ large_text: (state.large_text - 1) as 0 | 1 | 2 })}
                aria-label="Decrease text size">A-</Button>
              <Button variant="outline" size="sm" disabled={state.large_text === 2}
                onClick={() => update({ large_text: (state.large_text + 1) as 0 | 1 | 2 })}
                aria-label="Increase text size">A+</Button>
            </div>
            <Button
              variant={highlightMode ? 'default' : 'outline'}
              size="sm"
              onClick={handleHighlightToggle}
              aria-label="Toggle highlight mode"
              title="Highlight text"
            >🖍</Button>
            <Button
              variant={scratchpadOpen ? 'default' : 'outline'}
              size="sm"
              onClick={onScratchpadToggle}
              aria-label="Toggle scratchpad"
              title="Open scratch pad"
            >✏️</Button>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline">{progress.current} / {progress.total}</Badge>
        <Progress value={percent} className="w-20 h-2" />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add state and wire into `practice-session.tsx`**

In `app/(practice)/practice/[childId]/practice-session.tsx`:

Add the import at the top (after the existing imports):
```tsx
import { Scratchpad } from '@/components/practice/scratchpad'
```

Add state after the existing `highlightRange` state (around line 88):
```tsx
const [scratchpadOpen, setScratchpadOpen] = useState(false)
```

In the `advance` callback, add after `setHighlightRange(null)`:
```tsx
// scratchpad clears via questionId key — no explicit reset needed
```

In the toolbar JSX (around line 371), add the new props:
```tsx
<AccommodationToolbar
  engine={ttsEngine}
  questionText={
    (languageLevel !== 'standard' && q.simplified_text)
      ? q.simplified_text
      : q.question_text
  }
  progress={{ current: currentIndex + 1, total: questions.length }}
  onBoundary={(start, length) => setHighlightRange({ start, length })}
  onSpeakEnd={() => setHighlightRange(null)}
  scratchpadOpen={scratchpadOpen}
  onScratchpadToggle={() => setScratchpadOpen(o => !o)}
/>
```

Render the `Scratchpad` inside the outer `<div className="max-w-2xl ...">`, after the `AccommodationToolbar` block and before `QuestionTimer`:

```tsx
{scratchpadOpen && (
  <Scratchpad
    key={q.id}
    questionId={q.id}
    onClose={() => setScratchpadOpen(false)}
  />
)}
```

- [ ] **Step 3: Run type-check**

```bash
npx tsc --noEmit 2>&1 | grep -v "\.test\."
```

Expected: no errors in non-test files.

- [ ] **Step 4: Commit**

```bash
git add components/accommodations/accommodation-toolbar.tsx app/(practice)/practice/[childId]/practice-session.tsx
git commit -m "feat(scratchpad): wire scratchpad button into practice session toolbar"
```

---

## Task 4: Extend FormattedText for Multiple User Highlights

**Files:**
- Modify: `components/practice/question-card.tsx`
- Modify: `components/practice/question-card.test.tsx`

### Background

`FormattedText` currently renders either bionic text or a single TTS highlight range. We extend it to also render multiple persistent user highlight ranges (`bg-yellow-200`, lighter than the TTS `bg-yellow-300`).

The key function `renderSegments` splits a line of text at all highlight boundaries and emits `<span>` or `<mark>` elements. TTS ranges and user ranges are merged into a single boundary set.

We also add `data-highlight-container` to the `<p>` wrapping the question text so Task 5's TreeWalker can scope itself correctly.

- [ ] **Step 1: Add new tests to `question-card.test.tsx`**

Append to the existing `describe('QuestionCard')` block in `components/practice/question-card.test.tsx`:

```tsx
  it('renders a user highlight as a mark element', () => {
    render(
      <QuestionCard
        question={mockQuestion}
        simplified={false}
        userHighlights={[{ start: 8, end: 9 }]}
      />
    )
    const mark = document.querySelector('mark.bg-yellow-200')
    expect(mark).not.toBeNull()
    expect(mark?.textContent).toBe('2')
  })

  it('renders multiple user highlights', () => {
    render(
      <QuestionCard
        question={mockQuestion}
        simplified={false}
        userHighlights={[{ start: 0, end: 4 }, { start: 8, end: 9 }]}
      />
    )
    const marks = document.querySelectorAll('mark.bg-yellow-200')
    expect(marks).toHaveLength(2)
  })

  it('does not render user highlight marks when userHighlights is empty', () => {
    render(<QuestionCard question={mockQuestion} simplified={false} userHighlights={[]} />)
    expect(document.querySelector('mark.bg-yellow-200')).toBeNull()
  })
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run components/practice/question-card.test.tsx
```

Expected: the 3 new tests FAIL — `userHighlights` prop is not accepted yet.

- [ ] **Step 3: Implement highlight rendering in `question-card.tsx`**

Replace the entire file content:

```tsx
'use client'

import { Card, CardContent } from '@/components/ui/card'
import { OnScreenCalculator } from './on-screen-calculator'
import type { Question } from '@/lib/practice/question-types'
import { sanitizeSvg } from '@/lib/svg/sanitize'
import { useAccommodations } from '@/lib/accommodations/context'
import { TTSButton } from '@/components/accommodations/tts-button'
import type { TTSEngine } from '@/lib/tts/types'

export type { Question }

type UserHighlight = { start: number; end: number }

interface Props {
  question: Question
  simplified: boolean
  highlightRange?: { start: number; length: number } | null  // TTS word-tracking
  userHighlights?: UserHighlight[]
  highlightMode?: boolean
  onQuestionHighlightsChange?: (h: UserHighlight[]) => void
  onPassageHighlightsChange?: (h: UserHighlight[]) => void
  passageHighlights?: UserHighlight[]
  ttsEngine?: TTSEngine | null
}

// Bionic Reading: bold the first N characters of each word (N = min(ceil(len/2), 4))
function BionicText({ text }: { text: string }) {
  const tokens = text.split(/(\s+)/)
  return (
    <>
      {tokens.map((token, i) => {
        if (/^\s+$/.test(token)) return <span key={i}>{token}</span>
        const boldLen = Math.min(Math.ceil(token.length / 2), 4)
        return (
          <span key={i}>
            <strong>{token.slice(0, boldLen)}</strong>{token.slice(boldLen)}
          </span>
        )
      })}
    </>
  )
}

// Splits a text segment into highlighted/plain runs and renders them.
function renderSegments(
  text: string,
  userHighlights: UserHighlight[],
  ttsHighlight: { start: number; length: number } | null
) {
  const boundaries = new Set<number>([0, text.length])
  userHighlights.forEach(h => { boundaries.add(h.start); boundaries.add(h.end) })
  if (ttsHighlight) {
    boundaries.add(ttsHighlight.start)
    boundaries.add(ttsHighlight.start + ttsHighlight.length)
  }

  const sorted = Array.from(boundaries).filter(b => b >= 0 && b <= text.length).sort((a, b) => a - b)

  return sorted.slice(0, -1).map((start, i) => {
    const end = sorted[i + 1]
    const seg = text.slice(start, end)
    const isTTS = ttsHighlight && start >= ttsHighlight.start && end <= ttsHighlight.start + ttsHighlight.length
    const isUser = userHighlights.some(h => start >= h.start && end <= h.end)

    if (isTTS) {
      return (
        <mark key={i} className="bg-yellow-300 dark:bg-yellow-500/50 rounded px-0.5 not-italic">
          {seg}
        </mark>
      )
    }
    if (isUser) {
      return (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-600/30 rounded px-0.5 not-italic" data-user-highlight="true">
          {seg}
        </mark>
      )
    }
    return <span key={i}>{seg}</span>
  })
}

function FormattedText({
  text,
  ttsHighlight,
  userHighlights,
  bionic,
}: {
  text: string
  ttsHighlight?: { start: number; length: number } | null
  userHighlights?: UserHighlight[]
  bionic: boolean
}) {
  let offset = 0
  const lineGroups = text.split('\n\n').map((para, pi) => {
    if (pi > 0) offset += 2
    return para.split('\n').map((line, li) => {
      if (li > 0) offset += 1
      const lineOffset = offset
      offset += line.length
      return { text: line, offset: lineOffset }
    })
  })

  return (
    <>
      {lineGroups.map((paraLines, pi) => (
        <span key={pi}>
          {pi > 0 && <br />}
          {paraLines.map(({ text: line, offset: lineOffset }, li) => {
            if (bionic) {
              return (
                <span key={li}>
                  {li > 0 && <br />}
                  <BionicText text={line} />
                </span>
              )
            }

            // Translate global highlights to line-local offsets
            const localUser = (userHighlights ?? [])
              .map(h => ({ start: h.start - lineOffset, end: h.end - lineOffset }))
              .filter(h => h.end > 0 && h.start < line.length)
              .map(h => ({ start: Math.max(0, h.start), end: Math.min(line.length, h.end) }))

            const localTTS = ttsHighlight &&
              ttsHighlight.start >= lineOffset &&
              ttsHighlight.start < lineOffset + line.length
                ? { start: ttsHighlight.start - lineOffset, length: ttsHighlight.length }
                : null

            return (
              <span key={li}>
                {li > 0 && <br />}
                {renderSegments(line, localUser, localTTS)}
              </span>
            )
          })}
        </span>
      ))}
    </>
  )
}

// Question-type badge for reading comprehension questions
const QUESTION_WORD_BADGES: { pattern: RegExp; label: string; className: string }[] = [
  { pattern: /\bwho\b/i,   label: 'Who',   className: 'bg-purple-100 text-purple-800' },
  { pattern: /\bwhat\b/i,  label: 'What',  className: 'bg-blue-100 text-blue-800' },
  { pattern: /\bwhere\b/i, label: 'Where', className: 'bg-green-100 text-green-800' },
  { pattern: /\bwhen\b/i,  label: 'When',  className: 'bg-yellow-100 text-yellow-800' },
  { pattern: /\bwhy\b/i,   label: 'Why',   className: 'bg-orange-100 text-orange-800' },
  { pattern: /\bhow\b/i,   label: 'How',   className: 'bg-pink-100 text-pink-800' },
]

function QuestionTypeBadge({ questionText }: { questionText: string }) {
  const match = QUESTION_WORD_BADGES.find(b => b.pattern.test(questionText))
  if (!match) return null
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${match.className}`}>
      {match.label}
    </span>
  )
}

export function QuestionCard({
  question, simplified, highlightRange, userHighlights, highlightMode,
  onQuestionHighlightsChange, passageHighlights, onPassageHighlightsChange,
  ttsEngine,
}: Props) {
  const { state } = useAccommodations()
  const text = (simplified && question.simplified_text) ? question.simplified_text : question.question_text
  return (
    <div className="space-y-3">
      {question.reading_passage && (
        <Card className="border-blue-200 bg-blue-50/40 dark:border-blue-900 dark:bg-blue-950/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                Reading Passage
              </p>
              {ttsEngine && (
                <TTSButton text={question.reading_passage} engine={ttsEngine} label="Read Passage" />
              )}
            </div>
            <div
              className="max-h-64 overflow-y-auto pr-1 text-sm leading-relaxed reading-text text-foreground/90"
              data-highlight-container="passage"
              onPointerUp={highlightMode ? (e) => handleTextSelection(e, question.reading_passage!, passageHighlights ?? [], onPassageHighlightsChange) : undefined}
            >
              <FormattedText
                text={question.reading_passage}
                userHighlights={passageHighlights}
                bionic={state.bionic_reading}
              />
            </div>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardContent className="p-6 space-y-3">
          <QuestionTypeBadge questionText={text} />
          <p
            className="text-lg font-medium reading-text"
            data-highlight-container="question"
            onPointerUp={highlightMode ? (e) => handleTextSelection(e, text, userHighlights ?? [], onQuestionHighlightsChange) : undefined}
            style={highlightMode ? { cursor: 'text', userSelect: 'text' } : undefined}
          >
            <FormattedText
              text={text}
              ttsHighlight={highlightRange}
              userHighlights={userHighlights}
              bionic={state.bionic_reading}
            />
          </p>
          {question.image_svg && (
            <div className="flex justify-center my-3">
              <div
                data-testid="svg-container"
                className="max-w-xs w-full rounded border border-border p-2 bg-muted/30"
                dangerouslySetInnerHTML={{ __html: sanitizeSvg(question.image_svg) }}
              />
            </div>
          )}
          <OnScreenCalculator hidden={!question.calculator_allowed} />
        </CardContent>
      </Card>
    </div>
  )
}

// ── Text selection → character offset ──────────────────────────────────────────

function getCharOffset(container: Element, node: Node, offset: number): number {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  let count = 0
  while (walker.nextNode()) {
    if (walker.currentNode === node) return count + offset
    count += (walker.currentNode as Text).length
  }
  return count
}

function handleTextSelection(
  e: React.PointerEvent,
  _fullText: string,
  current: UserHighlight[],
  onChange?: (h: UserHighlight[]) => void
) {
  if (!onChange) return
  const container = e.currentTarget as Element
  const sel = window.getSelection()

  if (!sel || !sel.rangeCount) return

  if (sel.isCollapsed) {
    // Tap on existing highlight → remove it
    const target = e.target as Element
    if (target.closest('[data-user-highlight]')) {
      const range = document.caretRangeFromPoint?.(e.clientX, e.clientY)
      if (range) {
        const pos = getCharOffset(container, range.startContainer, range.startOffset)
        onChange(current.filter(h => !(h.start <= pos && h.end > pos)))
      }
    }
    sel.removeAllRanges()
    return
  }

  const range = sel.getRangeAt(0)
  if (!container.contains(range.commonAncestorContainer)) {
    sel.removeAllRanges()
    return
  }

  const start = getCharOffset(container, range.startContainer, range.startOffset)
  const end = getCharOffset(container, range.endContainer, range.endOffset)
  if (end > start) onChange([...current, { start, end }])
  sel.removeAllRanges()
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run components/practice/question-card.test.tsx
```

Expected: all tests PASS (existing 5 + new 3 = 8 total).

- [ ] **Step 5: Commit**

```bash
git add components/practice/question-card.tsx components/practice/question-card.test.tsx
git commit -m "feat(highlighter): extend FormattedText to render multiple user highlight ranges"
```

---

## Task 5: Wire Highlight Mode into Practice Session

**Files:**
- Modify: `app/(practice)/practice/[childId]/practice-session.tsx`

### Background

This task wires the highlight mode state and highlight arrays into the session. `highlightMode` toggles the interactive selection behaviour in `QuestionCard`. `questionHighlights` and `passageHighlights` hold the user's marks and are cleared on question advance. Bionic mutual exclusion is already handled in `AccommodationToolbar` (Task 3).

- [ ] **Step 1: Add highlight state to `practice-session.tsx`**

After the existing `const [scratchpadOpen, setScratchpadOpen] = useState(false)` line, add:

```tsx
const [highlightMode, setHighlightMode] = useState(false)
const [questionHighlights, setQuestionHighlights] = useState<Array<{ start: number; end: number }>>([])
const [passageHighlights, setPassageHighlights] = useState<Array<{ start: number; end: number }>>([])
```

- [ ] **Step 2: Clear highlights on question advance**

Inside the `advance` callback, after `setHighlightRange(null)`, add:

```tsx
setQuestionHighlights([])
setPassageHighlights([])
```

- [ ] **Step 3: Pass highlight mode toggle to toolbar**

In the `<AccommodationToolbar>` JSX, add:

```tsx
highlightMode={highlightMode}
onHighlightModeToggle={() => setHighlightMode(m => !m)}
```

- [ ] **Step 4: Pass highlight state to `QuestionCard`**

Replace the existing `<QuestionCard ...>` line with:

```tsx
<QuestionCard
  question={q}
  simplified={languageLevel !== 'standard'}
  highlightRange={highlightRange}
  ttsEngine={ttsEngine}
  highlightMode={highlightMode}
  userHighlights={questionHighlights}
  onQuestionHighlightsChange={setQuestionHighlights}
  passageHighlights={passageHighlights}
  onPassageHighlightsChange={setPassageHighlights}
/>
```

- [ ] **Step 5: Run type-check**

```bash
npx tsc --noEmit 2>&1 | grep -v "\.test\."
```

Expected: no errors in non-test files.

- [ ] **Step 6: Run all practice-related tests**

```bash
npx vitest run components/practice/
```

Expected: scratchpad tests pass, question-card tests pass.

- [ ] **Step 7: Bump footer version**

In `components/marketing/landing-footer.tsx`, increment the version string:
- Find: `v2026.05.17.4`
- Replace with: `v2026.05.18.1`

- [ ] **Step 8: Commit and push**

```bash
git add app/(practice)/practice/[childId]/practice-session.tsx components/marketing/landing-footer.tsx
git commit -m "feat(highlighter): wire highlight mode and user highlights into practice session"
git push
```

---

## Self-Review Checklist

After all 5 tasks are complete, verify:

- [ ] `perfect-freehand` is in `package.json` and imports correctly
- [ ] Scratchpad opens/closes from toolbar button; drawing works with mouse and touch
- [ ] Eraser removes strokes on drag; Undo removes last stroke; Clear removes all
- [ ] Scratchpad resets when advancing to next question (via `key={q.id}`)
- [ ] Highlighter button appears in toolbar alongside other tools
- [ ] Activating highlight mode when bionic reading is on turns bionic off
- [ ] Drag-to-select text in highlight mode adds a yellow highlight
- [ ] Tap on existing highlight removes it
- [ ] Highlights clear on question advance
- [ ] Highlights work on both question text and reading passage
- [ ] Both features hidden when `reduce_distractions` is enabled
- [ ] `npx tsc --noEmit` passes with no errors in non-test files
