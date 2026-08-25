// app/(parent)/badges/page.tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

interface ChildBadge {
  id: string
  badge_key: string
  badge_type: 'puzzle' | 'streak_milestone'
  title: string
  emoji: string
  earned_at: string
}

export default async function BadgesPage({
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
    .select('id, name')
    .eq('parent_id', user.id)
    .order('created_at')

  if (!children || children.length === 0) redirect('/children/new')

  const activeChild = children.find((c) => c.id === selectedId) ?? children[0]

  const { data: badges } = await supabase
    .from('child_badges')
    .select('id, badge_key, badge_type, title, emoji, earned_at')
    .eq('child_id', activeChild.id)
    .order('earned_at', { ascending: false })

  const puzzleBadges = (badges as ChildBadge[] | null)?.filter((b) => b.badge_type === 'puzzle') ?? []
  const streakBadges = (badges as ChildBadge[] | null)?.filter((b) => b.badge_type === 'streak_milestone') ?? []

  function BadgeGrid({ items }: { items: ChildBadge[] }) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {items.map((b) => (
          <div key={b.id} className="flex flex-col items-center gap-1 rounded-xl border border-border p-3 text-center">
            <span className="text-3xl">{b.emoji}</span>
            <span className="text-xs font-medium">{b.title}</span>
            <span className="text-[10px] text-muted-foreground">
              {new Date(b.earned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <main className="max-w-lg mx-auto p-6 space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold flex items-center gap-2">🏅 My Badges</h1>
        <p className="text-sm text-muted-foreground">Badges {activeChild.name} has earned from the Weekly Challenge.</p>
      </div>

      {children.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {children.map((child) => (
            <Link
              key={child.id}
              href={`/badges?childId=${child.id}`}
              className={`inline-flex items-center rounded-lg border px-3 h-8 text-sm font-medium transition-colors whitespace-nowrap ${
                child.id === activeChild.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background hover:bg-muted'
              }`}
            >
              {child.name}
            </Link>
          ))}
        </div>
      )}

      {puzzleBadges.length === 0 && streakBadges.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No badges yet —{' '}
          <Link href={`/challenge?childId=${activeChild.id}`} className="text-primary hover:underline">
            solve this week&apos;s challenge
          </Link>{' '}
          to earn your first one!
        </p>
      ) : (
        <div className="space-y-6">
          {puzzleBadges.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold">Puzzle Badges</h2>
              <BadgeGrid items={puzzleBadges} />
            </section>
          )}
          {streakBadges.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold">Streak Badges</h2>
              <BadgeGrid items={streakBadges} />
            </section>
          )}
        </div>
      )}
    </main>
  )
}
