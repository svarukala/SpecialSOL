import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LandingNav } from '@/components/marketing/landing-nav'
import { LandingFooter } from '@/components/marketing/landing-footer'

export const metadata: Metadata = {
  title: 'Can My Child Retake a Failed SOL Test? The Retake Policy Explained',
  description:
    "What happens after a Virginia SOL test isn't passed — expedited retakes for near-miss scores, standard retake windows, and how the process differs for elementary, middle, and EOC tests.",
  keywords: [
    'SOL retake policy',
    'Virginia SOL retake',
    'expedited retake SOL',
    'failed SOL test what happens',
    'SOL test retest',
    'SOL retake eligibility',
    'Virginia SOL second chance',
    'EOC retake Virginia',
    'SOL retake window',
  ],
  alternates: { canonical: 'https://solprep.app/blog/sol-retake-policy' },
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
      { '@type': 'ListItem', position: 3, name: 'Can My Child Retake a Failed SOL Test?', item: 'https://solprep.app/blog/sol-retake-policy' },
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Can My Child Retake a Failed SOL Test? The Retake Policy Explained',
    datePublished: '2026-08-11',
    author: { '@type': 'Organization', name: 'SolPrep' },
    publisher: { '@type': 'Organization', name: 'SolPrep', url: 'https://solprep.app' },
    url: 'https://solprep.app/blog/sol-retake-policy',
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
          Can My Child Retake a Failed SOL Test?
        </h1>
        <p className="text-sm text-muted-foreground mb-12">August 11, 2026 · 6 min read</p>

        <div className="space-y-8 text-muted-foreground leading-relaxed text-sm">

          <section className="space-y-3">
            <p>
              A &ldquo;Did Not Pass&rdquo; result on an SOL test is not the end of the road — Virginia
              has retake processes built into the system, and for many students the path back to a
              passing score is shorter than parents expect. This guide covers how retakes generally
              work, the difference between an expedited retake and a standard one, and what to do first.
            </p>
            <p>
              Because exact windows, eligibility rules, and scheduling can be set or adjusted at the
              division level and can change from year to year, treat this as a guide to how the system
              works in general — and confirm current-year specifics with your school&apos;s testing
              coordinator, since they&apos;ll have the exact policy in effect for your division right now.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Two kinds of retake</h2>
            <p>
              Virginia&apos;s SOL program generally recognizes two different retake paths:
            </p>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li>
                <strong className="text-foreground">Expedited retake</strong> — for students who come
                close to passing (a scaled score near, but below, the 400-point passing threshold).
                Divisions can offer these students a chance to retest quickly, often within the same
                testing window, after some additional short-term instruction — rather than waiting for
                the next full test administration.
              </li>
              <li>
                <strong className="text-foreground">Standard retake</strong> — for students who don&apos;t
                qualify for an expedited retake, or whose score is further from passing. These typically
                happen at the next scheduled testing opportunity, such as a summer test administration
                or the following school year&apos;s test window.
              </li>
            </ul>
            <p>
              Eligibility for the expedited path — and whether a division offers it for a given test and
              grade — is set by VDOE guidance and applied by the school. Your child&apos;s testing
              coordinator can tell you immediately after a score comes back whether an expedited retake
              is on the table.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Elementary and middle school tests</h2>
            <p>
              For most grade 3–8 Math and Reading SOL tests, a student who doesn&apos;t pass the spring
              test typically gets one or more additional opportunities before the school year ends or
              early in the next one — an expedited retake if they&apos;re close, otherwise a standard
              retake in a subsequent window. Grade 3 Reading is a special case: Virginia law requires
              reading proficiency by the end of third grade, so schools take extra care to make sure a
              struggling reader has a real opportunity to demonstrate proficiency, whether through a
              retake or an alternative assessment path.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">End-of-Course (EOC) tests</h2>
            <p>
              EOC tests — Algebra I, Biology, and other high-school-level courses sometimes taken as
              early as 8th grade — are tied to graduation credit, so Virginia generally gives students
              multiple opportunities to pass across their time in the course and beyond, not just one
              shot per year. A student who doesn&apos;t pass an EOC the first time isn&apos;t locked out;
              they retest in a later window, and schools track this specifically because it affects
              graduation requirements.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">What to do right after a &ldquo;Did Not Pass&rdquo;</h2>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li>
                <strong className="text-foreground">Ask about expedited retake eligibility immediately.</strong>{' '}
                Don&apos;t wait — expedited windows can be short, and the school needs to know you want
                to pursue it.
              </li>
              <li>
                <strong className="text-foreground">Get the reporting-category breakdown</strong> from the
                score report, not just the overall score. It shows exactly which topics to focus on
                before the retake, rather than reviewing everything generally.
              </li>
              <li>
                <strong className="text-foreground">Use the time between attempts well.</strong> A retake
                a few weeks out is a real opportunity — targeted practice on the specific weak areas
                tends to move the score more than broad review.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Prepare for the retake with targeted practice</h2>
            <p>
              SolPrep is free Virginia SOL practice with real VDOE released test questions for grades
              3–8, organized by topic — so once you know which reporting categories were weak, your
              child can practice exactly those standards instead of a random mix. Practice mode builds
              confidence with immediate feedback; test mode simulates the timed, one-try format of the
              real retake so it doesn&apos;t feel unfamiliar on the day.
            </p>
            <p>
              <Link href="/signup" className="text-primary underline">
                Create a free account
              </Link>{' '}
              and start targeted practice before the next testing window.
            </p>
          </section>

        </div>
      </main>

      <LandingFooter isLoggedIn={isLoggedIn} />
    </div>
  )
}
