import { createAdminClient } from '@/lib/supabase/server'

export const metadata = { title: 'Admin — Deleted Profiles' }

export default async function DeletedProfilesPage() {
  const admin = createAdminClient()

  const { data: rows } = await admin
    .from('deleted_profiles')
    .select('id, email, signed_up_at, deleted_at, child_count, session_count')
    .order('deleted_at', { ascending: false })

  const profiles = rows ?? []

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold">
          Deleted Profiles{' '}
          <span className="text-muted-foreground font-normal text-base">({profiles.length})</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Accounts that have been deleted. Data captured at time of deletion.
        </p>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Email</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Signed Up</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Deleted</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Children</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Sessions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {profiles.map(p => (
              <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium text-muted-foreground">{p.email}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {p.signed_up_at
                    ? new Date(p.signed_up_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : '—'}
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {new Date(p.deleted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{p.child_count}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{p.session_count}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {profiles.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">No deleted profiles yet.</div>
        )}
      </div>
    </main>
  )
}
