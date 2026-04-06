import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_CATEGORIES = ['bug', 'question_error', 'suggestion', 'praise', 'other', 'child_confused', 'child_read_again'] as const
const VALID_TYPES = ['parent', 'child'] as const

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // Validate category and type to prevent garbage data
  if (!VALID_CATEGORIES.includes(body.category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  }
  if (!VALID_TYPES.includes(body.submittedByType)) {
    return NextResponse.json({ error: 'Invalid submittedByType' }, { status: 400 })
  }

  // submitted_by_id must be the authenticated user (parent) or one of their children
  const submittedById: string = body.submittedById
  if (body.submittedByType === 'parent') {
    if (submittedById !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  } else {
    // Verify the child belongs to this parent
    const { data: child } = await supabase
      .from('children')
      .select('id')
      .eq('id', submittedById)
      .eq('parent_id', user.id)
      .single()
    if (!child) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('feedback')
    .insert({
      submitted_by_type: body.submittedByType,
      submitted_by_id: submittedById,
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
