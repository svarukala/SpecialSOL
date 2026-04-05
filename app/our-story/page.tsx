import type { Metadata } from 'next'
import Link from 'next/link'
import { LandingNav } from '@/components/marketing/landing-nav'
import { LandingFooter } from '@/components/marketing/landing-footer'

export const metadata: Metadata = {
  title: 'Our Story — Why We Built Free SOL Prep for Kids with Special Needs',
  description:
    'A Virginia parent built SolPrep after finding no SOL test prep that worked for a child with special needs. Now it\'s free for every family — with IEP/504 accommodations, adaptive tiers, and real VDOE practice questions.',
  keywords: [
    'SOL prep for kids with special needs',
    'Virginia SOL IEP accommodations',
    'SOL practice for learning disabilities',
    'free SOL prep special education',
    'Virginia SOL 504 plan',
    'SOL prep dyslexia',
    'SOL prep ADHD',
    'Virginia parent SOL resources',
  ],
  alternates: { canonical: 'https://solprep.app/our-story' },
}

export default function OurStoryPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav activePage="our-story" />

      <main className="max-w-2xl mx-auto px-4 py-16 sm:py-24">

        {/* Eyebrow */}
        <div className="text-sm font-semibold text-primary uppercase tracking-wide mb-4">
          Our Story
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold leading-tight tracking-tight mb-8">
          Built by a parent,<br />for every parent
        </h1>

        <div className="prose prose-neutral max-w-none space-y-6 text-muted-foreground leading-relaxed">

          <p className="text-foreground text-lg leading-relaxed">
            My son is in elementary school. He has special needs, and like many kids
            like him, he learns differently — not slower, not less capable, just
            differently.
          </p>

          <p>
            When Virginia SOL season approached, I went looking for resources online
            to help him prepare. What I found were sites built for the average student:
            grade-level questions, no accommodations, no way to start below grade level
            and work up. Nothing that matched how he actually learns.
          </p>

          <p>
            The tools that did exist for kids with special needs weren&apos;t connected
            to SOL standards at all. And the SOL-focused tools didn&apos;t consider
            kids like my son. There was a gap, and it felt like every family dealing
            with the same situation was on their own.
          </p>

          <p>
            So I built SolPrep.
          </p>

          <hr className="border-border my-8" />

          <h2 className="text-xl font-semibold text-foreground">What makes it different</h2>

          <p>
            SolPrep starts where your child actually is — not where the curriculum
            says they should be. The <strong className="text-foreground">Foundational tier</strong> gives
            kids below grade level a real entry point into SOL content: simpler language,
            visual support, step-by-step hints, and a path forward at their own pace.
          </p>

          <p>
            Every accommodation you&apos;d request in a school IEP is available here as
            a simple toggle: text-to-speech, dyslexia-friendly fonts, bionic reading,
            extended time, high contrast, reduced distractions. Set it once per child,
            and it applies to every session automatically.
          </p>

          <p>
            Parents stay in control. You choose the starting level, you approve when
            your child is ready to move up, and you can see their progress over time.
          </p>

          <hr className="border-border my-8" />

          <h2 className="text-xl font-semibold text-foreground">Built for the greater good</h2>

          <p>
            SolPrep is free. There are no ads, no premium tiers, and no data sold.
            Every family in Virginia should have access to quality SOL preparation —
            especially families who are already navigating the extra challenges that
            come with raising a child with special needs.
          </p>

          <p>
            If this helps even one family feel a little less alone during SOL season,
            it was worth building.
          </p>

        </div>

        {/* CTA */}
        <div className="mt-12 pt-10 border-t flex flex-col sm:flex-row gap-3">
          <Link
            href="/signup"
            className="font-semibold bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors text-sm text-center"
          >
            Create a free account
          </Link>
          <Link
            href="/"
            className="font-medium border border-border px-6 py-3 rounded-lg hover:bg-muted transition-colors text-sm text-center"
          >
            See how it works
          </Link>
        </div>

      </main>

      <LandingFooter />
    </div>
  )
}
