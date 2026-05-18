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
