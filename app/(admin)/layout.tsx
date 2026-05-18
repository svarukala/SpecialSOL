import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { LandingFooter } from '@/components/marketing/landing-footer'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: parent } = await supabase
    .from('parents')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!parent?.is_admin) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <nav className="max-w-5xl mx-auto px-3 sm:px-4 h-14 flex items-center gap-4">
          <span className="font-bold text-sm">🛠️ Admin</span>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/admin/generate" className="hover:underline">Generate &amp; Review</Link>
            <span className="text-muted-foreground">|</span>
            <Link href="/admin/questions" className="hover:underline">Published Questions</Link>
            <span className="text-muted-foreground">|</span>
            <Link href="/admin/users" className="hover:underline">Users</Link>
            <span className="text-muted-foreground">|</span>
            <Link href="/admin/feedback" className="hover:underline">Feedback</Link>
            <span className="text-muted-foreground">|</span>
            <Link href="/admin/engagement" className="hover:underline">Engagement</Link>
            <span className="text-muted-foreground">|</span>
            <Link href="/admin/stories" className="hover:underline">Stories</Link>
            <span className="text-muted-foreground">|</span>
            <Link href="/admin/deleted" className="hover:underline">Deleted</Link>
            <span className="text-muted-foreground">|</span>
            <Link href="/admin/early-access" className="hover:underline">Early Access</Link>
            <span className="text-muted-foreground">|</span>
            <Link href="/dashboard" className="text-muted-foreground hover:underline">← Dashboard</Link>
          </div>
        </nav>
      </header>
      <div>{children}</div>
      <LandingFooter isLoggedIn />
    </div>
  )
}
