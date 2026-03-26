import { Card, CardContent } from '@/components/ui/card'
import { OnScreenCalculator } from './on-screen-calculator'
import type { Question } from '@/lib/practice/question-types'
import { sanitizeSvg } from '@/lib/svg/sanitize'

export type { Question }

interface Props {
  question: Question
  simplified: boolean
  highlightRange?: { start: number; length: number } | null
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

export function QuestionCard({ question, simplified, highlightRange }: Props) {
  const text = (simplified && question.simplified_text) ? question.simplified_text : question.question_text
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <p className="text-lg font-medium leading-relaxed">
          <HighlightedText text={text} highlight={highlightRange} />
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
  )
}
