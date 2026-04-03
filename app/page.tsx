import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { LandingNav } from '@/components/marketing/landing-nav'
import { LandingFooter } from '@/components/marketing/landing-footer'

export const metadata: Metadata = {
  alternates: { canonical: 'https://solprep.app' },
}

const STATS = [
  { value: '300+', label: 'Practice questions' },
  { value: 'Grades 3–8', label: 'Covered' },
  { value: '2 subjects', label: 'Math & Reading' },
  { value: '8', label: 'Accessibility options' },
]

const STRENGTHS = [
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
    body: 'Low-stakes practice builds confidence; timed test mode prepares kids for the real thing. Streak tracking and positive reinforcement keep them motivated.',
  },
]

const ACCOMMODATIONS = [
  { icon: '🔊', label: 'Read Aloud (TTS)' },
  { icon: '🔤', label: 'Dyslexia Font' },
  { icon: '👁️', label: 'Bionic Reading' },
  { icon: '🌗', label: 'High Contrast' },
  { icon: '⏱️', label: 'Extended Time' },
  { icon: '💡', label: 'Step-by-Step Hints' },
  { icon: '🔕', label: 'Reduce Distractions' },
  { icon: '🎉', label: 'Positive Reinforcement' },
]

const STEPS = [
  { n: '1', title: 'Create a free account', body: 'Sign up in seconds — no credit card required.' },
  { n: '2', title: 'Set up your child\'s profile', body: 'Choose grade, starting level, and accommodations that match their needs.' },
  { n: '3', title: 'Start practicing', body: 'Pick Math or Reading, choose Practice or Test mode, and go.' },
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
        'Free Virginia SOL test prep for grades 3–8 with adaptive learning tiers and built-in accessibility accommodations for math and reading.',
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Web',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      audience: {
        '@type': 'EducationalAudience',
        educationalRole: 'student',
        audienceType: 'Grades 3–8 Virginia students',
      },
    },
    {
      '@type': 'Organization',
      '@id': 'https://solprep.app/#org',
      name: 'SolPrep',
      url: 'https://solprep.app',
      description: 'Virginia SOL test preparation platform with accessibility accommodations.',
    },
  ],
}

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <LandingNav activePage="home" />

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
          Adaptive practice for Virginia SOL — from foundational support to
          grade-level mastery, with built-in accommodations for kids who learn differently.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {ACCOMMODATIONS.map(({ icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-2 bg-background rounded-xl border p-4">
                <span className="text-2xl">{icon}</span>
                <span className="text-xs font-medium text-center leading-tight">{label}</span>
              </div>
            ))}
          </div>
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
          <Link
            href="/signup"
            className="inline-block font-semibold bg-background text-foreground px-8 py-3 rounded-lg hover:bg-background/90 transition-colors text-base"
          >
            Create a free account
          </Link>
        </div>
      </section>

      <LandingFooter />

    </div>
  )
}
