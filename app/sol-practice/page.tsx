import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LandingNav } from '@/components/marketing/landing-nav'
import { LandingFooter } from '@/components/marketing/landing-footer'
import { SampleQuestions } from '@/components/marketing/sample-questions'
import { getSampleQuestions } from '@/lib/supabase/marketing'
import { SOL_CURRICULUM, SUPPORTED_GRADES, type Subject } from '@/lib/curriculum/sol-curriculum'

const SITE_URL = 'https://solprep.app'

const SUBJECT_LABEL: Record<Subject, string> = {
  math: 'Math',
  reading: 'Reading',
  science: 'Science',
}

export const metadata: Metadata = {
  title: 'Free Virginia SOL Practice Tests by Grade — Grades 3–8 | SolPrep',
  description:
    'Free Virginia SOL practice tests for grades 3–8 with real VDOE released questions. Choose your grade for Math, Reading, and Science practice — topic mode, timed test mode, and built-in IEP/504 accommodations.',
  alternates: { canonical: `${SITE_URL}/sol-practice` },
  keywords: [
    'Virginia SOL practice test',
    'free SOL practice by grade',
    'VDOE released test questions',
    'SOL math practice',
    'SOL reading practice',
    'Virginia SOL prep grades 3-8',
  ],
}

export default async function SolPracticeHubPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isLoggedIn = !!user

  const sampleQuestions = await getSampleQuestions({ limit: 3 })

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'SOL Practice', item: `${SITE_URL}/sol-practice` },
    ],
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LandingNav isLoggedIn={isLoggedIn} />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-4 pt-20 pb-12 text-center">
        <div className="inline-block bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full mb-6 tracking-wide uppercase">
          Virginia Standards of Learning
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold leading-tight tracking-tight mb-5">
          Free Virginia SOL Practice Tests<br />
          <span className="text-primary">by grade</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed">
          Pick your child&apos;s grade to practice with real VDOE released SOL questions — Math,
          Reading, and Science, with built-in accommodations for every learner.
        </p>
      </section>

      {/* ── Grade cards ──────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SUPPORTED_GRADES.map((grade) => {
            const subjects = (Object.keys(SOL_CURRICULUM[grade]) as Subject[])
              .map((s) => SUBJECT_LABEL[s])
              .join(' · ')
            return (
              <Link
                key={grade}
                href={`/sol-practice/grade-${grade}`}
                className="group rounded-xl border bg-card p-6 hover:border-primary hover:shadow-sm transition-all"
              >
                <div className="text-sm font-semibold text-primary uppercase tracking-wide mb-1">
                  Grade {grade}
                </div>
                <h2 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                  Grade {grade} SOL Practice
                </h2>
                <p className="text-sm text-muted-foreground">{subjects}</p>
                <span className="mt-4 inline-block text-sm font-medium text-primary">
                  Practice Grade {grade} →
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      {/* ── Sample questions ─────────────────────────────────── */}
      {sampleQuestions.length > 0 && (
        <section className="bg-muted/30 border-y">
          <div className="max-w-5xl mx-auto px-4 py-16">
            <SampleQuestions
              questions={sampleQuestions}
              heading="Real questions, free to preview"
              subheading="Every question comes from official Virginia DOE released SOL tests. No signup needed to look."
            />
          </div>
        </section>
      )}

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="border-t bg-primary text-primary-foreground">
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Ready to start practicing?</h2>
          <p className="text-primary-foreground/80 mb-8 text-sm leading-relaxed">
            Free to use. No ads. No data sold. Built by parents, for parents.
          </p>
          <Link
            href={isLoggedIn ? '/dashboard' : '/signup'}
            className="inline-block font-semibold bg-background text-foreground px-8 py-3 rounded-lg hover:bg-background/90 transition-colors text-base"
          >
            {isLoggedIn ? 'Go to Dashboard' : 'Create a free account'}
          </Link>
        </div>
      </section>

      <LandingFooter isLoggedIn={isLoggedIn} />
    </div>
  )
}
