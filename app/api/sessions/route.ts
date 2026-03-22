import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { childId, subject, mode, questionIds } = await req.json()

  // Verify child belongs to this parent
  const { data: child } = await supabase
    .from('children')
    .select('*')
    .eq('id', childId)
    .eq('parent_id', user.id)
    .single()
  if (!child) return NextResponse.json({ error: 'Child not found' }, { status: 404 })

  // Mark stale in_progress sessions as abandoned
  await supabase
    .from('practice_sessions')
    .update({ status: 'abandoned' })
    .eq('child_id', childId)
    .eq('status', 'in_progress')
    .lt('started_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())

  const { data: session, error } = await supabase
    .from('practice_sessions')
    .insert({
      child_id: childId,
      grade: child.grade,
      subject,
      mode,
      question_count: questionIds.length,
      accommodations_used: child.accommodations,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sessionId: session.id }, { status: 201 })
}
