import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: childId } = await params
  const supabase = await createClient()

  // Verify the authenticated parent owns this child (RLS enforces this)
  const { data: child, error: fetchError } = await supabase
    .from('children')
    .select('id')
    .eq('id', childId)
    .single()

  if (fetchError || !child) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // feedback.submitted_by_id has no FK constraint — clean up child feedback explicitly
  const admin = createAdminClient()
  await admin
    .from('feedback')
    .delete()
    .eq('submitted_by_id', childId)
    .eq('submitted_by_type', 'child')

  // Delete the child — cascades to: practice_sessions → session_answers, child_topic_levels
  const { error: deleteError } = await supabase
    .from('children')
    .delete()
    .eq('id', childId)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
