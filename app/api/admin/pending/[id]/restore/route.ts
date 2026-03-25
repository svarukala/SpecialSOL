import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/lib/admin/assert-admin'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const userIdOrErr = await assertAdmin(supabase).catch(e => e)
  if (userIdOrErr instanceof Response) return userIdOrErr

  const { id } = await params
  const adminDb = createAdminClient()

  const { data: existing, error: fetchErr } = await adminDb
    .from('questions_pending')
    .select('status')
    .eq('id', id)
    .single()

  if (fetchErr || !existing) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (existing.status !== 'rejected') {
    return NextResponse.json({ error: 'not_rejected' }, { status: 409 })
  }

  const { error } = await adminDb
    .from('questions_pending')
    .update({ status: 'pending', reviewed_at: null, reviewed_by: null })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
