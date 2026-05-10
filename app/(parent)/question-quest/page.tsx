import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { WhProgressGrid } from '@/components/question-quest/wh-progress-grid'
import type { ProgressRow, WhType } from '@/components/question-quest/types'
import { WH_ORDER } from '@/components/question-quest/types'

function computeProgress(
  rows: Array<{ wh_type: string; questions_answered: number; correct_count: number; hint_count: number; is_mastered: boolean; last_practiced: string | null }>
): ProgressRow[] {
  const byType = new Map(rows.map((r) => [r.wh_type as WhType, r]))
  const masteredSet = new Set(rows.filter((r) => r.is_mastered).map((r) => r.wh_type as WhType))

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

  return WH_ORDER.map((wh) => {
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
}

export default async function QuestionQuestPage({
  searchParams,
}: {
  searchParams: Promise<{ childId?: string }>
}) {
  const { childId } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: parentRow } = await supabase.from('parents').select('summer_learning_access').eq('id', user.id).single()
  if (!parentRow?.summer_learning_access) redirect('/dashboard?summer=waitlist')

  const { data: children } = await supabase
    .from('children')
    .select('id, name, avatar')
    .eq('parent_id', user.id)
    .order('created_at')

  if (!children || children.length === 0) redirect('/children/new')

  const activeChild = children.find((c) => c.id === childId) ?? children[0]

  const { data: rawProgress } = await supabase
    .from('child_wh_progress')
    .select('wh_type, questions_answered, correct_count, hint_count, is_mastered, last_practiced')
    .eq('child_id', activeChild.id)

  const progress = computeProgress(rawProgress ?? [])
  const totalAnswered = progress.reduce((s, r) => s + r.questions_answered, 0)
  const typesMastered = progress.filter((r) => r.is_mastered).length

  const firstUnlocked = WH_ORDER.find((wh) => {
    const row = progress.find((r) => r.wh_type === wh)
    return row?.isUnlocked && !row?.is_mastered
  })

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          ❓ Question Quest
        </h1>
        <p className="text-sm text-muted-foreground">
          Master Wh-questions — What, Where, Who, When, Why, and How.
        </p>
      </div>

      {children.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {children.map((child) => (
            <Link
              key={child.id}
              href={`/question-quest?childId=${child.id}`}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 h-8 text-sm font-medium transition-colors whitespace-nowrap ${
                child.id === activeChild.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background hover:bg-muted'
              }`}
            >
              <span>{child.avatar ?? '🧒'}</span>
              <span>{child.name}</span>
            </Link>
          ))}
        </div>
      )}

      {totalAnswered > 0 && (
        <div className="flex items-center gap-6 rounded-xl border bg-muted/20 px-5 py-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{totalAnswered}</p>
            <p className="text-xs text-muted-foreground">Questions answered</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{typesMastered}/6</p>
            <p className="text-xs text-muted-foreground">Types mastered</p>
          </div>
          {firstUnlocked && (
            <div className="ml-auto">
              <Link
                href={`/question-quest/${firstUnlocked}?childId=${activeChild.id}`}
                className="inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground px-4 h-9 text-sm font-semibold hover:bg-primary/80 transition-colors"
              >
                Start Practicing
              </Link>
            </div>
          )}
        </div>
      )}

      {totalAnswered === 0 && firstUnlocked && (
        <Link
          href={`/question-quest/${firstUnlocked}?childId=${activeChild.id}`}
          className="inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground px-6 h-10 text-sm font-semibold hover:bg-primary/80 transition-colors"
        >
          Start Practicing
        </Link>
      )}

      <WhProgressGrid progress={progress} childId={activeChild.id} />
    </main>
  )
}
