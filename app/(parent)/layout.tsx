import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const NAV_LINKS = [
  { href: '/dashboard', label: '📊 Dashboard' },
  { href: '/children/new', label: '➕ Add Child' },
  { href: '/settings', label: '⚙️ Settings' },
  { href: '/feedback', label: '💬 Feedback' },
]

const navLinkClass = 'inline-flex items-center justify-center rounded-lg px-2.5 h-7 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground'

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <nav className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link href="/dashboard" className="font-bold text-lg tracking-tight">
            SOL Practice ⭐
          </Link>
          <div className="flex items-center gap-1">
            {NAV_LINKS.map(({ href, label }) => (
              <Link key={href} href={href} className={navLinkClass}>
                {label}
              </Link>
            ))}
          </div>
        </nav>
      </header>
      <div>{children}</div>
    </div>
  )
}
