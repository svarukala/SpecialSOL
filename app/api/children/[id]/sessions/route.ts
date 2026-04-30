import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: childId } = await params
  const supabase = await createClient()

  // Verify parent owns this child via RLS
  const { data: child, error: fetchError } = await supabase
    .from('children')
    .select('id')
    .eq('id', childId)
    .single()

  if (fetchError || !child) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { keepRecent = 0 } = await req.json().catch(() => ({}))

  if (keepRecent > 0) {
    // Find the cutoff: get IDs of the N most recent completed sessions to keep
    const { data: recentSessions } = await supabase
      .from('practice_sessions')
      .select('id')
      .eq('child_id', childId)
      .eq('status', 'completed')
      .order('started_at', { ascending: false })
      .limit(keepRecent)

    const keepIds = (recentSessions ?? []).map((s) => s.id)

    if (keepIds.length === 0) {
      // No completed sessions at all — nothing to keep or delete
      return NextResponse.json({ deleted: 0 })
    }

    const { error } = await supabase
      .from('practice_sessions')
      .delete()
      .eq('child_id', childId)
      .not('id', 'in', `(${keepIds.join(',')})`)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    // Clear all sessions
    const { error } = await supabase
      .from('practice_sessions')
      .delete()
      .eq('child_id', childId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
