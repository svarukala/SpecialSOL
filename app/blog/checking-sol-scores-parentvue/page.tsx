import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LandingNav } from '@/components/marketing/landing-nav'
import { LandingFooter } from '@/components/marketing/landing-footer'

export const metadata: Metadata = {
  title: "How to Check Your Child's SOL Scores Online (ParentVUE & Parent Portals)",
  description:
    "Where to find Virginia SOL test results online — ParentVUE, division-specific parent portals, and what to do if you can't find a score report. A practical guide for Virginia parents.",
  keywords: [
    'ParentVUE SOL scores',
    'check SOL scores online',
    'Virginia SOL score portal',
    'ParentVUE Virginia',
    'how to find SOL test results',
    'SOL score report online',
    'parent portal SOL scores',
    'ParentVUE login Virginia schools',
    'SOL results not showing',
  ],
  alternates: { canonical: 'https://solprep.app/blog/checking-sol-scores-parentvue' },
  openGraph: {
    type: 'article',
    publishedTime: '2026-08-11',
    authors: ['SolPrep'],
  },
  robots: { index: false, follow: false },
}

const JSON_LD = [
  {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://solprep.app' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://solprep.app/blog' },
      { '@type': 'ListItem', position: 3, name: "How to Check Your Child's SOL Scores Online", item: 'https://solprep.app/blog/checking-sol-scores-parentvue' },
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: "How to Check Your Child's SOL Scores Online (ParentVUE & Parent Portals)",
    datePublished: '2026-08-11',
    author: { '@type': 'Organization', name: 'SolPrep' },
    publisher: { '@type': 'Organization', name: 'SolPrep', url: 'https://solprep.app' },
    url: 'https://solprep.app/blog/checking-sol-scores-parentvue',
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

        <div className="mt-6 mb-2 text-sm font-semibold text-primary uppercase tracking-wide">Education</div>
        <h1 className="text-3xl sm:text-4xl font-bold leading-tight tracking-tight mb-4">
          How to Check Your Child&apos;s SOL Scores Online
        </h1>
        <p className="text-sm text-muted-foreground mb-12">August 11, 2026 · 5 min read</p>

        <div className="space-y-8 text-muted-foreground leading-relaxed text-sm">

          <section className="space-y-3">
            <p>
              Virginia SOL scores don&apos;t always arrive the way parents expect. Some divisions mail a
              paper report home, some post results in an online parent portal, and some do both on
              different timelines. If you&apos;re searching for where your child&apos;s scores actually
              are, here&apos;s how to track them down — and what &ldquo;ParentVUE&rdquo; does and doesn&apos;t
              have to do with it.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">There is no single statewide portal</h2>
            <p>
              This is the most important thing to understand: Virginia has over 130 school divisions,
              and each one chooses its own student information system. There is no single state-run
              website where every Virginia parent logs in to see SOL scores. The Virginia Department of
              Education (VDOE) sets the tests and the scoring policy, but score delivery to families is
              handled locally, by your child&apos;s school division.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Where ParentVUE fits in</h2>
            <p>
              ParentVUE is a parent-portal product (part of the Synergy student information system)
              that a number of Virginia divisions use for gradebook access, attendance, schedules, and
              — in many of those divisions — SOL score history. If your division uses ParentVUE, SOL
              results typically show up under a &ldquo;Test History,&rdquo; &ldquo;Documents,&rdquo; or
              &ldquo;Student Info&rdquo; section of your account, sometimes with a delay of a few weeks
              after testing while results are processed and released to divisions.
            </p>
            <p>
              Other divisions use different systems entirely — PowerSchool, Focus, or a division-built
              portal — and some still primarily distribute results as a printed report sent home with
              your child or mailed to your address. If you&apos;re not sure which system your division
              uses, your school&apos;s front office or the division website&apos;s &ldquo;Parent Resources&rdquo;
              page is the fastest way to find out.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Steps to find your child&apos;s scores</h2>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li>
                <strong className="text-foreground">Check for a portal account.</strong> Most divisions
                set up a parent portal account (ParentVUE or otherwise) at enrollment. If you&apos;ve
                never activated yours, check enrollment paperwork or the school website for an
                activation key request.
              </li>
              <li>
                <strong className="text-foreground">Look for a specific test-results section</strong>,
                not just grades — SOL results are usually separate from report-card grades and may be
                under a distinct tab or a linked PDF report.
              </li>
              <li>
                <strong className="text-foreground">Mind the timeline.</strong> SOL results are typically
                released to divisions several weeks after the spring testing window closes, and divisions
                need time to load them into the portal or print reports — so a portal showing nothing yet
                in early June doesn&apos;t necessarily mean anything is wrong.
              </li>
              <li>
                <strong className="text-foreground">Call the school if it&apos;s been a while.</strong>{' '}
                If a testing season has fully passed and you still can&apos;t find a score anywhere, the
                school&apos;s testing coordinator or front office can look it up directly and tell you
                how your specific division distributes results.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Once you have the score, know what to read</h2>
            <p>
              A score report on its own can be dense — a scaled score, a performance level, and a table
              broken down by topic. We cover exactly how to read every part of it, including what the
              400-point passing threshold means and how to use the topic breakdown to target practice,
              in{' '}
              <Link href="/blog/how-to-read-sol-score-report" className="text-primary underline">
                How to Read Your Child&apos;s SOL Score Report
              </Link>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Turn the score into a plan</h2>
            <p>
              Once you know which topics need work, SolPrep lets your child practice those exact
              standards for free — real VDOE released questions organized by topic, for grades 3–8 in
              Math and Reading, with accommodations built in for kids with an IEP or 504 plan.
            </p>
            <p>
              <Link href="/signup" className="text-primary underline">
                Create a free account
              </Link>{' '}
              and start targeting the specific gaps the score report shows.
            </p>
          </section>

        </div>
      </main>

      <LandingFooter isLoggedIn={isLoggedIn} />
    </div>
  )
}
