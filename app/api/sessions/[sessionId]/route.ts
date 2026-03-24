import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { bumpTopicLevelIfEarned } from '@/lib/supabase/queries'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch session metadata (child_id + subject needed for topic level update)
  const { data: session } = await supabase
    .from('practice_sessions')
    .select('child_id, subject')
    .eq('id', sessionId)
    .single()

  // Fetch answers with question_id for scoring and topic accuracy
  const { data: answers } = await supabase
    .from('session_answers')
    .select('is_correct, attempt_number, question_id')
    .eq('session_id', sessionId)

  const answersArr = answers ?? []
  const correct = answersArr.filter((a) => a.is_correct).length
  const scorePercent = answersArr.length > 0
    ? Math.round((correct / answersArr.length) * 100)
    : 0

  // Update session status
  const { error } = await supabase
    .from('practice_sessions')
    .update({ status: 'completed', ended_at: new Date().toISOString(), score_percent: scorePercent })
    .eq('id', sessionId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Bump topic levels if session metadata is available
  if (session && answersArr.length > 0) {
    const questionIds = [...new Set(answersArr.map((a) => a.question_id).filter(Boolean))]
    if (questionIds.length > 0) {
      const { data: questions } = await supabase
        .from('questions')
        .select('id, topic')
        .in('id', questionIds)

      if (questions && questions.length > 0) {
        const topicMap: Record<string, string> = Object.fromEntries(
          questions.map((q: { id: string; topic: string }) => [q.id, q.topic])
        )
        const topicAccuracy: Record<string, { correct: number; total: number }> = {}
        for (const a of answersArr) {
          const topic = topicMap[a.question_id]
          if (!topic) continue
          if (!topicAccuracy[topic]) topicAccuracy[topic] = { correct: 0, total: 0 }
          topicAccuracy[topic].total++
          if (a.is_correct) topicAccuracy[topic].correct++
        }
        await bumpTopicLevelIfEarned(supabase, session.child_id, session.subject, topicAccuracy)
      }
    }
  }

  return NextResponse.json({ scorePercent })
}
