import Link from 'next/link'
import Image from 'next/image'

interface Props {
  activePage?: 'home' | 'our-story'
  isLoggedIn?: boolean
}

const NAV_LINKS = [
  { href: '/#features', label: 'Features' },
  { href: '/#accommodations', label: 'Accommodations' },
  { href: '/our-story', label: 'Our Story' },
]

export function LandingNav({ activePage, isLoggedIn }: Props) {
  return (
    <header className="border-b sticky top-0 z-10 bg-background/95 backdrop-blur">
      <nav className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image src="/logo.png" alt="SolPrep logo" width={32} height={32} className="rounded-lg" />
          <span className="font-bold text-lg tracking-tight">SolPrep</span>
        </Link>

        <div className="hidden sm:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = activePage === 'our-story' && href === '/our-story'
            return (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'text-foreground font-medium bg-muted'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </div>

        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="text-sm font-medium bg-primary text-primary-foreground px-4 py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="text-sm font-medium bg-primary text-primary-foreground px-4 py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
              >
                Get started free
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Mobile nav links */}
      <div className="sm:hidden border-t flex overflow-x-auto">
        {NAV_LINKS.map(({ href, label }) => {
          const isActive = activePage === 'our-story' && href === '/our-story'
          return (
            <Link
              key={href}
              href={href}
              className={`shrink-0 px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </Link>
          )
        })}
      </div>
    </header>
  )
}
