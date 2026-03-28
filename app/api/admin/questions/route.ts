import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/lib/admin/assert-admin'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const userIdOrErr = await assertAdmin(supabase).catch(e => e)
  if (userIdOrErr instanceof Response) return userIdOrErr

  const { searchParams } = req.nextUrl
  const grade = searchParams.get('grade')
  const subject = searchParams.get('subject')
  const topic = searchParams.get('topic')
  const tier = searchParams.get('tier')
  const sort = searchParams.get('sort') ?? 'newest'
  const offset = parseInt(searchParams.get('offset') ?? '0', 10)
  const limit = parseInt(searchParams.get('limit') ?? '20', 10)

  const adminDb = createAdminClient()
  let query = adminDb.from('questions').select('*', { count: 'exact' })
  if (grade) query = query.eq('grade', parseInt(grade, 10))
  if (subject) query = query.eq('subject', subject)
  if (topic) query = query.eq('topic', topic)
  if (tier) query = query.eq('tier', tier)

  const { data, count, error } = await query
    .order('created_at', { ascending: sort === 'oldest' })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ questions: data, total: count ?? 0 })
}
