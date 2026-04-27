import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Delete app data first (parents cascades → children → sessions/answers/topic_levels)
  const { error: deleteDataErr } = await admin
    .from('parents')
    .delete()
    .eq('id', user.id)

  if (deleteDataErr) {
    return NextResponse.json({ error: 'Failed to delete account data' }, { status: 500 })
  }

  // Remove the auth user
  const { error: deleteAuthErr } = await admin.auth.admin.deleteUser(user.id)
  if (deleteAuthErr) {
    return NextResponse.json({ error: 'Failed to remove auth account' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
