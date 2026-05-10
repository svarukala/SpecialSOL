import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { childId, difficulty, score, total } = await req.json() as {
    childId: string
    difficulty: string
    score: number
    total: number
  }

  const { data: child } = await supabase.from('children').select('id').eq('id', childId).eq('parent_id', user.id).single()
  if (!child) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: existing } = await supabase.from('child_clock_scores')
    .select('best_score, rounds_played').eq('child_id', childId).eq('difficulty', difficulty).single()

  await supabase.from('child_clock_scores').upsert({
    child_id: childId,
    difficulty,
    best_score: Math.max(score, existing?.best_score ?? 0),
    rounds_played: (existing?.rounds_played ?? 0) + 1,
    last_played: new Date().toISOString(),
  }, { onConflict: 'child_id,difficulty' })

  return NextResponse.json({ ok: true, total })
}
