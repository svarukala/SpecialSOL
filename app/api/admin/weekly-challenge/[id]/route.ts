import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/lib/admin/assert-admin'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const userIdOrErr = await assertAdmin(supabase).catch(e => e)
  if (userIdOrErr instanceof Response) return userIdOrErr

  const { id } = await params
  const adminDb = createAdminClient()

  const { data: existing, error: fetchErr } = await adminDb
    .from('weekly_puzzles')
    .select('status')
    .eq('id', id)
    .single()

  if (fetchErr || !existing) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (existing.status !== 'pending') {
    return NextResponse.json({ error: 'already_reviewed' }, { status: 409 })
  }

  const body = await req.json()
  if (!('week_start_date' in body)) {
    return NextResponse.json({ error: 'week_start_date is required' }, { status: 400 })
  }

  const { data, error } = await adminDb
    .from('weekly_puzzles')
    .update({ week_start_date: body.week_start_date })
    .eq('id', id)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data?.[0])
}
