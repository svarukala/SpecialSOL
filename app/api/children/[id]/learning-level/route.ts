import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTopicsForGradeSubject } from '@/lib/curriculum/sol-curriculum'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: childId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: child } = await supabase
    .from('children')
    .select('id, grade')
    .eq('id', childId)
    .eq('parent_id', user.id)
    .single()
  if (!child) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { subject, tier } = await req.json()

  const topics = getTopicsForGradeSubject(child.grade, subject as 'math' | 'reading')
  if (topics.length === 0) {
    return NextResponse.json({ error: 'unknown_subject' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const rows = topics.map((t) => ({
    child_id: childId,
    subject,
    topic: t.name,
    language_level: tier,
    sessions_at_level: 0,
    promotion_ready: false,
    updated_at: now,
  }))

  const { error } = await supabase
    .from('child_topic_levels')
    .upsert(rows, { onConflict: 'child_id,subject,topic' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ updated: rows.length })
}
