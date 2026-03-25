import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/lib/admin/assert-admin'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const userIdOrErr = await assertAdmin(supabase).catch(e => e)
  if (userIdOrErr instanceof Response) return userIdOrErr

  const includeRejected = req.nextUrl.searchParams.get('includeRejected') === 'true'
  const statuses = includeRejected ? ['pending', 'rejected'] : ['pending']

  const adminDb = createAdminClient()
  const { data, error } = await adminDb
    .from('questions_pending')
    .select('*')
    .in('status', statuses)
    .order('generated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
