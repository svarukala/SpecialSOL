import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { LandingNav } from '@/components/marketing/landing-nav'
import { LandingFooter } from '@/components/marketing/landing-footer'
import { AccommodationTiles } from '@/components/marketing/accommodation-tiles'

export const metadata: Metadata = {
  title: 'Free Virginia SOL Practice Test — Real VDOE Questions, Grades 3–8',
  description:
    'Practice Virginia SOL with 3,700+ real VDOE released test questions for grades 3–8. Free Math & Reading practice with IEP/504 accommodations — text-to-speech, dyslexia font, adaptive tiers, and test-mode simulation.',
  alternates: { canonical: 'https://solprep.app' },
}

const STRENGTHS = [
  {
    icon: '📋',
    title: 'Real VDOE Released Tests',
    body: 'Over 3,000 questions pulled directly from official Virginia DOE released SOL tests — the same questions that have appeared on real exams, now available for unlimited practice.',
  },
  {
    icon: '🧱',
    title: 'Start Where They Are',
    body: 'Three learning tiers — Foundational, Simplified, and Standard — let every child begin at the right level, not just the expected one. Parents control when to move up.',
  },
  {
    icon: '♿',
    title: 'Built for All Learners',
    body: 'Text-to-speech, dyslexia-friendly font, bionic reading, high contrast, extended time, hints, and more. Accommodations that mirror what kids get in the classroom.',
  },
  {
    icon: '📊',
    title: 'Practice & Test Modes',
    body: 'Low-stakes practice builds confidence; timed test mode simulates the real SOL experience — timed, one try per question. Streak tracking keeps them motivated.',
  },
]


