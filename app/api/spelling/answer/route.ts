import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sessionId, wordId, answerGiven } = await req.json() as {
    sessionId: string
    wordId: string
    answerGiven: string
  }

  const { data: session } = await supabase
    .from('spelling_sessions')
    .select('id, total_words, correct_count, child_id')
    .eq('id', sessionId)
    .single()
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const { data: child } = await supabase
    .from('children')
    .select('id')
    .eq('id', session.child_id)
    .eq('parent_id', user.id)
    .single()
  if (!child) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { data: word } = await supabase
    .from('spelling_words')
    .select('id, word, definition, etymology_note, origin_language')
    .eq('id', wordId)
    .single()
  if (!word) return NextResponse.json({ error: 'Word not found' }, { status: 404 })

  const isCorrect = answerGiven.toLowerCase().trim() === word.word.toLowerCase()

  const { error: answerError } = await supabase
    .from('spelling_answers')
    .insert({ session_id: sessionId, word_id: wordId, answer_given: answerGiven, is_correct: isCorrect })
  if (answerError) return NextResponse.json({ error: answerError.message }, { status: 500 })

  const newTotal = session.total_words + 1
  const newCorrect = session.correct_count + (isCorrect ? 1 : 0)
  const completedAt = newTotal === 10 ? new Date().toISOString() : null

  const updatePayload: Record<string, unknown> = { total_words: newTotal, correct_count: newCorrect }
  if (completedAt) updatePayload.completed_at = completedAt

  await supabase
    .from('spelling_sessions')
    .update(updatePayload)
    .eq('id', sessionId)

  return NextResponse.json({
    isCorrect,
    correctWord: word.word,
    definition: word.definition,
    etymologyNote: word.etymology_note,
    originLanguage: word.origin_language,
  })
}
