'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AccommodationProvider } from '@/lib/accommodations/context'
import { AccommodationState } from '@/lib/accommodations/types'
import { DEFAULT_ACCOMMODATIONS } from '@/lib/accommodations/defaults'
import { createTTSEngine } from '@/lib/tts/factory'
import { TTSEngine } from '@/lib/tts/types'
import { SubjectModePicker } from '@/components/practice/subject-mode-picker'
import { QuestionCard } from '@/components/practice/question-card'
import { AnswerInput } from '@/components/practice/answer-input'
import { checkAnswer, isShuffleable, AnswerValue } from '@/lib/practice/question-types'
import type { Question } from '@/lib/practice/question-types'
import { HintPanel } from '@/components/practice/hint-panel'
import { AccommodationToolbar } from '@/components/accommodations/accommodation-toolbar'
import { SessionComplete } from '@/components/practice/session-complete'
import { playCorrectChime } from '@/lib/audio/web-audio'
import { ChildFeedbackSheet } from '@/components/feedback/child-feedback-sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

type Mode = 'practice' | 'test'
type Phase = 'picking' | 'session' | 'complete'

interface Props {
  child: {
    id: string
    name: string
    grade: number
    accommodations: Record<string, unknown>
  }
  availableSubjects: string[]
  parentSettings: {
    tts_provider?: string
    tts_voice?: string
  }
  dashboardHref: string
}

