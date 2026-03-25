import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/lib/admin/assert-admin'
import { generateTopic } from '@/lib/generation/generate-topic'
import { getTopicsForGradeSubject } from '@/lib/curriculum/sol-curriculum'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const userIdOrErr = await assertAdmin(supabase).catch(e => e)
  if (userIdOrErr instanceof Response) return userIdOrErr

  const { grade, subject, topic: topicName } = await req.json()

  const topics = getTopicsForGradeSubject(grade, subject)
  const topic = topics.find(t => t.name === topicName)
  if (!topic) {
    return NextResponse.json({ error: 'unknown_topic' }, { status: 400 })
  }

  let questions
  try {
    questions = await generateTopic(grade, subject, topic)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }

  const adminDb = createAdminClient()
  const { data, error } = await adminDb
    .from('questions_pending')
    .insert(questions)
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ count: data.length, ids: data.map((r: { id: string }) => r.id) })
}
