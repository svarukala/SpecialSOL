import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { storyId } = await params
  const { childId, reflection } = await req.json() as { childId: string; reflection?: string }

  if (!childId) {
    return NextResponse.json({ error: 'childId required' }, { status: 400 })
  }

  const { data: child } = await supabase
    .from('children')
    .select('id')
    .eq('id', childId)
    .eq('parent_id', user.id)
    .single()

  if (!child) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { error } = await supabase
    .from('story_reads')
    .upsert(
      { child_id: childId, story_id: storyId, reflection: reflection ?? null, read_at: new Date().toISOString() },
      { onConflict: 'child_id,story_id' }
    )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
