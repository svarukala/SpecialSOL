import { createAdminClient } from '@/lib/supabase/server'

export const metadata = { title: 'Admin — Users' }

export default async function AdminUsersPage() {
  const admin = createAdminClient()

  // 1. Auth users (provider info lives here)
  const { data: { users: authUsers } } = await admin.auth.admin.listUsers({ perPage: 500 })

  // 2. Parents, children, and session counts in parallel
  const [{ data: parents }, { data: children }, { data: sessions }] = await Promise.all([
    admin.from('parents').select('id, email, created_at, is_admin'),
    admin.from('children').select('id, parent_id, name, grade'),
    admin.from('practice_sessions').select('child_id, started_at'),
  ])

  // Index for fast lookup
  const parentMap = new Map((parents ?? []).map(p => [p.id, p]))
  const childrenByParent = new Map<string, typeof children>()
  for (const child of children ?? []) {
    if (!childrenByParent.has(child.parent_id)) childrenByParent.set(child.parent_id, [])
    childrenByParent.get(child.parent_id)!.push(child)
  }
  const sessionsByChild = new Map<string, number>()
  const lastSessionByChild = new Map<string, string>()
  for (const s of sessions ?? []) {
    sessionsByChild.set(s.child_id, (sessionsByChild.get(s.child_id) ?? 0) + 1)
    const prev = lastSessionByChild.get(s.child_id)
    if (!prev || s.started_at > prev) lastSessionByChild.set(s.child_id, s.started_at)
  }

  const rows = authUsers.map(u => ({
    id: u.id,
    email: u.email ?? '—',
    provider: (u.app_metadata?.provider as string) ?? 'email',
    signedUpAt: u.created_at,
    isAdmin: parentMap.get(u.id)?.is_admin ?? false,
    children: (childrenByParent.get(u.id) ?? []).map(c => ({
      ...c,
      sessions: sessionsByChild.get(c.id) ?? 0,
      lastSession: lastSessionByChild.get(c.id) ?? null,
    })),
  })).map(row => ({
    ...row,
    lastActive: row.children.reduce<string | null>((max, c) => {
      if (!c.lastSession) return max
      return !max || c.lastSession > max ? c.lastSession : max
    }, null),
  }))

  rows.sort((a, b) => new Date(b.signedUpAt).getTime() - new Date(a.signedUpAt).getTime())

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Users <span className="text-muted-foreground font-normal text-base">({rows.length})</span></h1>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Email</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Sign-up</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Joined</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Children</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Sessions</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Last Active</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map(user => (
              <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium">
                  {user.email}
                  {user.isAdmin && (
                    <span className="ml-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">admin</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                    user.provider === 'google'
                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {user.provider === 'google' ? '🔵 Google' : '✉️ Email'}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {new Date(user.signedUpAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td className="px-4 py-3">
                  {user.children.length === 0 ? (
                    <span className="text-muted-foreground text-xs">None</span>
                  ) : (
                    <div className="space-y-1">
                      {user.children.map(child => (
                        <div key={child.id} className="flex items-center gap-2">
                          <span>{child.name}</span>
                          <span className="text-xs text-muted-foreground">Grade {child.grade}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  {user.children.length === 0 ? (
                    <span className="text-muted-foreground text-xs">—</span>
                  ) : (
                    <div className="space-y-1">
                      {user.children.map(child => (
                        <div key={child.id} className="text-sm">
                          {child.sessions === 0
                            ? <span className="text-muted-foreground text-xs">No sessions yet</span>
                            : <span className="font-medium">{child.sessions} session{child.sessions !== 1 ? 's' : ''}</span>
                          }
                        </div>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {user.lastActive
                    ? new Date(user.lastActive).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : <span className="text-muted-foreground">—</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {rows.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">No users yet.</div>
        )}
      </div>
    </main>
  )
}
