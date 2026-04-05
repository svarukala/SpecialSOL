import Link from 'next/link'

const BASE_FOOTER_LINKS = [
  { href: '/#features', label: 'Features' },
  { href: '/#accommodations', label: 'Accommodations' },
  { href: '/our-story', label: 'Our Story' },
]

interface Props {
  isLoggedIn?: boolean
}

export function LandingFooter({ isLoggedIn }: Props) {
  const authLinks = isLoggedIn
    ? [{ href: '/dashboard', label: 'Dashboard' }]
    : [{ href: '/login', label: 'Sign in' }, { href: '/signup', label: 'Sign up' }]

  return (
    <footer className="border-t">
      <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <Link href="/" className="font-semibold text-foreground">SolPrep ⭐</Link>
        <span className="hidden sm:block">Virginia SOL practice for every learner · Grades 3–8</span>
        <div className="flex flex-wrap justify-center gap-4">
          {[...BASE_FOOTER_LINKS, ...authLinks].map(({ href, label }) => (
            <Link key={href} href={href} className="hover:text-foreground transition-colors">
              {label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  )
}
