import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { questionId, answerId, isCorrect, timeSpent, hintsUsed, ttsUsed, attemptNumber } = body

  const { error } = await supabase.from('session_answers').insert({
    session_id: sessionId,
    question_id: questionId,
    answer_given: answerId,
    is_correct: isCorrect,
    time_spent_seconds: timeSpent ?? 0,
    hints_used: hintsUsed ?? 0,
    tts_used: ttsUsed ?? false,
    attempt_number: attemptNumber ?? 1,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ is_correct: isCorrect }, { status: 201 })
}
