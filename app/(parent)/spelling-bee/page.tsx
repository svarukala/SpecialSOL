import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function SpellingBeePage({
  searchParams,
}: {
  searchParams: Promise<{ childId?: string }>
}) {
  const { childId } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')


  const { data: children } = await supabase
    .from('children')
    .select('id, name, grade')
    .eq('parent_id', user.id)
    .order('created_at')

  if (!children || children.length === 0) redirect('/children/new')

  const activeChild = children.find((c) => c.id === childId) ?? children[0]

  const { data: recentSessions } = await supabase
    .from('spelling_sessions')
    .select('id, grade, total_words, correct_count, completed_at, started_at')
    .eq('child_id', activeChild.id)
    .order('started_at', { ascending: false })
    .limit(5)

  const grades = [3, 4, 5, 6, 7, 8]

  return (
    <main className="max-w-lg mx-auto p-6 space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          🐝 Spelling Bee
        </h1>
        <p className="text-sm text-muted-foreground">
          Hear a word, spell it right, learn where it came from.
        </p>
      </div>

      {children.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {children.map((child) => (
            <Link
              key={child.id}
              href={`/spelling-bee?childId=${child.id}`}
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

      <section className="space-y-3">
        <h2 className="font-semibold">Start a Round for {activeChild.name}</h2>
        <div className="grid grid-cols-3 gap-2">
          {grades.map((grade) => (
            <Link
              key={grade}
              href={`/spelling-bee/play?grade=${grade}&childId=${activeChild.id}`}
              className="flex flex-col items-center justify-center rounded-xl border border-border bg-background hover:border-primary hover:bg-primary/5 transition-colors p-4 gap-1"
            >
              <span className="text-lg font-bold text-primary">Grade {grade}</span>
              <span className="text-xs text-muted-foreground">10 words</span>
            </Link>
          ))}
        </div>
      </section>

      {recentSessions && recentSessions.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">Recent Sessions</h2>
          <div className="rounded-xl border divide-y">
            {recentSessions.map((session) => {
              const date = new Date(session.started_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })
              const completed = !!session.completed_at
              return (
                <div key={session.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">Grade {session.grade}</span>
                    <span className="text-muted-foreground">{date}</span>
                  </div>
                  {completed ? (
                    <span className="font-semibold text-primary">
                      {session.correct_count}/{session.total_words}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Incomplete</span>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}
    </main>
  )
}
