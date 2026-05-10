import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { MoneyGameClient } from '@/components/money-match/money-game-client'

export default async function MoneyMatchPage({
  searchParams,
}: {
  searchParams: Promise<{ childId?: string }>
}) {
  const { childId: selectedId } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: parentRow } = await supabase
    .from('parents')
    .select('summer_learning_access')
    .eq('id', user.id)
    .single()
  if (!parentRow?.summer_learning_access) redirect('/dashboard?summer=waitlist')

  const { data: children } = await supabase
    .from('children')
    .select('id, name, grade, avatar')
    .eq('parent_id', user.id)
    .order('created_at')

  if (!children || children.length === 0) redirect('/children/new')

  const activeChild = children.find((c) => c.id === selectedId) ?? children[0]

  const { data: scores } = await supabase
    .from('child_money_scores')
    .select('mode, best_score, rounds_played')
    .eq('child_id', activeChild.id)

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">💰 Money Match</h1>
      <p className="text-sm text-muted-foreground">
        Identify coins, count money, and make change!
      </p>

      {children.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {children.map((child) => (
            <Link
              key={child.id}
              href={`/money-match?childId=${child.id}`}
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

      <MoneyGameClient childId={activeChild.id} scores={scores ?? []} />
    </main>
  )
}
