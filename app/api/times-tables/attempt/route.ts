import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { childId, multiplier, multiplicand, answerGiven, responseTimeMs } = await req.json() as {
    childId: string
    multiplier: number
    multiplicand: number
    answerGiven: number
    responseTimeMs: number
  }

  const { data: child } = await supabase
    .from('children')
    .select('id')
    .eq('id', childId)
    .eq('parent_id', user.id)
    .single()
  if (!child) return NextResponse.json({ error: 'Child not found' }, { status: 404 })

  const correctAnswer = multiplier * multiplicand
  const isCorrect = answerGiven === correctAnswer

  await supabase.from('times_tables_attempts').insert({
    child_id: childId,
    multiplier,
    multiplicand,
    answer_given: answerGiven,
    is_correct: isCorrect,
    response_time_ms: responseTimeMs,
  })

  const { data: existing } = await supabase
    .from('times_tables_mastery')
    .select('attempts, correct')
    .eq('child_id', childId)
    .eq('multiplier', multiplier)
    .single()

  const newAttempts = (existing?.attempts ?? 0) + 1
  const newCorrect = (existing?.correct ?? 0) + (isCorrect ? 1 : 0)

  await supabase.from('times_tables_mastery').upsert(
    {
      child_id: childId,
      multiplier,
      attempts: newAttempts,
      correct: newCorrect,
      last_practiced: new Date().toISOString(),
    },
    { onConflict: 'child_id,multiplier' }
  )

  return NextResponse.json({ isCorrect, correctAnswer }, { status: 201 })
}
