import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { WhType } from '@/components/question-quest/types'
import { WH_ORDER } from '@/components/question-quest/types'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const childId = searchParams.get('childId')
  if (!childId) return NextResponse.json({ error: 'childId is required' }, { status: 400 })

  const { data: child } = await supabase
    .from('children')
    .select('id')
    .eq('id', childId)
    .eq('parent_id', user.id)
    .single()
  if (!child) return NextResponse.json({ error: 'Child not found' }, { status: 404 })

  const { data: rows, error } = await supabase
    .from('child_wh_progress')
    .select('wh_type, questions_answered, correct_count, hint_count, is_mastered, last_practiced')
    .eq('child_id', childId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const byType = new Map((rows ?? []).map((r) => [r.wh_type as WhType, r]))

  const masteredSet = new Set(
    (rows ?? []).filter((r) => r.is_mastered).map((r) => r.wh_type as WhType)
  )

  function isUnlocked(wh: WhType): boolean {
    switch (wh) {
      case 'what': return true
      case 'where': return masteredSet.has('what') || (byType.get('what')?.questions_answered ?? 0) >= 5
      case 'who':  return masteredSet.has('where')
      case 'when': return masteredSet.has('who')
      case 'why':  return masteredSet.has('when')
      case 'how':  return masteredSet.has('why')
    }
  }

  const progress = WH_ORDER.map((wh) => {
    const row = byType.get(wh)
    return {
      wh_type: wh,
      questions_answered: row?.questions_answered ?? 0,
      correct_count: row?.correct_count ?? 0,
      hint_count: row?.hint_count ?? 0,
      is_mastered: row?.is_mastered ?? false,
      last_practiced: row?.last_practiced ?? null,
      isUnlocked: isUnlocked(wh),
    }
  })

  return NextResponse.json({ progress })
}
