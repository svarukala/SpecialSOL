import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StatCard } from '@/components/dashboard/stat-card'
import { ProgressChart } from '@/components/dashboard/progress-chart'
import { WeakAreasCallout } from '@/components/dashboard/weak-areas-callout'
import { ChildCard } from '@/components/dashboard/child-card'
import { SessionHistoryTable } from '@/components/dashboard/session-history-table'
import { buttonVariants } from '@/components/ui/button'
import Link from 'next/link'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ childId?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: children } = await supabase
    .from('children').select('*').eq('parent_id', user.id).order('created_at')

  if (!children || children.length === 0) {
    return (
      <main className="max-w-lg mx-auto p-8 text-center space-y-4">
        <h1 className="text-2xl font-bold">Welcome! 👋</h1>
        <p className="text-muted-foreground">Add your first child to get started.</p>
        <Link href="/children/new" className={buttonVariants()}>Add a Child</Link>
      </main>
    )
  }

  const { childId: selectedId } = await searchParams
  const activeChild = children.find((c) => c.id === selectedId) ?? children[0]

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const mondayThisWeek = (() => {
    const d = new Date()
    const day = d.getDay()
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
    d.setHours(0,0,0,0)
    return d.toISOString()
  })()

  const { data: sessions } = await supabase
    .from('practice_sessions')
    .select('*')
    .eq('child_id', activeChild.id)
    .eq('status', 'completed')
    .gte('started_at', thirtyDaysAgo)
    .order('started_at', { ascending: false })

  const sessionIds = (sessions ?? []).map((s) => s.id)

  const { data: answersWithTopics } = sessionIds.length > 0
    ? await supabase
        .from('session_answers')
        .select('is_correct, questions(topic)')
        .in('session_id', sessionIds)
    : { data: [] }

  const sessionsThisWeek = (sessions ?? []).filter((s) => s.started_at >= mondayThisWeek).length
  const last10 = (sessions ?? []).slice(0, 10)
  const avgScore = last10.length > 0
    ? Math.round(last10.reduce((sum, s) => sum + (s.score_percent ?? 0), 0) / last10.length)
    : 0

  const sessionDays = new Set((sessions ?? []).map((s) => new Date(s.started_at).toDateString()))
  let streak = 0
  for (let i = 0; ; i++) {
    const d = new Date(); d.setDate(d.getDate() - i)
    if (sessionDays.has(d.toDateString())) streak++
    else break
  }

  const topicAccuracy: Record<string, { correct: number; total: number }> = {}
  for (const row of answersWithTopics ?? []) {
    const topic = (row.questions as { topic: string } | null)?.topic
    if (!topic) continue
    if (!topicAccuracy[topic]) topicAccuracy[topic] = { correct: 0, total: 0 }
    topicAccuracy[topic].total++
    if (row.is_correct) topicAccuracy[topic].correct++
  }

  const topicList = Object.entries(topicAccuracy)
    .map(([topic, { correct, total }]) => ({ topic, accuracy: correct / total }))
    .sort((a, b) => a.accuracy - b.accuracy)
  const weakTopics = topicList.filter((t) => t.accuracy < 0.65).slice(0, 2)

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link href="/children/new" className={buttonVariants({ variant: 'outline', size: 'sm' })}>+ Add Child</Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {children.map((child) => (
          <ChildCard key={child.id} child={child} active={child.id === activeChild.id} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Sessions This Week" value={sessionsThisWeek} icon="📅" />
        <StatCard label="Avg Score" value={`${avgScore}%`} icon="⭐" />
        <StatCard label="Current Streak" value={`${streak} days`} icon="🔥" />
      </div>
      <WeakAreasCallout topics={weakTopics} childName={activeChild.name} />
      <div>
        <h2 className="font-semibold mb-3">Progress by Topic</h2>
        <ProgressChart topics={topicList} />
      </div>
      <div>
        <h2 className="font-semibold mb-3">Recent Sessions</h2>
        <SessionHistoryTable sessions={sessions ?? []} />
      </div>
    </main>
  )
}