const STEPS = [
  { n: '1', title: 'Create a free account', body: 'Sign up in seconds — no credit card required.' },
  { n: '2', title: 'Set up your child\'s profile', body: 'Choose grade, starting level, and accommodations that match their needs.' },
  { n: '3', title: 'Start practicing', body: 'Pick Math or Reading, choose Practice or Test mode, and select real VDOE questions or AI-generated practice. Go.' },
]

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      '@id': 'https://solprep.app/#app',
      name: 'SolPrep',
      url: 'https://solprep.app',
      description:
        'Free Virginia SOL practice with 3,700+ real VDOE released test questions for grades 3–8. Math and Reading with adaptive tiers and built-in IEP/504 accommodations.',
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Web',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      audience: {
        '@type': 'EducationalAudience',
        educationalRole: 'student',
        audienceType: 'Grades 3–8 Virginia students',
      },
      featureList: [
        'Real VDOE released test questions',
        'Adaptive learning tiers (Foundational, Simplified, Standard)',
        'Text-to-speech',
        'Dyslexia-friendly font',
        'Bionic reading',
        'High contrast mode',
        'Extended time',
        'Built-in hints',
        'Practice and test modes',
        'Math and Reading for grades 3–8',
      ],
    },
    {
      '@type': 'Organization',
      '@id': 'https://solprep.app/#org',
      name: 'SolPrep',
      url: 'https://solprep.app',
      description:
        'Virginia SOL test preparation platform with real VDOE released questions and accessibility accommodations for students with IEPs, 504 plans, and learning differences.',
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Is SolPrep free?',
          acceptedAnswer: { '@type': 'Answer', text: 'Yes. SolPrep is completely free to use. No ads, no premium tier, no data sold.' },
        },
        {
          '@type': 'Question',
          name: 'Where do the practice questions come from?',
          acceptedAnswer: { '@type': 'Answer', text: 'Over 3,000 questions come directly from official Virginia DOE released SOL tests. Additional questions are AI-generated and aligned to current VA SOL standards.' },
        },
        {
          '@type': 'Question',
          name: 'Does SolPrep support students with IEPs or 504 plans?',
          acceptedAnswer: { '@type': 'Answer', text: 'Yes. SolPrep has built-in accommodations including text-to-speech, dyslexia-friendly font, bionic reading, high contrast, extended time, and hints — all configurable per child.' },
        },
        {
          '@type': 'Question',
          name: 'Which grades does SolPrep cover?',
          acceptedAnswer: { '@type': 'Answer', text: 'SolPrep covers grades 3 through 8 for both Math and Reading Virginia SOL standards.' },
        },
      ],
    },
  ],
}

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isLoggedIn = !!user

  // Live question counts
  const { count: totalCount } = await supabase.from('questions').select('*', { count: 'exact', head: true })
  const { count: doeCount } = await supabase.from('questions').select('*', { count: 'exact', head: true }).eq('source', 'doe_released')
  const { count: aiCount } = await supabase.from('questions').select('*', { count: 'exact', head: true }).eq('source', 'ai_generated')

  function roundDown(n: number, to: number) { return Math.floor(n / to) * to }

  const STATS = [
    { value: `${roundDown(totalCount ?? 0, 100).toLocaleString()}+`, label: 'Practice questions' },
    { value: `${roundDown(doeCount ?? 0, 100).toLocaleString()}+`, label: 'From real VDOE tests' },
    { value: `${roundDown(aiCount ?? 0, 50).toLocaleString()}+`, label: 'AI-generated questions' },
    { value: '8', label: 'Accessibility options' },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <LandingNav activePage="home" isLoggedIn={isLoggedIn} />

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-4 pt-20 pb-16 text-center">
        <div className="inline-block bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full mb-6 tracking-wide uppercase">
          Virginia Standards of Learning
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold leading-tight tracking-tight mb-5">
          SOL test prep built for<br />
          <span className="text-primary">every learner</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed">
          Practice with real VDOE released test questions or AI-generated problems —
          adaptive tiers, built-in accommodations, and test-mode simulation for grades 3–8.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="font-semibold bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors text-base"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/signup"
                className="font-semibold bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors text-base"
              >
                Start for free
              </Link>
              <Link
                href="/login"
                className="font-medium border border-border px-6 py-3 rounded-lg hover:bg-muted transition-colors text-base"
              >
                Sign in
              </Link>
            </>
          )}
        </div>
      </section>

      {/* ── Stats bar ──────────────────────────────────────────── */}
      <section className="border-y bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {STATS.map(({ value, label }) => (
            <div key={label}>
              <div className="text-2xl sm:text-3xl font-bold text-primary">{value}</div>
              <div className="text-sm text-muted-foreground mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Strengths ──────────────────────────────────────────── */}
      <section id="features" className="max-w-5xl mx-auto px-4 py-20 scroll-mt-14">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">
          Why SolPrep is different
        </h2>
        <div className="grid sm:grid-cols-3 gap-8">
          {STRENGTHS.map(({ icon, title, body }) => (
            <div key={title} className="rounded-xl border bg-card p-6 space-y-3">
              <div className="text-3xl">{icon}</div>
              <h3 className="font-semibold text-base">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Accommodations showcase ────────────────────────────── */}
      <section id="accommodations" className="bg-muted/30 border-y scroll-mt-14">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">
            Classroom accommodations, built in
          </h2>
          <p className="text-muted-foreground mb-10 max-w-lg mx-auto text-sm leading-relaxed">
            Every accommodation is a single toggle — set it once per child and it applies to every session automatically.
          </p>
          <AccommodationTiles />
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold mb-12">How it works</h2>
        <div className="grid sm:grid-cols-3 gap-8 text-left">
          {STEPS.map(({ n, title, body }) => (
            <div key={n} className="space-y-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">
                {n}
              </div>
              <h3 className="font-semibold text-sm">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────── */}
      <section className="border-t bg-primary text-primary-foreground">
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">
            Ready to help your child succeed?
          </h2>
          <p className="text-primary-foreground/80 mb-8 text-sm leading-relaxed">
            Free to use. No ads. No data sold. Built by parents, for parents.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="inline-block font-semibold bg-background text-foreground px-8 py-3 rounded-lg hover:bg-background/90 transition-colors text-base"
            >
              Create a free account
            </Link>
            <a
              href="https://buymeacoffee.com/varuk"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#FFDD00] text-[#000000] font-semibold px-6 py-3 rounded-lg hover:bg-[#FFDD00]/90 transition-colors text-base"
            >
              ☕ Buy me a coffee
            </a>
          </div>
        </div>
      </section>

      <LandingFooter isLoggedIn={isLoggedIn} />

    </div>
  )
}
