import { Card, CardContent } from '@/components/ui/card'
import { OnScreenCalculator } from './on-screen-calculator'
import type { Question } from '@/lib/practice/question-types'
import { sanitizeSvg } from '@/lib/svg/sanitize'
import { useAccommodations } from '@/lib/accommodations/context'

export type { Question }

interface Props {
  question: Question
  simplified: boolean
  highlightRange?: { start: number; length: number } | null
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

function HighlightedText({ text, highlight }: { text: string; highlight?: { start: number; length: number } | null }) {
  if (!highlight) return <>{text}</>
  const { start, length } = highlight
  return (
    <>
      {text.slice(0, start)}
      <mark className="bg-yellow-300 dark:bg-yellow-500/50 rounded px-0.5 not-italic">{text.slice(start, start + length)}</mark>
      {text.slice(start + length)}
    </>
  )
}

// Render text with \n\n as paragraph breaks and \n as line breaks
function FormattedText({
  text,
  highlight,
  bionic,
}: {
  text: string
  highlight?: { start: number; length: number } | null
  bionic: boolean
}) {
  // Precompute each line's start offset in the full string so we can map
  // the global charIndex from Web Speech API onboundary to the correct line.
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
            const localHighlight =
              highlight && highlight.start >= lineOffset && highlight.start < lineOffset + line.length
                ? { start: highlight.start - lineOffset, length: highlight.length }
                : null
            return (
              <span key={li}>
                {li > 0 && <br />}
                {bionic ? <BionicText text={line} /> : <HighlightedText text={line} highlight={localHighlight} />}
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

export function QuestionCard({ question, simplified, highlightRange }: Props) {
  const { state } = useAccommodations()
  const text = (simplified && question.simplified_text) ? question.simplified_text : question.question_text
  return (
    <div className="space-y-3">
      {question.reading_passage && (
        <Card className="border-blue-200 bg-blue-50/40 dark:border-blue-900 dark:bg-blue-950/20">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-3">
              Reading Passage
            </p>
            <div className="max-h-64 overflow-y-auto pr-1 text-sm leading-relaxed reading-text text-foreground/90">
              <FormattedText text={question.reading_passage} bionic={state.bionic_reading} />
            </div>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardContent className="p-6 space-y-3">
          <QuestionTypeBadge questionText={text} />
          <p className="text-lg font-medium reading-text">
            <FormattedText text={text} highlight={highlightRange} bionic={state.bionic_reading} />
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
