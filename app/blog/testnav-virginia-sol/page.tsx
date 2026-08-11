import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LandingNav } from '@/components/marketing/landing-nav'
import { LandingFooter } from '@/components/marketing/landing-footer'

export const metadata: Metadata = {
  title: "What Is TestNav? How Virginia's Online SOL Testing Works",
  description:
    "A plain-language guide to TestNav, the platform Virginia students use to take SOL tests online — how it works, what the interface looks like, built-in tools, accommodations support, and how to help your child practice on something similar.",
  keywords: [
    'what is TestNav',
    'TestNav Virginia SOL',
    'TestNav practice',
    'Virginia SOL online testing',
    'TestNav login',
    'TestNav app',
    'Pearson TestNav',
    'SOL testing platform',
    'TestNav accommodations',
    'TestNav tutorial',
  ],
  alternates: { canonical: 'https://solprep.app/blog/testnav-virginia-sol' },
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
      { '@type': 'ListItem', position: 3, name: "What Is TestNav? How Virginia's Online SOL Testing Works", item: 'https://solprep.app/blog/testnav-virginia-sol' },
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: "What Is TestNav? How Virginia's Online SOL Testing Works",
    datePublished: '2026-08-11',
    author: { '@type': 'Organization', name: 'SolPrep' },
    publisher: { '@type': 'Organization', name: 'SolPrep', url: 'https://solprep.app' },
    url: 'https://solprep.app/blog/testnav-virginia-sol',
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
          What Is TestNav? How Virginia&apos;s Online SOL Testing Works
        </h1>
        <p className="text-sm text-muted-foreground mb-12">August 11, 2026 · 6 min read</p>

        <div className="space-y-8 text-muted-foreground leading-relaxed text-sm">

          <section className="space-y-3">
            <p>
              If your child has come home mentioning &ldquo;TestNav,&rdquo; it&apos;s not a new app they
              downloaded for fun — it&apos;s the platform Virginia schools use to deliver SOL tests online.
              Almost every Virginia SOL test is now taken on a computer or tablet through TestNav rather
              than on paper. This guide explains what it is, what your child will actually see on screen,
              and how to help them walk in comfortable with the format instead of just the content.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">TestNav, in one sentence</h2>
            <p>
              TestNav is the secure online testing application (built by Pearson) that Virginia school
              divisions use to administer SOL assessments. Schools install it on student devices —
              Chromebooks, laptops, or tablets — or students launch it through a locked-down browser.
              Once a test session starts, TestNav restricts the device to the test itself: students can&apos;t
              open other tabs, apps, or browse the web until the session ends.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">What the interface looks like</h2>
            <p>
              Students log in with a testing ticket the school provides — a username and session code,
              not a personal account they set up themselves. Once in, the test presents one question
              (or a small group of related questions) per screen, with navigation buttons to move forward,
              back, or jump to a specific question via a review screen that shows which ones are answered,
              unanswered, or flagged for review.
            </p>
            <p>
              Built into the toolbar are on-screen tools students can use during the test itself:
              a highlighter to mark up passages or important text, an answer eliminator to strike through
              choices they&apos;ve ruled out, a line reader or masking tool to isolate one line of text
              at a time, a basic or scientific calculator (on eligible math tests), and a magnifier for
              zooming in on diagrams or small text.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Accommodations built into TestNav</h2>
            <p>
              For students with an IEP or 504 plan, TestNav supports many accommodations directly in the
              platform rather than requiring a separate paper process: text-to-speech or embedded human-voice
              audio that reads questions aloud, extended time (the session simply doesn&apos;t lock at the
              standard limit), color contrast and background color changes, and answer masking. Which
              accommodations are active for a given student is configured by the school ahead of time
              based on their IEP or 504 documentation — it isn&apos;t something a student turns on themselves
              during the test.
            </p>
            <p>
              This is worth knowing because it means the accommodations conversation needs to happen with
              the school <em>before</em> test day, not during it. If your child&apos;s plan includes
              text-to-speech or extended time, confirm with the testing coordinator that it&apos;s been
              set up in TestNav for the specific test window.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Why the format itself trips kids up</h2>
            <p>
              A student can know the material cold and still lose time or make careless mistakes simply
              because the on-screen tools are unfamiliar. Test day is the wrong time to first encounter
              a highlighter tool that behaves differently from a real highlighter, or a review screen
              that requires actively navigating back to flagged questions instead of flipping a page.
            </p>
            <p>
              This is the single biggest gap between practicing on paper and practicing for TestNav:
              paper worksheets don&apos;t teach a student how to use an on-screen answer eliminator or
              how to interpret a digital review screen. The content knowledge transfers; the interface
              fluency doesn&apos;t.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Practicing in a similar format</h2>
            <p>
              SolPrep&apos;s practice and test modes run entirely on-screen, question by question, with
              accommodation tools available the same way they are in TestNav — text-to-speech, a
              highlighter kids can use to mark up reading passages, and a freehand scratchpad for working
              out math problems digitally instead of on paper. Test mode specifically simulates the
              timed, one-try-per-question format of the real SOL test, so the unfamiliar parts of test
              day become familiar before it counts.
            </p>
            <p>
              <Link href="/signup" className="text-primary underline">
                Create a free account
              </Link>{' '}
              and try Test mode with your child — it&apos;s the closest free practice to what they&apos;ll
              actually see on screen in the spring.
            </p>
          </section>

        </div>
      </main>

      <LandingFooter isLoggedIn={isLoggedIn} />
    </div>
  )
}
