import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { SignOutButton } from '@/components/auth/sign-out-button'

const NAV_LINKS = [
  { href: '/dashboard', emoji: '📊', label: 'Dashboard' },
  { href: '/children/new', emoji: '➕', label: 'Add Child' },
  { href: '/settings', emoji: '⚙️', label: 'Settings' },
  { href: '/feedback', emoji: '💬', label: 'Feedback' },
]

const navLinkClass = 'inline-flex items-center justify-center gap-1 rounded-lg px-2 sm:px-2.5 h-8 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground'

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <nav className="max-w-5xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between gap-2">
          <Link href="/dashboard" className="font-bold text-base sm:text-lg tracking-tight shrink-0">
            <span className="hidden sm:inline">SOL Practice </span>
            <span className="sm:hidden">SOL </span>
            ⭐
          </Link>
          <div className="flex items-center gap-0.5 sm:gap-1">
            {NAV_LINKS.map(({ href, emoji, label }) => (
              <Link key={href} href={href} className={navLinkClass}>
                <span>{emoji}</span>
                <span className="hidden sm:inline">{label}</span>
              </Link>
            ))}
            <SignOutButton />
          </div>
        </nav>
      </header>
      <div>{children}</div>
    </div>
  )
}
