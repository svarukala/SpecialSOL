import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const childId = searchParams.get('childId')
  const whType = searchParams.get('whType')
  const count = Math.min(parseInt(searchParams.get('count') ?? '10', 10), 20)

  if (!childId || !whType) {
    return NextResponse.json({ error: 'childId and whType are required' }, { status: 400 })
  }

  const { data: child } = await supabase
    .from('children')
    .select('id')
    .eq('id', childId)
    .eq('parent_id', user.id)
    .single()
  if (!child) return NextResponse.json({ error: 'Child not found' }, { status: 404 })

  const { data: rows, error } = await supabase
    .from('wh_questions')
    .select('id, scenario, question, correct_answer, distractors, hint_1, hint_2, difficulty')
    .eq('wh_type', whType)
    .eq('is_active', true)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const shuffled = (rows ?? []).sort(() => Math.random() - 0.5).slice(0, count)

  const questions = shuffled.map((q) => {
    const distractors: string[] = Array.isArray(q.distractors) ? q.distractors : []
    const options = [q.correct_answer, ...distractors].sort(() => Math.random() - 0.5)
    return {
      id: q.id,
      scenario: q.scenario,
      question: q.question,
      hint1: q.hint_1 ?? null,
      hint2: q.hint_2 ?? null,
      options,
      difficulty: q.difficulty,
    }
  })

  return NextResponse.json({ questions })
}
