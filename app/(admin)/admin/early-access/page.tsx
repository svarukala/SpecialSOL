import { createAdminClient } from '@/lib/supabase/server'
import { approveEarlyAccess, revokeEarlyAccess } from './actions'

export const metadata = { title: 'Admin — Early Access' }

export default async function EarlyAccessPage() {
  const admin = createAdminClient()

  const { data: rows } = await admin
    .from('parents')
    .select('id, email, created_at, summer_learning_requested, summer_learning_access')
    .or('summer_learning_requested.eq.true,summer_learning_access.eq.true')
    .order('created_at', { ascending: false })

  const pending = (rows ?? []).filter(r => r.summer_learning_requested && !r.summer_learning_access)
  const approved = (rows ?? []).filter(r => r.summer_learning_access)

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-xl font-bold">Early Access</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage Summer Learning access requests.</p>
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold text-sm">
          Pending Requests{' '}
          <span className="text-muted-foreground font-normal">({pending.length})</span>
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending requests.</p>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Email</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Signed Up</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {pending.map(r => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{r.email}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <form action={approveEarlyAccess.bind(null, r.id, r.email)}>
                        <button
                          type="submit"
                          className="rounded-lg bg-primary text-primary-foreground px-3 h-7 text-xs font-medium hover:bg-primary/80 transition-colors"
                        >
                          Approve
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-sm">
          Approved{' '}
          <span className="text-muted-foreground font-normal">({approved.length})</span>
        </h2>
        {approved.length === 0 ? (
          <p className="text-sm text-muted-foreground">No approved users yet.</p>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Email</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Signed Up</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {approved.map(r => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{r.email}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <form action={revokeEarlyAccess.bind(null, r.id)}>
                        <button
                          type="submit"
                          className="rounded-lg border border-border px-3 h-7 text-xs font-medium hover:bg-muted transition-colors text-muted-foreground"
                        >
                          Revoke
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
