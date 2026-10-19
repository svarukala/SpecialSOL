import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LandingNav } from '@/components/marketing/landing-nav'
import { LandingFooter } from '@/components/marketing/landing-footer'

export const metadata: Metadata = {
  title: '5 Things Parents Can Do Right Now to Help With SOL Prep — SolPrep',
  description:
    'A practical checklist for Virginia parents: short daily sessions, real VDOE practice questions, reading the score report, targeting weak topics, and keeping SOL prep low-stakes at home.',
  keywords: [
    'Virginia SOL prep tips for parents',
    'how to help child prepare for SOL',
    'SOL test preparation at home',
    'Virginia SOL practice questions',
    'SOL score report targeting',
    'low stakes test prep Virginia',
    'daily SOL practice routine',
    'VDOE released test questions',
  ],
  alternates: { canonical: 'https://solprep.app/blog/sol-prep-tips-for-parents' },
  openGraph: {
    type: 'article',
    publishedTime: '2026-10-19',
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
      { '@type': 'ListItem', position: 3, name: '5 Things Parents Can Do Right Now to Help With SOL Prep', item: 'https://solprep.app/blog/sol-prep-tips-for-parents' },
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: '5 Things Parents Can Do Right Now to Help With SOL Prep',
    datePublished: '2026-10-19',
    author: { '@type': 'Organization', name: 'SolPrep' },
    publisher: { '@type': 'Organization', name: 'SolPrep', url: 'https://solprep.app' },
    url: 'https://solprep.app/blog/sol-prep-tips-for-parents',
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
          5 Things Parents Can Do Right Now to Help With SOL Prep
        </h1>
        <p className="text-sm text-muted-foreground mb-12">October 19, 2026 · 5 min read</p>

        <div className="space-y-8 text-muted-foreground leading-relaxed text-sm">

          <section className="space-y-3">
            <p>
              SOL season has a way of sneaking up. One day you&apos;re settled into the school-year routine, and
              the next you&apos;re reading a note from the teacher about spring testing. The good news is that
              the most effective SOL prep doesn&apos;t require tutors, expensive workbooks, or marathon study
              sessions. It requires consistency, the right materials, and a low-pressure environment — all things
              parents can set up at home starting today.
            </p>
            <p>
              Here are five concrete things you can do right now, regardless of your child&apos;s grade or subject.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">1. Make practice sessions short — and daily</h2>
            <p>
              The research on learning and memory is consistent: spaced repetition beats massed practice.
              Ten minutes of focused SOL practice every day is worth more than a two-hour session on Sunday.
              Short sessions fit into the existing routine without creating a &quot;big deal&quot; around testing,
              and they let the brain consolidate what it learned before the next session builds on it.
            </p>
            <p>
              A useful target is 10–15 minutes on school days. That&apos;s one episode of a favorite show
              shortened, or the time between dinner and homework. The key is doing it at the same time each
              day so it becomes habit rather than negotiation. If your child resists, start smaller: five
              questions, no timer, no pressure. Build from there.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">2. Practice with real VDOE questions — not generic test prep</h2>
            <p>
              Virginia SOL questions have a distinctive style. They use specific vocabulary, specific question
              structures, and test specific standards — and that specificity matters more than it might seem.
              A child who has only practiced with generic reading comprehension worksheets may struggle not
              because they don&apos;t understand the content, but because the question format is unfamiliar.
            </p>
            <p>
              The Virginia Department of Education releases actual test questions from prior years, organized
              by grade and subject. These are the gold standard for practice because they&apos;re written by
              the same team that writes the real test. SolPrep is built entirely from these released questions —
              every question your child sees on the platform appeared on an actual Virginia SOL test.
              There is no substitute for practicing with the real thing.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">3. Read the score report and target the weak spots</h2>
            <p>
              If your child has already taken an SOL test — or a school-administered benchmark that mirrors the
              SOL format — you likely received a score report. Most parents look at the overall score, note whether
              it&apos;s passing or not, and stop there. The most valuable part of the report is actually the
              reporting category breakdown at the bottom.
            </p>
            <p>
              Virginia SOL score reports divide the test into reporting categories — for example, a Grade 5 Math
              report might show separate scores for &quot;Number and Number Sense,&quot; &quot;Computation and
              Estimation,&quot; and &quot;Measurement and Geometry.&quot; A child can score 450 overall (passing)
              while still scoring below proficiency in one or two specific categories. Those categories are exactly
              where practice time should go. Unfocused review of everything is less efficient than targeted
              review of the actual gaps.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">4. Use the accommodations your child already has</h2>
            <p>
              If your child has an IEP or 504 plan, their accommodations don&apos;t only apply in school —
              they reflect how your child actually learns best. A child who is approved for text-to-speech on
              the SOL should be practicing with text-to-speech at home. A child who gets extended time on
              assessments shouldn&apos;t be doing timed practice at home that creates the same anxiety the
              accommodation was designed to remove.
            </p>
            <p>
              One of the reasons SolPrep was built the way it was is that most test prep tools don&apos;t offer
              the accommodations that are in children&apos;s IEPs. The platform includes text-to-speech,
              dyslexia font, bionic reading, high contrast mode, extended time (timer removal), and step-by-step
              hints — all toggleable from a parent dashboard. Practicing with your child&apos;s actual accommodations
              active helps them build familiarity with both the content and the format they&apos;ll use on test day.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">5. Keep it low-stakes at home</h2>
            <p>
              Test anxiety is real — research suggests it affects 25–40% of students — and it&apos;s especially
              disruptive when a child has absorbed the message that the SOL is a Big Important Test with
              Consequences. The irony is that children who are most anxious about tests also tend to study the
              hardest, which means their actual knowledge often exceeds their test-day performance.
            </p>
            <p>
              The antidote is familiarity, not pressure. When practice is routine, calm, and consequence-free,
              the test format stops feeling like a threat. You want your child to sit down on test day and think
              &quot;I&apos;ve seen this kind of question before&quot; — not &quot;I can&apos;t mess this up.&quot;
              That means keeping the energy around home practice relaxed. Don&apos;t make a big deal of wrong
              answers. Celebrate the process of sitting down and doing it, not just the score.
            </p>
            <p>
              Concretely: no timers unless your child is comfortable with them, no score reviews that feel like
              a report card, and no last-minute cramming the week before the test. The goal is to make the
              SOL feel familiar before your child ever walks into the testing room.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">One more thing: start before the testing window</h2>
            <p>
              Virginia&apos;s spring SOL testing window runs from late April through early June. That feels far
              away in October, but the families who see the biggest improvement are the ones who started months
              earlier — not because they studied harder, but because they gave the spaced repetition time to work.
            </p>
            <p>
              Starting now means your child has roughly 25–30 weeks of daily short sessions before the first
              test. That&apos;s a meaningful amount of practice — enough to cover every reporting category,
              revisit weak spots multiple times, and build genuine confidence rather than last-minute cramming.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Start practicing free at SolPrep</h2>
            <p>
              SolPrep is a free Virginia SOL practice platform built by a Virginia parent for kids in grades 3–8.
              Every question comes from VDOE&apos;s released test materials, the platform includes the
              accommodations listed in this post, and there&apos;s no paywall, no subscription, and no ads.
            </p>
            <p>
              Create a free account and set up a child profile in under two minutes at{' '}
              <a href="https://solprep.app/signup" className="text-primary underline">solprep.app/signup</a>.
              Pick a grade and subject, and your child can start with real SOL questions today.
            </p>
          </section>

        </div>
      </main>

      <LandingFooter isLoggedIn={isLoggedIn} />
    </div>
  )
}
