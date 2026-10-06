import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LandingNav } from '@/components/marketing/landing-nav'
import { LandingFooter } from '@/components/marketing/landing-footer'
import { SampleQuestions } from '@/components/marketing/sample-questions'
import { getSampleQuestions, getGradeStats } from '@/lib/supabase/marketing'
import {
  SOL_CURRICULUM,
  SUPPORTED_GRADES,
  getTopicsForGradeSubject,
  type Subject,
} from '@/lib/curriculum/sol-curriculum'

const SITE_URL = 'https://solprep.app'

const SUBJECT_META: Record<Subject, { label: string; icon: string }> = {
  math: { label: 'Math', icon: '📐' },
  reading: { label: 'Reading', icon: '📖' },
  science: { label: 'Science', icon: '🔬' },
}

/** Parse "grade-5" (or "5") into a supported grade number, or null. */
function parseGrade(slug: string): number | null {
  const n = parseInt(slug.replace(/^grade-/, ''), 10)
  return SUPPORTED_GRADES.includes(n) ? n : null
}

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase())
}

export function generateStaticParams() {
  return SUPPORTED_GRADES.map((g) => ({ grade: `grade-${g}` }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ grade: string }>
}): Promise<Metadata> {
  const { grade: slug } = await params
  const grade = parseGrade(slug)
  if (!grade) return {}

  const subjects = (Object.keys(SOL_CURRICULUM[grade]) as Subject[])
    .map((s) => SUBJECT_META[s].label)
    .join(', ')
  const canonical = `${SITE_URL}/sol-practice/grade-${grade}`

  return {
    title: `Grade ${grade} Virginia SOL Practice Test — Free ${subjects} | SolPrep`,
    description: `Free Grade ${grade} Virginia SOL practice with real VDOE released test questions for ${subjects}. Practice by topic or in timed test mode, with built-in IEP/504 accommodations — no ads, no paywall.`,
    keywords: [
      `Grade ${grade} Virginia SOL practice test`,
      `Grade ${grade} SOL prep`,
      `Grade ${grade} SOL math practice`,
      `Grade ${grade} SOL reading practice`,
      `free Virginia SOL practice grade ${grade}`,
      `VDOE released test questions grade ${grade}`,
    ],
    alternates: { canonical },
  }
}

export default async function GradePracticePage({
  params,
}: {
  params: Promise<{ grade: string }>
}) {
  const { grade: slug } = await params
  const grade = parseGrade(slug)
  if (!grade) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isLoggedIn = !!user

  const [stats, sampleQuestions] = await Promise.all([
    getGradeStats(grade),
    getSampleQuestions({ grade, limit: 3 }),
  ])

  const subjects = Object.keys(SOL_CURRICULUM[grade]) as Subject[]
  const subjectLabels = subjects.map((s) => SUBJECT_META[s].label).join(' & ')
  const countBySubject = new Map(stats.bySubject.map((s) => [s.subject, s.count]))

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'SOL Practice', item: `${SITE_URL}/sol-practice` },
          {
            '@type': 'ListItem',
            position: 3,
            name: `Grade ${grade}`,
            item: `${SITE_URL}/sol-practice/grade-${grade}`,
          },
        ],
      },
      {
        '@type': 'WebPage',
        name: `Grade ${grade} Virginia SOL Practice Test`,
        url: `${SITE_URL}/sol-practice/grade-${grade}`,
        description: `Free Grade ${grade} Virginia SOL practice with real VDOE released test questions for ${subjectLabels}.`,
      },
    ],
  }

  function roundDown(n: number, to: number) {
    return Math.floor(n / to) * to
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LandingNav isLoggedIn={isLoggedIn} />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-4 pt-16 pb-12 text-center">
        <Link
          href="/sol-practice"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← All grades
        </Link>
        <div className="mt-6 inline-block bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full mb-5 tracking-wide uppercase">
          Grade {grade} · Virginia Standards of Learning
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold leading-tight tracking-tight mb-5">
          Grade {grade} Virginia SOL<br />
          <span className="text-primary">Practice Test</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed">
          Free {subjectLabels} practice built from real VDOE released SOL questions. Work topic by
          topic or simulate the real test — with built-in accommodations for every learner.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={isLoggedIn ? '/dashboard' : '/signup'}
            className="font-semibold bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors text-base"
          >
            {isLoggedIn ? 'Go to Dashboard' : 'Start for free'}
          </Link>
          {!isLoggedIn && (
            <Link
              href="/login"
              className="font-medium border border-border px-6 py-3 rounded-lg hover:bg-muted transition-colors text-base"
            >
              Sign in
            </Link>
          )}
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────── */}
      {stats.total > 0 && (
        <section className="border-y bg-muted/30">
          <div className="max-w-3xl mx-auto px-4 py-8 grid grid-cols-2 sm:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-primary">
                {roundDown(stats.total, 50).toLocaleString()}+
              </div>
              <div className="text-sm text-muted-foreground mt-1">Grade {grade} questions</div>
            </div>
            {stats.bySubject.map(({ subject, count }) => (
              <div key={subject}>
                <div className="text-2xl sm:text-3xl font-bold text-primary">
                  {roundDown(count, 25).toLocaleString()}+
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {SUBJECT_META[subject as Subject]?.label ?? titleCase(subject)} questions
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Topics by subject ────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">
          What Grade {grade} SOL covers
        </h2>
        <p className="text-muted-foreground text-center max-w-lg mx-auto text-sm leading-relaxed mb-12">
          Every topic below is aligned to the current Virginia SOL for Grade {grade}. Practice any
          one on its own, or mix them in a full-length test.
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          {subjects.map((subject) => {
            const topics = getTopicsForGradeSubject(grade, subject)
            const count = countBySubject.get(subject)
            return (
              <div key={subject} className="rounded-xl border bg-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">{SUBJECT_META[subject].icon}</span>
                  <h3 className="font-semibold text-lg">
                    Grade {grade} {SUBJECT_META[subject].label}
                  </h3>
                  {count ? (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {count.toLocaleString()} questions
                    </span>
                  ) : null}
                </div>
                <ul className="space-y-2">
                  {topics.map((t) => (
                    <li key={t.solStandard} className="flex items-start gap-2 text-sm">
                      <span className="shrink-0 mt-0.5 text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                        SOL {t.solStandard}
                      </span>
                      <span className="text-muted-foreground">{titleCase(t.name)}</span>
                    </li>
                  ))}
                </ul>
              </div>
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
              heading={`Grade ${grade} sample questions`}
              subheading="Straight from official Virginia DOE released SOL tests. This is exactly what your child will practice — free, with no signup required to preview."
            />
          </div>
        </section>
      )}

      {/* ── Other grades (internal links) ────────────────────── */}
      <section className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold mb-6">Practice another grade</h2>
        <div className="flex flex-wrap justify-center gap-3">
          {SUPPORTED_GRADES.map((g) => (
            <Link
              key={g}
              href={`/sol-practice/grade-${g}`}
              aria-current={g === grade ? 'page' : undefined}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                g === grade
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'hover:bg-muted'
              }`}
            >
              Grade {g}
            </Link>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="border-t bg-primary text-primary-foreground">
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">
            Start Grade {grade} SOL practice today
          </h2>
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
