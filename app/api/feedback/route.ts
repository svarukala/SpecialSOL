import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()

  const { data, error } = await supabase
    .from('feedback')
    .insert({
      submitted_by_type: body.submittedByType,
      submitted_by_id: body.submittedById,
      session_id: body.sessionId ?? null,
      question_id: body.questionId ?? null,
      category: body.category,
      message: body.message ?? null,
      voice_note_url: body.voiceNoteUrl ?? null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id }, { status: 201 })
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('feedback')
    .select('*')
    .eq('submitted_by_id', user.id)
    .order('created_at', { ascending: false })

  return NextResponse.json(data ?? [])
}
