import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { WhTypeBadge } from '@/components/question-quest/wh-type-badge'
import { WhQuestionDrill } from '@/components/question-quest/wh-question-drill'
import type { WhType } from '@/components/question-quest/types'

const VALID_WH_TYPES: WhType[] = ['what', 'where', 'who', 'when', 'why', 'how']

export default async function WhTypeDrillPage({
  params,
  searchParams,
}: {
  params: Promise<{ whType: string }>
  searchParams: Promise<{ childId?: string }>
}) {
  const { whType: rawType } = await params
  const { childId } = await searchParams

  if (!VALID_WH_TYPES.includes(rawType as WhType)) notFound()
  const whType = rawType as WhType

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: children } = await supabase
    .from('children')
    .select('id, name, avatar')
    .eq('parent_id', user.id)
    .order('created_at')

  if (!children || children.length === 0) redirect('/children/new')

  const activeChild = children.find((c) => c.id === childId) ?? children[0]

  const { data: progressRow } = await supabase
    .from('child_wh_progress')
    .select('questions_answered, correct_count, is_mastered')
    .eq('child_id', activeChild.id)
    .eq('wh_type', whType)
    .single()

  const answered = progressRow?.questions_answered ?? 0
  const correct = progressRow?.correct_count ?? 0
  const isMastered = progressRow?.is_mastered ?? false
  const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : null

  const masteryProgress = Math.min(answered, 10)
  const masteryTarget = 10

  return (
    <main className="max-w-lg mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/question-quest?childId=${activeChild.id}`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back
        </Link>
        <WhTypeBadge whType={whType} />
      </div>

      {children.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {children.map((child) => (
            <Link
              key={child.id}
              href={`/question-quest/${whType}?childId=${child.id}`}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 h-7 text-xs font-medium transition-colors whitespace-nowrap ${
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

      {answered > 0 && (
        <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Overall accuracy</span>
            <span className="font-semibold">{accuracy}%</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress toward mastery</span>
              <span>{masteryProgress}/{masteryTarget} questions</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${isMastered ? 'bg-green-500' : 'bg-primary'}`}
                style={{ width: `${(masteryProgress / masteryTarget) * 100}%` }}
              />
            </div>
            {isMastered && (
              <p className="text-xs text-green-600 font-medium">Mastered ✓ — keep practicing to stay sharp!</p>
            )}
            {!isMastered && answered >= 10 && accuracy !== null && accuracy < 80 && (
              <p className="text-xs text-muted-foreground">Need 80% accuracy over 10 questions to master this type.</p>
            )}
          </div>
        </div>
      )}

      <WhQuestionDrill
        childId={activeChild.id}
        whType={whType}
        initialCorrect={correct}
        initialAnswered={answered}
      />
    </main>
  )
}
