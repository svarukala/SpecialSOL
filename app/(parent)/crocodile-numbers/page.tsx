import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { CrocodileGameClient } from '@/components/crocodile-numbers/crocodile-game-client'

export default async function CrocodileNumbersPage({
  searchParams,
}: {
  searchParams: Promise<{ childId?: string }>
}) {
  const { childId: selectedId } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')


  const { data: children } = await supabase
    .from('children')
    .select('id, name, grade, avatar')
    .eq('parent_id', user.id)
    .order('created_at')

  if (!children || children.length === 0) redirect('/children/new')

  const activeChild = children.find((c) => c.id === selectedId) ?? children[0]

  // fetch best scores for this child
  const { data: scores } = await supabase
    .from('child_comparison_scores')
    .select('mode, best_score, best_total')
    .eq('child_id', activeChild.id)

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">🐊 Crocodile Numbers</h1>
      <p className="text-sm text-muted-foreground">Which number is bigger? The hungry croc always eats the largest!</p>

      {children.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {children.map((child) => (
            <Link key={child.id} href={`/crocodile-numbers?childId=${child.id}`}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 h-8 text-sm font-medium transition-colors whitespace-nowrap ${
                child.id === activeChild.id ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background hover:bg-muted'
              }`}>
              <span>{child.avatar ?? '🧒'}</span><span>{child.name}</span>
            </Link>
          ))}
        </div>
      )}

      <CrocodileGameClient childId={activeChild.id} scores={scores ?? []} />
    </main>
  )
}
