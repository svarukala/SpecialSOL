import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: answers } = await supabase
    .from('session_answers')
    .select('is_correct, attempt_number')
    .eq('session_id', sessionId)

  // Count only final attempt per question position
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
  return NextResponse.json({ scorePercent })
}
