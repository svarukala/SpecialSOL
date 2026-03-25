import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/lib/admin/assert-admin'

const EDITABLE_FIELDS = [
  'question_text', 'simplified_text', 'choices',
  'hint_1', 'hint_2', 'hint_3', 'difficulty', 'calculator_allowed',
] as const

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
    .from('questions_pending')
    .select('status')
    .eq('id', id)
    .single()

  if (fetchErr || !existing) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (existing.status !== 'pending') {
    return NextResponse.json({ error: 'already_reviewed' }, { status: 409 })
  }

  const body = await req.json()
  const patch: Record<string, unknown> = {}
  for (const field of EDITABLE_FIELDS) {
    if (field in body) patch[field] = body[field]
  }

  const { data, error } = await adminDb
    .from('questions_pending')
    .update(patch)
    .eq('id', id)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data?.[0])
}
