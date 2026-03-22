'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import { AccommodationProvider } from '@/lib/accommodations/context'
import { AccommodationState } from '@/lib/accommodations/types'
import { DEFAULT_ACCOMMODATIONS } from '@/lib/accommodations/defaults'
import { createTTSEngine } from '@/lib/tts/factory'
import { TTSEngine } from '@/lib/tts/types'
import { SubjectModePicker } from '@/components/practice/subject-mode-picker'
import { QuestionCard, Question } from '@/components/practice/question-card'
import { AnswerPicker } from '@/components/practice/answer-picker'
import { HintPanel } from '@/components/practice/hint-panel'
import { AccommodationToolbar } from '@/components/accommodations/accommodation-toolbar'
import { SessionComplete } from '@/components/practice/session-complete'
import { playCorrectChime } from '@/lib/audio/web-audio'

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
}

export function PracticeSession({ child, availableSubjects, parentSettings }: Props) {
  const accommodations: AccommodationState = { ...DEFAULT_ACCOMMODATIONS, ...child.accommodations }

  const [phase, setPhase] = useState<Phase>('picking')
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('practice')
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [streak, setStreak] = useState(0)
  const [scorePercent, setScorePercent] = useState(0)
  const [ttsEngine, setTTSEngine] = useState<TTSEngine | null>(null)
  const questionStartTime = useRef(Date.now())

  useEffect(() => {
    createTTSEngine({
      provider: (parentSettings.tts_provider ?? 'web_speech') as 'web_speech' | 'openai' | 'elevenlabs',
      voice: parentSettings.tts_voice,
    }).then(setTTSEngine)
  }, [parentSettings.tts_provider, parentSettings.tts_voice])

  const handleStart = useCallback(async ({
    subject,
    mode: m,
  }: {
    subject: 'math' | 'reading'
    mode: Mode
  }) => {
    setMode(m)
    const res = await fetch(
      `/api/questions?grade=${child.grade}&subject=${subject}&mode=${m}&childId=${child.id}`
    )
    const qs: Question[] = await res.json()
    setQuestions(qs)
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
    questionStartTime.current = Date.now()
    setPhase('session')
  }, [child.id, child.grade])

  const advance = useCallback((nextIndex: number, totalCount: number) => {
    setSelectedAnswer(null)
    setIsCorrect(null)
    setHintsUsed(0)
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

  const submitAnswer = useCallback(async (choiceId: string) => {
    if (!sessionId || selectedAnswer !== null) return
    const q = questions[currentIndex]
    const correct = q.choices.find((c) => c.id === choiceId)?.is_correct ?? false
    setSelectedAnswer(choiceId)
    setIsCorrect(correct)

    await fetch(`/api/sessions/${sessionId}/answers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: q.id,
        answerId: choiceId,
        isCorrect: correct,
        timeSpent: Math.round((Date.now() - questionStartTime.current) / 1000),
        hintsUsed,
        ttsUsed: accommodations.tts_enabled,
        attemptNumber: 1,
      }),
    })

    if (correct) {
      if (accommodations.positive_reinforcement) playCorrectChime()
      setStreak((s) => s + 1)
      setTimeout(() => advance(currentIndex + 1, questions.length), 1200)
    } else if (mode === 'test') {
      setTimeout(() => advance(currentIndex + 1, questions.length), 1200)
    }
    // In practice mode on wrong answer: let user retry (no auto-advance)
  }, [sessionId, selectedAnswer, questions, currentIndex, hintsUsed, accommodations, mode, advance])

  const handleRetry = useCallback(() => {
    setSelectedAnswer(null)
    setIsCorrect(null)
    setStreak(0)
  }, [])

  if (phase === 'picking') {
    return (
      <AccommodationProvider initial={accommodations}>
        <SubjectModePicker
          childName={child.name}
          availableSubjects={availableSubjects as ('math' | 'reading')[]}
          onStart={handleStart}
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
        {ttsEngine && (
          <AccommodationToolbar
            engine={ttsEngine}
            questionText={q.question_text}
            progress={{ current: currentIndex + 1, total: questions.length }}
          />
        )}
        <QuestionCard question={q} simplified={accommodations.simplified_language} />
        <AnswerPicker
          choices={q.choices}
          selectedId={selectedAnswer}
          isCorrect={isCorrect}
          onSelect={submitAnswer}
          disabled={isCorrect === true}
        />
        {accommodations.hints_enabled && (
          <HintPanel
            hints={[q.hint_1, q.hint_2, q.hint_3]}
            onHintUsed={setHintsUsed}
            enabled={selectedAnswer === null || isWrong}
          />
        )}
        {isWrong && mode === 'practice' && (
          <div className="text-center space-y-2">
            <p className="text-lg font-medium">Try again! You can do it 💪</p>
            <button onClick={handleRetry} className="text-sm text-primary underline">
              Try a different answer
            </button>
          </div>
        )}
        <div className="flex justify-between items-center">
          <div /> {/* Feedback button placeholder — added in Task 15 */}
          {streak >= 3 && accommodations.positive_reinforcement && (
            <span className="text-sm font-medium animate-bounce">🔥 {streak} in a row!</span>
          )}
        </div>
      </div>
    </AccommodationProvider>
  )
}
