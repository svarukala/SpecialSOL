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

  const { data: questionId, error } = await adminDb.rpc('approve_pending_question', {
    p_pending_id: id,
  })

  if (error) {
    const msg = (error as { message?: string }).message ?? ''
    if (msg.includes('already_published')) {
      return NextResponse.json({ error: 'already_published' }, { status: 409 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  return NextResponse.json({ questionId })
}
