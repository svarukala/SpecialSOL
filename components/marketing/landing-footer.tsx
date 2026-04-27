import Link from 'next/link'
import Image from 'next/image'

const BASE_FOOTER_LINKS = [
  { href: '/#features', label: 'Features' },
  { href: '/#accommodations', label: 'Accommodations' },
  { href: '/our-story', label: 'Our Story' },
  { href: '/blog', label: 'Blog' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
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
      <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-start justify-between gap-6 text-sm text-muted-foreground">
        {/* Left: logo + tagline */}
        <div className="flex flex-col gap-1">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="SolPrep logo" width={24} height={24} className="rounded-md" />
            <span className="font-semibold text-foreground">SolPrep</span>
          </Link>
          <span className="text-xs">Virginia SOL practice for every learner · Grades 3–8</span>
          <span className="text-xs text-muted-foreground/40">v2026.04.27.6</span>
        </div>

        {/* Right: links row + coffee button below */}
        <div className="flex flex-col items-end gap-3">
          <div className="flex flex-wrap justify-end gap-x-4 gap-y-2">
            {[...BASE_FOOTER_LINKS, ...authLinks].map(({ href, label }) => (
              <Link key={href} href={href} className="hover:text-foreground transition-colors">
                {label}
              </Link>
            ))}
          </div>
          <a
            href="https://buymeacoffee.com/varuk"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 bg-[#FFDD00] text-[#000000] text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-[#FFDD00]/90 transition-colors"
          >
            ☕ Buy me a coffee
          </a>
        </div>
      </div>
    </footer>
  )
}
