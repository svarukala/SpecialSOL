import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { MasteryGrid } from '@/components/times-tables/mastery-grid'
import type { MasteryRow } from '@/components/times-tables/mastery-grid'

export default async function TimesTablesPage({
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

  if (!children || children.length === 0) {
    redirect('/children/new')
  }

  const activeChild = children.find((c) => c.id === selectedId) ?? children[0]

  const { data: mastery } = await supabase
    .from('times_tables_mastery')
    .select('multiplier, attempts, correct, best_speed_ms')
    .eq('child_id', activeChild.id)

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Times Tables</h1>
        <Link
          href={`/times-tables/speed?childId=${activeChild.id}`}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 h-9 text-sm font-semibold transition-colors hover:bg-primary/80"
        >
          ⚡ Speed Mode
        </Link>
      </div>

      {children.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {children.map((child) => (
            <Link
              key={child.id}
              href={`/times-tables?childId=${child.id}`}
              className={`flex flex-col items-center gap-1 rounded-xl border px-4 py-3 text-sm font-medium transition-colors shrink-0 ${
                child.id === activeChild.id
                  ? 'border-primary bg-primary/10'
                  : 'border-muted hover:bg-muted/50'
              }`}
            >
              <span className="text-2xl">{child.avatar ?? '🧒'}</span>
              <span>{child.name}</span>
            </Link>
          ))}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Select a table to drill, or use Speed Mode for mixed practice.
      </p>

      <MasteryGrid mastery={(mastery ?? []) as MasteryRow[]} childId={activeChild.id} />
    </main>
  )
}
