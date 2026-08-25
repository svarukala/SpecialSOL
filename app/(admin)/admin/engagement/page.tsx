import { createAdminClient } from '@/lib/supabase/server'
import { EngagementSegments } from '@/components/admin/engagement-segments'
import { TestEmailButton } from '@/components/admin/test-email-button'

export const metadata = { title: 'Admin — Engagement' }

const MIN_AGE_DAYS: Record<string, number> = {
  no_children: 3,
  no_sessions: 5,
  never_completed: 7,
  single_session: 7,
  inactive_14d: 14,
  inactive_30d: 30,
  paused_session: 5,
  summer_update_may2025: 0,
}

export interface EngagementRow {
  parentId: string
  parentEmail: string
  signedUpAt: string
  childNames: string[]
  lastSessionDate: string | null
  lastNudgeSentAt: string | null
  nudgeCount: number
  pausedSessions: number
  completedSessions: number
}

export default async function EngagementPage() {
  const admin = createAdminClient()

  // Load all data in parallel
  const [
    { data: { users: authUsers } },
    { data: parents },
    { data: children },
    { data: sessions },
  ] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 500 }),
    admin.from('parents').select('id, email, created_at, is_admin, last_nudge_sent_at, nudge_count'),
    admin.from('children').select('id, parent_id, name, created_at'),
    admin.from('practice_sessions').select('id, child_id, started_at, status'),
  ])

  const authEmailMap = new Map((authUsers ?? []).map(u => [u.id, u.email ?? '']))
  const parentMeta = new Map((parents ?? []).map(p => [p.id, p]))

  // Index children by parent
  const childrenByParent = new Map<string, Array<{ id: string; name: string; created_at: string }>>()
  for (const c of children ?? []) {
    if (!childrenByParent.has(c.parent_id)) childrenByParent.set(c.parent_id, [])
    childrenByParent.get(c.parent_id)!.push(c)
  }

  // Index sessions by child
  const sessionsByChild = new Map<string, Array<{ id: string; started_at: string; status: string }>>()
  for (const s of sessions ?? []) {
    if (!sessionsByChild.has(s.child_id)) sessionsByChild.set(s.child_id, [])
    sessionsByChild.get(s.child_id)!.push(s)
  }

  const now = Date.now()

  // Build one row per parent
  const allRows: EngagementRow[] = (parents ?? [])
    .filter(p => !p.is_admin)
    .map(p => {
      const email = authEmailMap.get(p.id) ?? p.email ?? ''
      const kids = childrenByParent.get(p.id) ?? []
      const childNames = kids.map(c => c.name)

      let completedSessions = 0
      let pausedSessions = 0
      let lastSessionDate: string | null = null

      for (const kid of kids) {
        for (const s of sessionsByChild.get(kid.id) ?? []) {
          if (s.status === 'completed') {
            completedSessions++
            if (!lastSessionDate || s.started_at > lastSessionDate) lastSessionDate = s.started_at
          }
          if (s.status === 'paused') pausedSessions++
        }
      }

      return {
        parentId: p.id,
        parentEmail: email,
        signedUpAt: p.created_at,
        childNames,
        lastSessionDate,
        lastNudgeSentAt: p.last_nudge_sent_at ?? null,
        nudgeCount: p.nudge_count ?? 0,
        pausedSessions,
        completedSessions,
      }
    })

  function daysSince(iso: string) {
    return (now - new Date(iso).getTime()) / (1000 * 60 * 60 * 24)
  }

  // Build segments
  const segments = {
    no_children: allRows.filter(r =>
      r.childNames.length === 0 &&
      daysSince(r.signedUpAt) >= MIN_AGE_DAYS.no_children
    ),
    no_sessions: allRows.filter(r =>
      r.childNames.length > 0 &&
      r.completedSessions === 0 &&
      r.pausedSessions === 0 &&
      daysSince(r.signedUpAt) >= MIN_AGE_DAYS.no_sessions
    ),
    never_completed: allRows.filter(r =>
      r.childNames.length > 0 &&
      r.completedSessions === 0 &&
      r.pausedSessions > 0 &&
      daysSince(r.signedUpAt) >= MIN_AGE_DAYS.never_completed
    ),
    single_session: allRows.filter(r =>
      r.completedSessions === 1 &&
      r.lastSessionDate !== null &&
      daysSince(r.lastSessionDate) >= MIN_AGE_DAYS.single_session
    ),
    inactive_14d: allRows.filter(r =>
      r.completedSessions > 1 &&
      r.lastSessionDate !== null &&
      daysSince(r.lastSessionDate) >= MIN_AGE_DAYS.inactive_14d &&
      daysSince(r.lastSessionDate) < MIN_AGE_DAYS.inactive_30d
    ),
    inactive_30d: allRows.filter(r =>
      r.completedSessions > 0 &&
      r.lastSessionDate !== null &&
      daysSince(r.lastSessionDate) >= MIN_AGE_DAYS.inactive_30d
    ),
    paused_session: allRows.filter(r =>
      r.pausedSessions > 0 &&
      daysSince(r.signedUpAt) >= MIN_AGE_DAYS.paused_session
    ),
    summer_update_may2025: allRows,
    weekly_challenge: allRows.filter(r => r.childNames.length > 0),
    welcome_back_2026: allRows,
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">Engagement</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Identify parents by activity state and send a helpful nudge email. Admins and users nudged in the last 7 days are excluded automatically.
          </p>
        </div>
        <TestEmailButton />
      </div>
      <EngagementSegments segments={segments} />
    </main>
  )
}
