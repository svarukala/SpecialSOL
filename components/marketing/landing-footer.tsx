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
      <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="SolPrep logo" width={24} height={24} className="rounded-md" />
          <span className="font-semibold text-foreground">SolPrep</span>
        </Link>
        <span className="hidden sm:block">Virginia SOL practice for every learner · Grades 3–8</span>
        <div className="flex flex-wrap items-center justify-center gap-4">
          {[...BASE_FOOTER_LINKS, ...authLinks].map(({ href, label }) => (
            <Link key={href} href={href} className="hover:text-foreground transition-colors">
              {label}
            </Link>
          ))}
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
