'use client'

import { useState, useEffect, useCallback } from 'react'
import { WhTypeBadge } from './wh-type-badge'
import type { WhType, QuestionItem } from './types'

interface Props {
  childId: string
  whType: WhType
  initialCorrect: number
  initialAnswered: number
}

type Phase = 'loading' | 'question' | 'feedback' | 'summary'

interface FeedbackState {
  isCorrect: boolean
  correctAnswer: string
  selectedAnswer: string
}

export function WhQuestionDrill({ childId, whType, initialCorrect, initialAnswered }: Props) {
  const [questions, setQuestions] = useState<QuestionItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('loading')
  const [hintsShown, setHintsShown] = useState(0)
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [totalHintsUsed, setTotalHintsUsed] = useState(0)
  const [isNewlyMastered, setIsNewlyMastered] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchQuestions = useCallback(async () => {
    setPhase('loading')
    setError(null)
    try {
      const res = await fetch(
        `/api/question-quest/questions?childId=${childId}&whType=${whType}&count=10`
      )
      if (!res.ok) throw new Error('Failed to load questions')
      const data = await res.json() as { questions: QuestionItem[] }
      setQuestions(data.questions)
      setCurrentIndex(0)
      setSessionCorrect(0)
      setTotalHintsUsed(0)
      setHintsShown(0)
      setFeedback(null)
      setIsNewlyMastered(false)
      setPhase('question')
    } catch {
      setError('Could not load questions. Please try again.')
      setPhase('question')
    }
  }, [childId, whType])

  useEffect(() => {
    fetchQuestions()
  }, [fetchQuestions])

  async function handleAnswer(answer: string) {
    if (phase !== 'question') return
    const question = questions[currentIndex]

    try {
      const res = await fetch('/api/question-quest/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId,
          questionId: question.id,
          answerGiven: answer,
          hintsUsed: hintsShown,
        }),
      })
      const data = await res.json() as { isCorrect: boolean; correctAnswer: string }

      const newSessionCorrect = sessionCorrect + (data.isCorrect ? 1 : 0)
      const newTotalAnswered = initialAnswered + currentIndex + 1
      const newTotalCorrect = initialCorrect + newSessionCorrect

      setFeedback({ isCorrect: data.isCorrect, correctAnswer: data.correctAnswer, selectedAnswer: answer })
      setSessionCorrect(newSessionCorrect)
      setTotalHintsUsed((h) => h + hintsShown)
      setPhase('feedback')

      const alreadyMastered = initialAnswered >= 10 && initialCorrect / initialAnswered >= 0.8
      if (!alreadyMastered && newTotalAnswered >= 10 && newTotalCorrect / newTotalAnswered >= 0.8) {
        setIsNewlyMastered(true)
      }

      setTimeout(() => {
        if (currentIndex + 1 >= questions.length) {
          setPhase('summary')
        } else {
          setCurrentIndex((i) => i + 1)
          setHintsShown(0)
          setFeedback(null)
          setPhase('question')
        }
      }, 1200)
    } catch {
      setError('Failed to submit answer. Please try again.')
    }
  }

  function handleShowHint() {
    if (hintsShown < 2) setHintsShown((h) => h + 1)
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center space-y-3">
        <p className="text-red-700 text-sm">{error}</p>
        <button
          onClick={fetchQuestions}
          className="inline-flex items-center justify-center rounded-lg bg-red-600 text-white px-4 h-8 text-sm font-semibold hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (phase === 'loading') {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
        Loading questions...
      </div>
    )
  }

  if (phase === 'summary') {
    const accuracy = Math.round((sessionCorrect / questions.length) * 100)
    return (
      <div className="space-y-6 text-center">
        {isNewlyMastered && (
          <div className="rounded-xl border-2 border-green-300 bg-green-50 p-6 space-y-2">
            <div className="text-4xl">🎉</div>
            <p className="text-xl font-bold text-green-700">You Mastered {whType.charAt(0).toUpperCase() + whType.slice(1)} Questions!</p>
            <p className="text-sm text-green-600">The next level is now unlocked. Keep going!</p>
          </div>
        )}

        <div className="rounded-xl border bg-muted/30 p-6 space-y-2">
          <p className="text-3xl font-bold">{sessionCorrect}/{questions.length}</p>
          <p className="text-muted-foreground text-sm">{accuracy}% accuracy this session</p>
          {totalHintsUsed > 0 && (
            <p className="text-muted-foreground text-xs">{totalHintsUsed} hint{totalHintsUsed !== 1 ? 's' : ''} used</p>
          )}
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={fetchQuestions}
            className="inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground px-5 h-10 text-sm font-semibold hover:bg-primary/80 transition-colors"
          >
            Practice Again
          </button>
          <a
            href={`/question-quest?childId=${childId}`}
            className="inline-flex items-center justify-center rounded-xl border px-5 h-10 text-sm font-semibold hover:bg-muted/50 transition-colors"
          >
            Choose Another
          </a>
        </div>
      </div>
    )
  }

  const question = questions[currentIndex]
  if (!question) return null

  const progressCount = currentIndex + (phase === 'feedback' ? 1 : 0)

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Question {currentIndex + 1} of {questions.length}</span>
          <span>{sessionCorrect} correct so far</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(progressCount / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <WhTypeBadge whType={whType} />

      <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
        <p className="text-sm leading-relaxed">{question.scenario}</p>
        <p className="font-semibold text-base">{question.question}</p>

        {hintsShown >= 1 && question.hint1 && (
          <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-2 text-sm text-yellow-800">
            💡 {question.hint1}
          </div>
        )}
        {hintsShown >= 2 && question.hint2 && (
          <div className="rounded-lg bg-orange-50 border border-orange-200 px-3 py-2 text-sm text-orange-800">
            🔍 {question.hint2}
          </div>
        )}
      </div>

      <div className="space-y-2">
        {question.options.map((option) => {
          let btnClass = 'w-full text-left rounded-xl border px-4 py-3 text-sm font-medium transition-colors '
          if (phase === 'feedback' && feedback) {
            if (option === feedback.correctAnswer) {
              btnClass += 'border-green-400 bg-green-100 text-green-800'
            } else if (option === feedback.selectedAnswer && !feedback.isCorrect) {
              btnClass += 'border-red-400 bg-red-100 text-red-800'
            } else {
              btnClass += 'border-border bg-muted/30 text-muted-foreground'
            }
          } else {
            btnClass += 'border-border bg-background hover:border-primary hover:bg-primary/5'
          }

          return (
            <button
              key={option}
              onClick={() => handleAnswer(option)}
              disabled={phase === 'feedback'}
              className={btnClass}
            >
              {option}
              {phase === 'feedback' && feedback && option === feedback.correctAnswer && (
                <span className="ml-2">✓</span>
              )}
              {phase === 'feedback' && feedback && option === feedback.selectedAnswer && !feedback.isCorrect && (
                <span className="ml-2">✗</span>
              )}
            </button>
          )
        })}
      </div>

      {phase === 'question' && hintsShown < 2 && (
        <button
          onClick={handleShowHint}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
        >
          💡 {hintsShown === 0 ? 'Show a hint' : 'Show another hint'}
        </button>
      )}
    </div>
  )
}
