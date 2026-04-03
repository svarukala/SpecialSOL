import Link from 'next/link'

const FOOTER_LINKS = [
  { href: '/#features', label: 'Features' },
  { href: '/#accommodations', label: 'Accommodations' },
  { href: '/our-story', label: 'Our Story' },
  { href: '/login', label: 'Sign in' },
  { href: '/signup', label: 'Sign up' },
]

export function LandingFooter() {
  return (
    <footer className="border-t">
      <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <Link href="/" className="font-semibold text-foreground">SolPrep ⭐</Link>
        <span className="hidden sm:block">Virginia SOL practice for every learner · Grades 3–8</span>
        <div className="flex flex-wrap justify-center gap-4">
          {FOOTER_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className="hover:text-foreground transition-colors">
              {label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  )
}
