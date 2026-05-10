import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { childId, mode, score, total } = await req.json() as {
    childId: string
    mode: string
    score: number
    total: number
  }

  void total // used by client for display, not stored directly

  const { data: child } = await supabase
    .from('children')
    .select('id')
    .eq('id', childId)
    .eq('parent_id', user.id)
    .single()
  if (!child) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: existing } = await supabase
    .from('child_money_scores')
    .select('best_score, rounds_played')
    .eq('child_id', childId)
    .eq('mode', mode)
    .single()

  await supabase.from('child_money_scores').upsert({
    child_id: childId,
    mode,
    best_score: Math.max(score, existing?.best_score ?? 0),
    rounds_played: (existing?.rounds_played ?? 0) + 1,
    last_played: new Date().toISOString(),
  }, { onConflict: 'child_id,mode' })

  return NextResponse.json({ ok: true })
}
