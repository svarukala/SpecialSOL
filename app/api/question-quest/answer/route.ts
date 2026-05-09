import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { childId, questionId, answerGiven, hintsUsed } = await req.json() as {
    childId: string
    questionId: string
    answerGiven: string
    hintsUsed: number
  }

  if (!childId || !questionId || answerGiven === undefined) {
    return NextResponse.json({ error: 'childId, questionId, and answerGiven are required' }, { status: 400 })
  }

  const { data: child } = await supabase
    .from('children')
    .select('id')
    .eq('id', childId)
    .eq('parent_id', user.id)
    .single()
  if (!child) return NextResponse.json({ error: 'Child not found' }, { status: 404 })

  const { data: question } = await supabase
    .from('wh_questions')
    .select('correct_answer, wh_type, hint_1, hint_2')
    .eq('id', questionId)
    .single()
  if (!question) return NextResponse.json({ error: 'Question not found' }, { status: 404 })

  const isCorrect = answerGiven.trim().toLowerCase() === question.correct_answer.trim().toLowerCase()

  await supabase.from('wh_session_answers').insert({
    child_id: childId,
    question_id: questionId,
    answer_given: answerGiven,
    is_correct: isCorrect,
    hints_used: hintsUsed ?? 0,
  })

  const { data: existing } = await supabase
    .from('child_wh_progress')
    .select('questions_answered, correct_count, hint_count')
    .eq('child_id', childId)
    .eq('wh_type', question.wh_type)
    .single()

  const newAnswered = (existing?.questions_answered ?? 0) + 1
  const newCorrect = (existing?.correct_count ?? 0) + (isCorrect ? 1 : 0)
  const newHints = (existing?.hint_count ?? 0) + (hintsUsed ?? 0)
  const isMastered = newAnswered >= 10 && newCorrect / newAnswered >= 0.8

  await supabase.from('child_wh_progress').upsert(
    {
      child_id: childId,
      wh_type: question.wh_type,
      questions_answered: newAnswered,
      correct_count: newCorrect,
      hint_count: newHints,
      is_mastered: isMastered,
      last_practiced: new Date().toISOString(),
    },
    { onConflict: 'child_id,wh_type' }
  )

  return NextResponse.json({
    isCorrect,
    correctAnswer: question.correct_answer,
  })
}
