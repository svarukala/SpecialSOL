import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { bumpTopicLevelIfEarned } from '@/lib/supabase/queries'
import { updateStreak } from '@/lib/supabase/streak'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: session, error: sessionError } = await supabase
    .from('practice_sessions')
    .select('id, child_id, subject, mode, question_ids, current_index, question_count')
    .eq('id', sessionId)
    .eq('status', 'paused')
    .single()

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Paused session not found' }, { status: 404 })
  }

  // Verify the child belongs to this parent
  const { data: child } = await supabase
    .from('children')
    .select('id')
    .eq('id', session.child_id)
    .eq('parent_id', user.id)
    .single()

  if (!child) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const questionIds: string[] = session.question_ids ?? []
  if (questionIds.length === 0) {
    return NextResponse.json({ error: 'No questions stored for this session' }, { status: 400 })
  }

  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .in('id', questionIds)

  if (!questions) return NextResponse.json({ error: 'Questions not found' }, { status: 500 })

  // Restore original question order
  const questionMap = new Map(questions.map((q) => [q.id, q]))
  const orderedQuestions = questionIds.map((id) => questionMap.get(id)).filter(Boolean)

  return NextResponse.json({
    sessionId: session.id,
    subject: session.subject,
    mode: session.mode,
    currentIndex: Math.min(session.current_index ?? 0, orderedQuestions.length - 1),
    questions: orderedQuestions,
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { action = 'complete', currentIndex } = body

  if (action === 'pause') {
    const { error } = await supabase
      .from('practice_sessions')
      .update({
        status: 'paused',
        current_index: currentIndex ?? 0,
        paused_at: new Date().toISOString(),
      })
      .eq('id', sessionId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ paused: true })
  }

  if (action === 'abandon') {
    const { error } = await supabase
      .from('practice_sessions')
      .update({ status: 'abandoned', ended_at: new Date().toISOString() })
      .eq('id', sessionId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ abandoned: true })
  }

  // action === 'complete' — score, bump topics, update streak
  const { data: session } = await supabase
    .from('practice_sessions')
    .select('child_id, subject')
    .eq('id', sessionId)
    .single()

  const { data: answers } = await supabase
    .from('session_answers')
    .select('is_correct, attempt_number, question_id')
    .eq('session_id', sessionId)

  const answersArr = answers ?? []
  const correct = answersArr.filter((a) => a.is_correct).length
  const scorePercent = answersArr.length > 0
    ? Math.round((correct / answersArr.length) * 100)
    : 0

  const { error } = await supabase
    .from('practice_sessions')
    .update({ status: 'completed', ended_at: new Date().toISOString(), score_percent: scorePercent })
    .eq('id', sessionId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const newlyMastered: string[] = []

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
        const bumpResult = await bumpTopicLevelIfEarned(supabase, session.child_id, session.subject, topicAccuracy)
        newlyMastered.push(...bumpResult.newlyMastered)
      }
    }
  }

  const streakResult = session
    ? await updateStreak(supabase, session.child_id)
    : { newStreak: 0, bestStreak: 0, milestone: null }

  return NextResponse.json({
    scorePercent,
    newStreak: streakResult.newStreak,
    bestStreak: streakResult.bestStreak,
    streakMilestone: streakResult.milestone,
    newlyMastered,
  })
}
