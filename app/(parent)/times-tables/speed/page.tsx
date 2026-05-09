import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { TimesTablesDrillClient } from '@/components/times-tables/times-tables-drill-client'

export default async function TimesTablesSpeedPage({
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

  return (
    <main className="max-w-lg mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/times-tables?childId=${activeChild.id}`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← All Tables
        </Link>
        <h1 className="text-2xl font-bold">⚡ Speed Mode</h1>
      </div>

      <p className="text-sm text-muted-foreground">
        Random problems from all tables (2–12). Answer as fast as you can!
      </p>

      <TimesTablesDrillClient
        childId={activeChild.id}
        mode="speed"
      />
    </main>
  )
}
