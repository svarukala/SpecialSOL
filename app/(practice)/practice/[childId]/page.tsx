import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PracticeSession } from './practice-session'
import type { Question } from '@/lib/practice/question-types'
import { isShuffleable } from '@/lib/practice/question-types'
import { getChildTopicLevels } from '@/lib/supabase/queries'

export default async function PracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ childId: string }>
  searchParams: Promise<{ resume?: string }>
}) {
  const { childId } = await params
  const { resume: resumeSessionId } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: child } = await supabase
    .from('children')
    .select('*')
    .eq('id', childId)
    .eq('parent_id', user.id)
    .single()
  if (!child) redirect('/dashboard')

  const { data: subjectRows } = await supabase
    .from('questions')
    .select('subject')
    .eq('grade', child.grade)
  const availableSubjects = [...new Set((subjectRows ?? []).map((q: { subject: string }) => q.subject))]

  const { data: parent } = await supabase
    .from('parents')
    .select('settings')
    .eq('id', user.id)
    .single()

  const safeSettings = {
    tts_provider: parent?.settings?.tts_provider ?? 'web_speech',
    tts_voice: parent?.settings?.tts_voice,
  }

  // ── Resume flow ────────────────────────────────────────────────────────────
  let resumeSession: {
    sessionId: string
    subject: string
    mode: 'practice' | 'test'
    currentIndex: number
    questions: Question[]
    languageLevel: 'foundational' | 'simplified' | 'standard'
  } | undefined

  if (resumeSessionId) {
    const { data: session } = await supabase
      .from('practice_sessions')
      .select('id, child_id, subject, mode, question_ids, current_index')
      .eq('id', resumeSessionId)
      .eq('child_id', childId)
      .eq('status', 'paused')
      .single()

    if (session && (session.question_ids ?? []).length > 0) {
      const [{ data: questionRows }, topicLevels] = await Promise.all([
        supabase.from('questions').select('*').in('id', session.question_ids),
        getChildTopicLevels(supabase, childId, session.subject),
      ])

      if (questionRows && questionRows.length > 0) {
        // Derive language level the same way the questions API does
        type LL = 'foundational' | 'simplified' | 'standard'
        let languageLevel: LL = 'simplified'
        const levels = Object.values(topicLevels)
        if (levels.length > 0) {
          const foundationalCount = levels.filter((l) => l === 'foundational').length
          const standardCount = levels.filter((l) => l === 'standard').length
          if (foundationalCount > levels.length / 2) languageLevel = 'foundational'
          else if (standardCount > levels.length / 2) languageLevel = 'standard'
        }

        // Restore original order then re-apply shuffle
        const questionMap = new Map(questionRows.map((q) => [q.id, q as unknown as Question]))
        const ordered = (session.question_ids as string[])
          .map((id) => questionMap.get(id))
          .filter((q): q is Question => !!q)
          .map((q) => {
            if (!isShuffleable(q.answer_type)) return q
            return { ...q, choices: [...(q.choices as unknown[])].sort(() => Math.random() - 0.5) }
          })

        // Mark session in_progress so the 2-hour auto-abandon logic applies
        await supabase
          .from('practice_sessions')
          .update({ status: 'in_progress', paused_at: null })
          .eq('id', session.id)

        resumeSession = {
          sessionId: session.id,
          subject: session.subject,
          mode: session.mode as 'practice' | 'test',
          currentIndex: Math.min(session.current_index ?? 0, ordered.length - 1),
          questions: ordered,
          languageLevel,
        }
      }
    }
  }

  return (
    <PracticeSession
      child={child}
      availableSubjects={availableSubjects}
      parentSettings={safeSettings}
      dashboardHref={`/dashboard?childId=${childId}`}
      resumeSession={resumeSession}
    />
  )
}
