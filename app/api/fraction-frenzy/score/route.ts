import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { childId, level, score } = await req.json()

  const { data: child } = await supabase
    .from('children').select('id').eq('id', childId).eq('parent_id', user.id).single()
  if (!child) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: existing } = await supabase
    .from('child_fraction_scores')
    .select('best_score, rounds_played')
    .eq('child_id', childId).eq('level', level).single()

  await supabase.from('child_fraction_scores').upsert({
    child_id: childId,
    level,
    best_score: Math.max(score, existing?.best_score ?? 0),
    rounds_played: (existing?.rounds_played ?? 0) + 1,
    last_played: new Date().toISOString(),
  }, { onConflict: 'child_id,level' })

  return NextResponse.json({ ok: true })
}