export function PracticeSession({ child, availableSubjects, parentSettings, dashboardHref }: Props) {
  const accommodations: AccommodationState = { ...DEFAULT_ACCOMMODATIONS, ...child.accommodations }
  const router = useRouter()

  const [phase, setPhase] = useState<Phase>('picking')
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('practice')
  const [selectedAnswer, setSelectedAnswer] = useState<AnswerValue | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [streak, setStreak] = useState(0)
  const [scorePercent, setScorePercent] = useState(0)
  const [ttsEngine, setTTSEngine] = useState<TTSEngine | null>(null)
  const [highlightRange, setHighlightRange] = useState<{ start: number; length: number } | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [attemptNumber, setAttemptNumber] = useState(1)
  const ttsEngineRef = useRef<TTSEngine | null>(null)
  const questionStartTime = useRef(Date.now())

  useEffect(() => {
    createTTSEngine({
      provider: (parentSettings.tts_provider ?? 'web_speech') as 'web_speech' | 'openai' | 'elevenlabs',
      voice: parentSettings.tts_voice,
    }).then((engine) => {
      ttsEngineRef.current = engine
      setTTSEngine(engine)
    })
  }, [parentSettings.tts_provider, parentSettings.tts_voice])

  const handleStart = useCallback(async ({
    subject,
    mode: m,
  }: {
    subject: 'math' | 'reading'
    mode: Mode
  }) => {
    setIsStarting(true)
    setMode(m)
    const res = await fetch(
      `/api/questions?grade=${child.grade}&subject=${subject}&mode=${m}&childId=${child.id}`
    )
    const qs: Question[] = await res.json()
    if (!qs || qs.length === 0) {
      setIsStarting(false)
      alert('No questions available for this subject. Please try again later.')
      return
    }
    const shuffled = qs.map((q) => {
      if (!isShuffleable(q.answer_type)) return q
      return { ...q, choices: [...(q.choices as unknown[])].sort(() => Math.random() - 0.5) }
    })
    setQuestions(shuffled)
    setCurrentIndex(0)

    const sessRes = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        childId: child.id,
        subject,
        mode: m,
        questionIds: qs.map((q) => q.id),
      }),
    })
    const { sessionId: sid } = await sessRes.json()
    setSessionId(sid)
    setStreak(0)
    setScorePercent(0)
    setAttemptNumber(1)
    setSelectedAnswer(null)
    setIsCorrect(null)
    questionStartTime.current = Date.now()
    setIsStarting(false)
    setPhase('session')
  }, [child.id, child.grade])

  const advance = useCallback((nextIndex: number, totalCount: number) => {
    ttsEngineRef.current?.stop()
    setSelectedAnswer(null)
    setIsCorrect(null)
    setHintsUsed(0)
    setHighlightRange(null)
    setAttemptNumber(1)
    questionStartTime.current = Date.now()
    if (nextIndex >= totalCount) {
      // Complete session
      if (sessionId) {
        fetch(`/api/sessions/${sessionId}`, { method: 'PATCH' })
          .then((r) => r.json())
          .then(({ scorePercent: sp }) => {
            setScorePercent(sp ?? 0)
            setPhase('complete')
          })
      }
    } else {
      setCurrentIndex(nextIndex)
    }
  }, [sessionId])

  const submitAnswer = useCallback(async (answer: AnswerValue) => {
    if (!sessionId || isCorrect === true) return

    const q = questions[currentIndex]
    const isSingleChoice = q.answer_type === 'multiple_choice' || q.answer_type === 'true_false'

    // Single-choice types allow direct re-selection after a wrong answer
    if (isSingleChoice && isCorrect === false && answer === selectedAnswer) return

    const currentAttempt = isCorrect === false ? attemptNumber + 1 : attemptNumber
    if (isSingleChoice && isCorrect === false) {
      setAttemptNumber(currentAttempt)
      setStreak(0)
    }

    const correct = checkAnswer(q, answer)
    setSelectedAnswer(answer)
    setIsCorrect(correct)

    await fetch(`/api/sessions/${sessionId}/answers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: q.id,
        answerId: answer,
        isCorrect: correct,
        timeSpent: Math.round((Date.now() - questionStartTime.current) / 1000),
        hintsUsed,
        ttsUsed: accommodations.tts_enabled,
        attemptNumber: currentAttempt,
      }),
    })

    if (correct) {
      if (accommodations.positive_reinforcement) playCorrectChime()
      setStreak((s) => s + 1)
      setTimeout(() => advance(currentIndex + 1, questions.length), 1200)
    } else if (mode === 'test') {
      setTimeout(() => advance(currentIndex + 1, questions.length), 1200)
    }
  }, [sessionId, isCorrect, selectedAnswer, attemptNumber, questions, currentIndex, hintsUsed, accommodations, mode, advance])

  const handleRetry = useCallback(() => {
    setAttemptNumber((n) => n + 1)
    setStreak(0)
    setSelectedAnswer(null)
    setIsCorrect(null)
  }, [])

  const handleExit = useCallback(async () => {
    ttsEngineRef.current?.stop()
    if (sessionId) {
      await fetch(`/api/sessions/${sessionId}`, { method: 'PATCH' })
    }
    router.push(dashboardHref)
  }, [sessionId, dashboardHref, router])

  if (phase === 'picking') {
    return (
      <AccommodationProvider initial={accommodations}>
        <SubjectModePicker
          childName={child.name}
          availableSubjects={availableSubjects as ('math' | 'reading')[]}
          onStart={handleStart}
          loading={isStarting}
          dashboardHref={dashboardHref}
        />
      </AccommodationProvider>
    )
  }

  if (phase === 'complete') {
    return (
      <AccommodationProvider initial={accommodations}>
        <SessionComplete
          scorePercent={scorePercent}
          positiveReinforcement={accommodations.positive_reinforcement}
          onPracticeAgain={() => {
            setPhase('picking')
            setCurrentIndex(0)
            setQuestions([])
            setSessionId(null)
            setStreak(0)
            setScorePercent(0)
          }}
        />
      </AccommodationProvider>
    )
  }

  const q = questions[currentIndex]
  if (!q) return <div className="p-8 text-center">Loading...</div>

  const isWrong = isCorrect === false

  return (
    <AccommodationProvider initial={accommodations}>
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <div className="flex justify-end">
          <AlertDialog>
            <AlertDialogTrigger className="text-xs text-muted-foreground hover:text-foreground transition-colors bg-transparent border-0 cursor-pointer">
              ✕ End Session
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>End this session?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your progress so far will be saved. You can start a new session anytime.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep Going</AlertDialogCancel>
                <AlertDialogAction onClick={handleExit}>End Session</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        {ttsEngine && (
          <AccommodationToolbar
            engine={ttsEngine}
            questionText={q.question_text}
            progress={{ current: currentIndex + 1, total: questions.length }}
            onBoundary={(start, length) => setHighlightRange({ start, length })}
            onSpeakEnd={() => setHighlightRange(null)}
          />
        )}
        <QuestionCard question={q} simplified={accommodations.simplified_language} highlightRange={highlightRange} />
        <AnswerInput
          key={`${q.id}-${attemptNumber}`}
          question={q}
          submittedAnswer={selectedAnswer}
          isCorrect={isCorrect}
          onSubmit={submitAnswer}
          disabled={isCorrect === true}
        />
        {accommodations.hints_enabled && (
          <HintPanel
            key={q.id}
            hints={[q.hint_1, q.hint_2, q.hint_3]}
            onHintUsed={setHintsUsed}
            enabled={selectedAnswer === null || isWrong}
          />
        )}
        {isWrong && mode === 'practice' && (
          <div className="space-y-2 text-center">
            <p className="text-lg font-medium">Try again! You can do it 💪</p>
            {q.answer_type !== 'multiple_choice' && q.answer_type !== 'true_false' && (
              <button onClick={handleRetry} className="text-sm underline text-muted-foreground">
                Reset and try again
              </button>
            )}
          </div>
        )}
        <div className="flex justify-between items-center">
          {sessionId && (
            <ChildFeedbackSheet sessionId={sessionId} questionId={q.id} childId={child.id} />
          )}
          {streak >= 3 && accommodations.positive_reinforcement && (
            <span className="text-sm font-medium animate-bounce">🔥 {streak} in a row!</span>
          )}
        </div>
      </div>
    </AccommodationProvider>
  )
}
