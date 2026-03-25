import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const NEXT_LEVEL: Record<string, string> = {
  foundational: 'simplified',
  simplified: 'standard',
}

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
    .select('id')
    .eq('id', childId)
    .eq('parent_id', user.id)
    .single()
  if (!child) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { subject, action } = await req.json()

  const { data: readyRows } = await supabase
    .from('child_topic_levels')
    .select('topic, language_level')
    .eq('child_id', childId)
    .eq('subject', subject)
    .eq('promotion_ready', true)

  if (!readyRows || readyRows.length === 0) {
    return NextResponse.json({ error: 'not_ready' }, { status: 409 })
  }

  const now = new Date().toISOString()
  let updates: Record<string, unknown>[]

  if (action === 'confirm') {
    updates = readyRows.map((row: { topic: string; language_level: string }) => ({
      child_id: childId,
      subject,
      topic: row.topic,
      language_level: NEXT_LEVEL[row.language_level] ?? 'simplified',
      sessions_at_level: 0,
      promotion_ready: false,
      previous_level: row.language_level,
      changed_at: now,
      updated_at: now,
    }))
  } else {
    // dismiss — clear the flag and reset counter without changing level
    updates = readyRows.map((row: { topic: string; language_level: string }) => ({
      child_id: childId,
      subject,
      topic: row.topic,
      language_level: row.language_level,
      sessions_at_level: 0,
      promotion_ready: false,
      updated_at: now,
    }))
  }

  const { error } = await supabase
    .from('child_topic_levels')
    .upsert(updates, { onConflict: 'child_id,subject,topic' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ affected: readyRows.length })
}
