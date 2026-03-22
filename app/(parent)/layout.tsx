import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'

const NAV_LINKS = [
  { href: '/dashboard', label: '📊 Dashboard' },
  { href: '/children/new', label: '➕ Add Child' },
  { href: '/settings', label: '⚙️ Settings' },
  { href: '/feedback', label: '💬 Feedback' },
]

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
              <Link
                key={href}
                href={href}
                className={buttonVariants({ variant: 'ghost', size: 'sm' })}
              >
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
