import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LandingNav } from '@/components/marketing/landing-nav'
import { LandingFooter } from '@/components/marketing/landing-footer'

export const metadata: Metadata = {
  title: 'Welcome Back — Here\'s to a Great 2026–2027 School Year',
  description:
    "A new school year is here, and SolPrep is starting its second year right alongside it. Congratulations to every Virginia student heading into a new grade, and thank you to the parents making it happen.",
  keywords: [
    'back to school Virginia',
    'new school year 2026 2027',
    'SolPrep second year',
    'Virginia SOL new school year',
    'welcome back students',
  ],
  alternates: { canonical: 'https://solprep.app/blog/welcome-back-2026-2027-school-year' },
  openGraph: {
    type: 'article',
    publishedTime: '2026-08-11',
    authors: ['SolPrep'],
  },
}

const JSON_LD = [
  {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://solprep.app' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://solprep.app/blog' },
      { '@type': 'ListItem', position: 3, name: 'Welcome Back — Here\'s to a Great 2026–2027 School Year', item: 'https://solprep.app/blog/welcome-back-2026-2027-school-year' },
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Welcome Back — Here\'s to a Great 2026–2027 School Year',
    datePublished: '2026-08-11',
    author: { '@type': 'Organization', name: 'SolPrep' },
    publisher: { '@type': 'Organization', name: 'SolPrep', url: 'https://solprep.app' },
    url: 'https://solprep.app/blog/welcome-back-2026-2027-school-year',
  },
]

export default async function ArticlePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isLoggedIn = !!user

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <LandingNav isLoggedIn={isLoggedIn} />

      <main className="max-w-2xl mx-auto px-4 py-16 sm:py-24">
        <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← All posts
        </Link>

        <div className="mt-6 mb-2 text-sm font-semibold text-primary uppercase tracking-wide">Announcement</div>
        <h1 className="text-3xl sm:text-4xl font-bold leading-tight tracking-tight mb-4">
          Welcome Back — Here&apos;s to a Great 2026–2027 School Year
        </h1>
        <p className="text-sm text-muted-foreground mb-12">August 11, 2026 · 3 min read</p>

        <div className="space-y-8 text-muted-foreground leading-relaxed text-sm">

          <section className="space-y-3">
            <p>
              Backpacks are getting packed, school supply lists are getting checked twice, and somewhere
              out there a kid is dreading the first alarm clock of the year. Welcome back — the
              2026–2027 school year is here.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">To every student stepping into a new grade</h2>
            <p>
              Congratulations. Whatever grade you&apos;re walking into this fall, you got there by
              finishing the one before it — and that&apos;s worth pausing on for a second before the
              year sweeps you up. New teacher, new classroom, maybe a new school. New material that
              might feel hard before it feels easy. That&apos;s normal, and it&apos;s exactly how
              learning works.
            </p>
            <p>
              Good luck this year. Not just on the tests — on the whole thing: raising your hand when
              you&apos;re not sure, trying the hard problem before asking for help, and being kind to
              yourself on the days that don&apos;t go the way you wanted. We&apos;re rooting for you.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">To the parents making it all happen</h2>
            <p>
              None of this runs without you — the early mornings, the packed lunches, the homework
              check-ins, the quiet advocacy to make sure your kid gets what they need to succeed,
              accommodations included. Thank you for showing up for your kids, year after year.
              It doesn&apos;t go unnoticed.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">SolPrep is starting its second year too</h2>
            <p>
              We built SolPrep because we&apos;re parents too, and we wanted something free, honest,
              and genuinely built for kids who learn differently — real VDOE released SOL questions,
              accommodations that mirror what kids get in the classroom, and no ads or data sold, ever.
            </p>
            <p>
              This is our second school year, and we&apos;re grateful for every family who practiced
              with us last year, sent feedback, and helped us fix what wasn&apos;t working. That
              feedback shaped a lot of what SolPrep looks like today — the accommodation tiles, the
              scratchpad and highlighting tools, the summer learning games. We&apos;re looking forward
              to building more of it with you this year.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Here&apos;s to the year ahead</h2>
            <p>
              Whether you&apos;re easing back into a routine or diving straight into SOL prep for the
              spring, SolPrep is free and ready whenever you are — real practice questions, adaptive
              tiers, and accommodations built in for every learner.
            </p>
            <p>
              <Link href="/signup" className="text-primary underline">
                Create a free account
              </Link>{' '}
              and let&apos;s make it a great year.
            </p>
          </section>

        </div>
      </main>

      <LandingFooter isLoggedIn={isLoggedIn} />
    </div>
  )
}
