import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { TimesTablesDrillClient } from '@/components/times-tables/times-tables-drill-client'

export default async function TimesTablesDrillPage({
  params,
  searchParams,
}: {
  params: Promise<{ multiplier: string }>
  searchParams: Promise<{ childId?: string }>
}) {
  const { multiplier: multiplierStr } = await params
  const { childId: selectedId } = await searchParams

  const multiplier = parseInt(multiplierStr, 10)
  if (isNaN(multiplier) || multiplier < 2 || multiplier > 12) {
    redirect('/times-tables')
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: children } = await supabase
    .from('children')
    .select('id, name, grade, avatar')
    .eq('parent_id', user.id)
    .order('created_at')

  if (!children || children.length === 0) {
    redirect('/children/new')
  }

  const activeChild = children.find((c) => c.id === selectedId) ?? children[0]

  const { data: mastery } = await supabase
    .from('times_tables_mastery')
    .select('attempts, correct, best_speed_ms')
    .eq('child_id', activeChild.id)
    .eq('multiplier', multiplier)
    .single()

  const accuracy = mastery && mastery.attempts > 0
    ? Math.round((mastery.correct / mastery.attempts) * 100)
    : null

  return (
    <main className="max-w-lg mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/times-tables?childId=${activeChild.id}`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← All Tables
        </Link>
        <h1 className="text-2xl font-bold">{multiplier}× Table</h1>
      </div>

      {accuracy !== null && (
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>Accuracy: <strong className="text-foreground">{accuracy}%</strong></span>
          {mastery?.best_speed_ms != null && (
            <span>
              Best: <strong className="text-foreground">{(mastery.best_speed_ms / 1000).toFixed(1)}s</strong>
            </span>
          )}
        </div>
      )}

      <TimesTablesDrillClient
        childId={activeChild.id}
        multiplier={multiplier}
        mode="drill"
      />
    </main>
  )
}
