import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LandingNav } from '@/components/marketing/landing-nav'
import { LandingFooter } from '@/components/marketing/landing-footer'

export const metadata: Metadata = {
  title: 'Why SolPrep Is Free — and Will Stay That Way',
  description:
    'The founder story behind SolPrep — a Virginia parent who built free SOL test prep for kids who learn differently, why there are no ads or subscriptions, and what sustainability looks like for a mission-driven tool.',
  keywords: [
    'free Virginia SOL practice',
    'free SOL test prep',
    'SolPrep free no subscription',
    'Virginia SOL prep no ads',
    'free IEP SOL accommodations',
    'Virginia parent SOL practice tool',
    'free special needs test prep',
    'why SolPrep is free',
  ],
  alternates: { canonical: 'https://solprep.app/blog/why-solprep-is-free' },
  openGraph: {
    type: 'article',
    publishedTime: '2026-11-02',
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
      { '@type': 'ListItem', position: 3, name: 'Why SolPrep Is Free — and Will Stay That Way', item: 'https://solprep.app/blog/why-solprep-is-free' },
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Why SolPrep Is Free — and Will Stay That Way',
    datePublished: '2026-11-02',
    author: { '@type': 'Organization', name: 'SolPrep' },
    publisher: { '@type': 'Organization', name: 'SolPrep', url: 'https://solprep.app' },
    url: 'https://solprep.app/blog/why-solprep-is-free',
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
          Why SolPrep Is Free — and Will Stay That Way
        </h1>
        <p className="text-sm text-muted-foreground mb-12">November 2, 2026 · 5 min read</p>

        <div className="space-y-8 text-muted-foreground leading-relaxed text-sm">

          <section className="space-y-3">
            <p>
              If you&apos;ve spent any time looking for SOL prep materials online, you&apos;ve probably noticed a pattern:
              free tools are thin, and the comprehensive ones want a monthly subscription. Some charge per child.
              Some hide the best features behind a paywall. Some are free but serve you ads that are more
              distracting than the practice questions themselves.
            </p>
            <p>
              SolPrep has no subscription, no ads, no paywall, and no premium tier. Everything on the platform —
              3,700+ practice questions, adaptive learning tiers, all IEP and 504 accommodations — is free for
              every family. That&apos;s not a launch promotion. It&apos;s the whole model. This post explains why.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Where this started</h2>
            <p>
              SolPrep exists because of one specific problem one Virginia parent couldn&apos;t find a solution to.
              My son is in elementary school. He has special needs and learns differently — not slower,
              not less capable, just differently. When SOL season arrived, I went looking for something to
              help him prepare.
            </p>
            <p>
              What I found were tools built for the average student. Grade-level questions, no accommodations,
              no way to start where he actually was and work up from there. The tools that existed for kids
              with special needs weren&apos;t connected to SOL standards. And the SOL-focused tools didn&apos;t
              consider kids like him. Every family in the same situation was on their own.
            </p>
            <p>
              So I built what I wished existed. A platform that uses real VDOE released questions, supports three
              learning tiers, and includes the same accommodations his school provides — text-to-speech,
              dyslexia-friendly font, bionic reading, extended time, high contrast — as simple toggles a
              parent can set once.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Why the price matters</h2>
            <p>
              The families who need this most are often the ones with the least budget for it. Raising a child
              with an IEP or 504 plan already involves costs most parents don&apos;t anticipate: evaluations,
              private therapy, tutoring, advocacy. Asking those same families to pay a monthly subscription for
              SOL prep that works the way their child&apos;s accommodations are supposed to work felt wrong.
            </p>
            <p>
              Virginia has families at every income level. Not every parent can afford a $20/month tool. And
              the stakes are real — a child who doesn&apos;t pass the Grade 3 Reading SOL faces retention risk.
              A child who passes with a 420 but has gaps in specific reporting categories will walk into
              middle school with compounding struggles that show up on every test afterward.
            </p>
            <p>
              Making SOL prep free isn&apos;t charity. It&apos;s just the right starting point when the goal is to
              actually help families, not to build a business around them.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">No ads — and why that matters too</h2>
            <p>
              Ad-supported education tools have a structural problem: the product is the child&apos;s
              attention. Every ad served is a moment of distraction, and distraction is the exact problem
              many of the kids using SolPrep are already working against. A child with ADHD who loses focus
              because an ad flashed on the screen hasn&apos;t gotten less distracted — they&apos;ve just learned
              that the practice environment is unreliable.
            </p>
            <p>
              SolPrep has no ads, no tracking pixels for ad networks, and no behavioral data sold to third
              parties. The platform knows what your child got right and wrong so it can help them practice
              better. That&apos;s where the data stops.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">What we actually collect — and what we don&apos;t</h2>
            <p>
              Parent accounts store an email address and a hashed password. Child profiles store a first name
              (or nickname — many families use initials), grade, and practice session history. That history
              is what powers the parent dashboard: accuracy by topic, sessions over time, hints used.
            </p>
            <p>
              We don&apos;t collect age, location, school, or anything that would create COPPA exposure beyond
              what we already handle. We don&apos;t sell, share, or license any data. We don&apos;t have
              an ad partner. There is no data pipeline that earns us money from what your child does on the platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">What sustainability looks like for a parent-built tool</h2>
            <p>
              The honest answer is that SolPrep runs on modest infrastructure costs. The questions are
              extracted from VDOE public domain PDFs — the source material is free. The platform is
              deployed on modern infrastructure with costs that scale with usage but stay manageable at
              the current scale. The software is maintained by one person with a lot of help from AI tools.
            </p>
            <p>
              This is possible because the scope is tight and the goal is clear: Virginia SOL prep for grades 3–8,
              math and reading, with accommodation support. Not a national platform, not a general learning
              management system. The constraint is part of the point. A focused tool can stay free and
              sustainable in a way that an everything-platform can&apos;t.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">What &quot;will stay that way&quot; means</h2>
            <p>
              No paywall is coming. There&apos;s no plan to introduce a free tier and a paid tier, no plan
              to lock accommodations behind a subscription, and no plan to monetize through ads. If that ever
              changes, it would be announced clearly and with meaningful lead time — not buried in a terms
              of service update.
            </p>
            <p>
              The platform was built for a specific kind of family navigating a specific challenge.
              That mission doesn&apos;t have a price point.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">What we need from you</h2>
            <p>
              If SolPrep is helping your family, the most useful things you can do are simple: tell another
              parent about it. Share the link in a school Facebook group, mention it at an IEP meeting,
              or email it to your child&apos;s teacher. Word of mouth from Virginia parents is how this
              platform reaches the families who need it most.
            </p>
            <p>
              If something isn&apos;t working — an accommodation that doesn&apos;t behave as expected, a question
              that seems wrong, a feature that would help a child you know — reach out at{' '}
              <a href="mailto:admin@t20squares.com" className="text-primary underline">admin@t20squares.com</a>.
              Every piece of feedback has shaped what the platform is today.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Start practicing — it&apos;s free</h2>
            <p>
              SolPrep covers Math and Reading for grades 3–8 with real VDOE questions, three adaptive
              learning tiers (Foundational, Simplified, and Standard), and full IEP/504 accommodation support.
              No credit card, no trial period, no premium tier.
            </p>
            <p>
              Create a free account at{' '}
              <a href="https://solprep.app/signup" className="text-primary underline">solprep.app/signup</a>{' '}
              and set up your child&apos;s profile in under two minutes. Set the grade, the starting tier, and
              whichever accommodations match what they use at school — then start practicing with the same
              real questions that have appeared on Virginia SOL tests.
            </p>
          </section>

        </div>
      </main>

      <LandingFooter isLoggedIn={isLoggedIn} />
    </div>
  )
}
