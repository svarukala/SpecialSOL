# Scratchpad & Highlighter — Design Spec

**Date:** 2026-05-18
**Status:** Approved

---

## Overview

Two in-session study tools for children during practice:

1. **Scratchpad** — floating draggable canvas for freehand working-out (math scratch work, diagrams)
2. **Highlighter** — drag-to-highlight mode for marking up question text and reading passages

Both are activated from the accommodation toolbar, clear automatically on question advance, and are hidden when `reduce_distractions` is enabled.

---

## Scratchpad

### UX

- A pencil button (✏️) in the accommodation toolbar opens the scratchpad overlay.
- The overlay is a floating, draggable panel (~320×280px) positioned bottom-right by default — chosen to avoid covering the question and answer area in the typical layout.
- A drag handle bar at the top lets the child reposition it anywhere on screen.
- The panel has a compact toolbar across the top: **Pen** (default) | **Eraser** | **Undo** | **Clear** | **×** (close).
- Closing resets the drawing. Advancing to the next question also resets it (controlled by a `key` prop keyed to `questionId`).

### Drawing

- Uses [`perfect-freehand`](https://github.com/steveruizok/perfect-freehand) for stroke smoothing.
- On **touch**: reads pointer pressure for natural line weight variation (thicker slow strokes, tapered ends).
- On **mouse**: simulates pressure using stroke velocity so lines look hand-drawn rather than mechanical.
- Strokes are rendered as SVG `<path>` elements (not a bitmap canvas) — crisp at any screen DPI.
- Undo pops the last stroke from the stroke history array. Clear empties the array.
- Eraser: pointer events within a radius of existing stroke points remove those strokes.

### State

```ts
type Stroke = { points: [number, number, number][]; color: string }
// points: [x, y, pressure]

// In Scratchpad component (local state only — no persistence)
strokes: Stroke[]
redoStack: Stroke[]   // cleared on any new stroke
activeTool: 'pen' | 'eraser'
isDragging: boolean   // for panel repositioning
```

---

## Highlighter

### UX

- A highlighter button (🖍) in the accommodation toolbar toggles **highlight mode** on/off.
- The button shows as active (filled background) when mode is on.
- In highlight mode, the child drags across text in the question or reading passage — on pointer-up, the selected range is highlighted yellow (`bg-yellow-200`).
- Multiple non-overlapping highlights are supported.
- Tapping/clicking an existing highlight removes it.
- Toggling highlight mode off does not clear highlights — they persist until question advance.
- All highlights clear on question advance.

### Bionic Reading Mutual Exclusion

Bionic reading and highlight mode cannot be active simultaneously — bionic's split-word spans (`<strong>bo</strong>ld`) break the character-offset mapping that text selection relies on.

**Rule:** Activating highlight mode automatically sets `bionic_reading` to `false` in the accommodation context. When highlight mode is turned off, bionic reading is **not** automatically restored (the child re-enables it manually if they want it back). This avoids surprising re-activation mid-question.

### Text Selection → Character Offsets

`window.getSelection()` returns a DOM `Range`. To map it back to character offsets in the original question string:

1. On pointer-up (when in highlight mode), read `window.getSelection()`.
2. Walk the DOM with `TreeWalker` (`NodeFilter.SHOW_TEXT`) from the text container root, accumulating character lengths until the `startContainer` and `endContainer` nodes are reached.
3. Add `startOffset` / `endOffset` from the Range to get absolute character positions in the full string.
4. Store as `{ start: number; end: number }`.

The text container root has a `data-highlight-container` attribute so the walker is scoped and doesn't traverse the whole page.

### Rendering Multiple Highlights

`FormattedText` currently supports a single `highlight?: { start; length }` range (for TTS). Extend it to accept both:

```ts
interface FormattedTextProps {
  text: string
  ttsHighlight?: { start: number; length: number } | null  // TTS word-tracking
  userHighlights?: Array<{ start: number; end: number }>   // user-initiated
  bionic: boolean
}
```

Rendering splits the string into segments at all highlight boundaries, applies `bg-yellow-200` for user highlights and `bg-yellow-400` for the TTS cursor (slightly darker to distinguish them). TTS highlight renders on top when ranges overlap.

---

## Files

| Action | File | What changes |
|--------|------|-------------|
| **Create** | `components/practice/scratchpad.tsx` | Floating draggable panel + SVG canvas + perfect-freehand drawing logic |
| **Modify** | `components/accommodations/accommodation-toolbar.tsx` | Add ✏️ scratchpad button + 🖍 highlighter toggle button; pass `onScratchpadOpen`, `highlightMode`, `onHighlightModeToggle` props |
| **Modify** | `components/practice/question-card.tsx` | Extend `FormattedText` to render multiple user highlight ranges; add `data-highlight-container`; accept `userHighlights` + `highlightMode` + `onHighlightsChange` props; handle pointer-up text selection in highlight mode |
| **Modify** | `app/(practice)/practice/[childId]/practice-session.tsx` | Add `scratchpadOpen`, `highlightMode`, `userHighlights` state; wire to toolbar and question card; clear highlights on advance; pass `questionId` as key to scratchpad |

---

## What Does NOT Change

- DB schema — no persistence, all state is ephemeral per question
- Session scoring, answer recording, TTS — unaffected
- `reduce_distractions` accommodation — both buttons already hidden behind that flag
- Reading passage rendering — gets the same highlight treatment as question text (same `FormattedText` component)

---

## Out of Scope

- Colour picker for highlighter (yellow only for now)
- Saving scratchpad drawings as images
- Typed text in scratchpad
- Shapes or rulers in scratchpad
- Highlight persistence across sessions
