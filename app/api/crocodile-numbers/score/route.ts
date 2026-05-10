import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { childId, mode, score, total } = await req.json() as {
    childId: string
    mode: 'test' | 'compete'
    score: number
    total: number
  }

  // Verify child belongs to this parent
  const { data: child } = await supabase
    .from('children')
    .select('id')
    .eq('id', childId)
    .eq('parent_id', user.id)
    .single()
  if (!child) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Fetch existing best score to decide whether to update
  const { data: existing } = await supabase
    .from('child_comparison_scores')
    .select('best_score')
    .eq('child_id', childId)
    .eq('mode', mode)
    .single()

  // Only upsert if no existing record, or new score is better
  if (!existing || score > existing.best_score) {
    await supabase.from('child_comparison_scores').upsert(
      {
        child_id: childId,
        mode,
        best_score: score,
        best_total: total,
        last_played: new Date().toISOString(),
      },
      {
        onConflict: 'child_id,mode',
        ignoreDuplicates: false,
      }
    )
  }

  return NextResponse.json({ ok: true })
}
