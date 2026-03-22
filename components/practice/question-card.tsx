import { Card, CardContent } from '@/components/ui/card'
import { OnScreenCalculator } from './on-screen-calculator'

interface Choice {
  id: string
  text: string
  is_correct: boolean
}

export interface Question {
  id: string
  question_text: string
  simplified_text: string | null
  answer_type: 'multiple_choice' | 'true_false'
  choices: Choice[]
  hint_1: string | null
  hint_2: string | null
  hint_3: string | null
  calculator_allowed: boolean
}

interface Props {
  question: Question
  simplified: boolean
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
