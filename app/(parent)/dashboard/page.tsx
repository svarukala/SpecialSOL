import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StatCard } from '@/components/dashboard/stat-card'
import { ProgressChart } from '@/components/dashboard/progress-chart'
import { WeakAreasCallout } from '@/components/dashboard/weak-areas-callout'
import { ChildCard } from '@/components/dashboard/child-card'
import { SessionHistoryTable } from '@/components/dashboard/session-history-table'
import Link from 'next/link'
import { MilestonesCard } from '@/components/dashboard/milestones-card'
import { getAllChildTopicLevels, getRecentMilestones, getMasteredTopics } from '@/lib/supabase/queries'
import type { Milestone } from '@/lib/supabase/queries'
import { PromotionBanner } from '@/components/dashboard/promotion-banner'
import { WelcomeToast } from '@/components/dashboard/welcome-toast'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ childId?: string; welcome?: string }>
}) {
  const { welcome } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: children } = await supabase
    .from('children').select('*').eq('parent_id', user.id).order('created_at')

  // Fetch promotion-ready topics across all children
  const { data: promotionReadyRows } = children && children.length > 0
    ? await supabase
        .from('child_topic_levels')
        .select('child_id, subject, language_level')
        .in('child_id', children.map((c) => c.id))
        .eq('promotion_ready', true)
    : { data: [] }

  if (!children || children.length === 0) {
    return (
      <main className="max-w-lg mx-auto p-8 text-center space-y-4">
        <WelcomeToast isNew={welcome === '1'} />
        <h1 className="text-2xl font-bold">Welcome! 👋</h1>
        <p className="text-muted-foreground">Add your first child to get started.</p>
        <Link href="/children/new" className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-4 h-8 text-sm font-medium transition-colors hover:bg-primary/80">Add a Child</Link>
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

  const [{ data: sessions }, { data: pausedForChild }] = await Promise.all([
    supabase
      .from('practice_sessions')
      .select('*')
      .eq('child_id', activeChild.id)
      .eq('status', 'completed')
      .gte('started_at', thirtyDaysAgo)
      .order('started_at', { ascending: false }),
    supabase
      .from('practice_sessions')
      .select('id, child_id, subject, mode, question_count, current_index')
      .eq('child_id', activeChild.id)
      .eq('status', 'paused')
      .order('paused_at', { ascending: false }),
  ])

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

  const currentStreak = activeChild.current_streak ?? 0
  const bestStreak = activeChild.best_streak ?? 0
  const todayDate = new Date().toISOString().split('T')[0]
  const streakMilestone = activeChild.last_practice_date === todayDate
    ? ([100, 30, 7] as const).find((m) => currentStreak === m) ?? null
    : null

  const topicAccuracy: Record<string, { correct: number; total: number }> = {}
  for (const row of answersWithTopics ?? []) {
    const topic = (row.questions as unknown as { topic: string } | null)?.topic
    if (!topic) continue
    if (!topicAccuracy[topic]) topicAccuracy[topic] = { correct: 0, total: 0 }
    topicAccuracy[topic].total++
    if (row.is_correct) topicAccuracy[topic].correct++
  }

  const topicList = Object.entries(topicAccuracy)
    .map(([topic, { correct, total }]) => ({ topic, accuracy: correct / total }))
    .sort((a, b) => a.accuracy - b.accuracy)
  const weakTopics = topicList.filter((t) => t.accuracy < 0.65).slice(0, 2)

  const [milestones, topicLevels, masteredTopics] = await Promise.all([
    getRecentMilestones(supabase, activeChild.id).catch(() => [] as Milestone[]),
    getAllChildTopicLevels(supabase, activeChild.id).catch(() => ({} as Record<string, 'simplified' | 'standard'>)),
    getMasteredTopics(supabase, activeChild.id).catch(() => new Set<string>()),
  ])

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <WelcomeToast isNew={welcome === '1'} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link href="/children/new" className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-2.5 h-7 text-sm font-medium transition-colors hover:bg-muted">+ Add Child</Link>
      </div>
      {promotionReadyRows && promotionReadyRows.length > 0 && (
        <PromotionBanner
          children={children}
          promotionReady={promotionReadyRows}
        />
      )}
      {streakMilestone && (
        <div className="rounded-lg bg-orange-50 border border-orange-200 px-4 py-3 text-orange-800 font-medium text-sm">
          🔥 {activeChild.name} just hit a <span className="font-bold">{streakMilestone}-day streak</span> milestone — amazing consistency!
        </div>
      )}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {children.map((child) => (
          <ChildCard key={child.id} child={child} active={child.id === activeChild.id} />
        ))}
      </div>
      <Link
        href={`/practice/${activeChild.id}`}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-6 h-12 text-base font-semibold transition-colors hover:bg-primary/80 w-full"
      >
        🚀 Start Practice for {activeChild.name}
      </Link>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Sessions This Week" value={sessionsThisWeek} icon="📅" />
        <StatCard label="Avg Score" value={`${avgScore}%`} icon="⭐" />
        <StatCard label="Current Streak" value={`${currentStreak} days`} icon="🔥"
          sub={bestStreak > currentStreak ? `Best: ${bestStreak} days` : undefined} />
        <StatCard label="Topics Mastered" value={masteredTopics.size} icon="🏆" />
      </div>
      <MilestonesCard milestones={milestones} />
      <WeakAreasCallout topics={weakTopics} childName={activeChild.name} />
      <div>
        <h2 className="font-semibold mb-3">Progress by Topic</h2>
        <ProgressChart topics={topicList} topicLevels={topicLevels} masteredTopics={masteredTopics} />
      </div>
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-semibold">Recent Sessions</h2>
          <Link href={`/children/${activeChild.id}/edit`} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Clear history in Edit settings
          </Link>
        </div>
        <SessionHistoryTable sessions={sessions ?? []} pausedSessions={pausedForChild ?? []} childId={activeChild.id} />
      </div>
    </main>
  )
}
