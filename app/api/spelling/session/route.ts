import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { childId, grade } = await req.json() as { childId: string; grade: number }

  const { data: child } = await supabase
    .from('children')
    .select('id')
    .eq('id', childId)
    .eq('parent_id', user.id)
    .single()
  if (!child) return NextResponse.json({ error: 'Child not found' }, { status: 404 })

  const { data: words, error: wordsError } = await supabase
    .from('spelling_words')
    .select('id, word, definition, example_sentence, origin_language, etymology_note')
    .eq('grade', grade)
    .eq('is_active', true)
  if (wordsError) return NextResponse.json({ error: wordsError.message }, { status: 500 })
  if (!words || words.length === 0) {
    return NextResponse.json({ error: 'No words found for this grade' }, { status: 404 })
  }

  const shuffled = [...words].sort(() => Math.random() - 0.5)
  const selected = shuffled.slice(0, 10)

  const { data: session, error: sessionError } = await supabase
    .from('spelling_sessions')
    .insert({ child_id: childId, grade })
    .select('id')
    .single()
  if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 })

  return NextResponse.json({
    sessionId: session.id,
    words: selected.map((w) => ({
      id: w.id,
      word: w.word,
      definition: w.definition,
      exampleSentence: w.example_sentence,
      originLanguage: w.origin_language,
      etymologyNote: w.etymology_note,
    })),
  }, { status: 201 })
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sessionId = req.nextUrl.searchParams.get('sessionId')
  if (!sessionId) return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })

  const { data: session, error } = await supabase
    .from('spelling_sessions')
    .select(`
      id, grade, total_words, correct_count, completed_at, started_at,
      spelling_answers (
        id, answer_given, is_correct, answered_at,
        spelling_words ( id, word, definition )
      )
    `)
    .eq('id', sessionId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  return NextResponse.json(session)
}
