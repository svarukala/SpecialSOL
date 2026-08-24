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
  const userId = userIdOrErr as string

  const { id } = await params
  const adminDb = createAdminClient()

  const { data: existing, error: fetchErr } = await adminDb
    .from('weekly_puzzles')
    .select('status, week_start_date')
    .eq('id', id)
    .single()

  if (fetchErr || !existing) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (!existing.week_start_date) {
    return NextResponse.json({ error: 'week_start_date_required' }, { status: 400 })
  }

  const { error } = await adminDb
    .from('weekly_puzzles')
    .update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: userId })
    .eq('id', id)

  if (error) {
    if (error.message.includes('idx_weekly_puzzles_band_week')) {
      return NextResponse.json({ error: 'week_already_scheduled' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
