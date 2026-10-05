import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LandingNav } from '@/components/marketing/landing-nav'
import { LandingFooter } from '@/components/marketing/landing-footer'

export const metadata: Metadata = {
  title: 'SOL Test Anxiety: What It Is and How to Help Your Child — SolPrep',
  description:
    'Test anxiety affects 25–40% of students and is especially disruptive on high-stakes tests like Virginia SOLs. Learn what it is, why familiarity is the best antidote, and how short daily practice sessions can help.',
  keywords: [
    'SOL test anxiety Virginia',
    'test anxiety children',
    'how to reduce test anxiety',
    'Virginia SOL prep anxiety',
    'test anxiety accommodations 504',
    'test anxiety IEP Virginia',
    'SOL practice reduce stress',
    'test anxiety elementary students',
  ],
  alternates: { canonical: 'https://solprep.app/blog/sol-test-anxiety-help' },
  openGraph: {
    type: 'article',
    publishedTime: '2026-10-05',
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
      { '@type': 'ListItem', position: 3, name: 'SOL Test Anxiety: What It Is and How to Help Your Child', item: 'https://solprep.app/blog/sol-test-anxiety-help' },
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'SOL Test Anxiety: What It Is and How to Help Your Child',
    datePublished: '2026-10-05',
    author: { '@type': 'Organization', name: 'SolPrep' },
    publisher: { '@type': 'Organization', name: 'SolPrep', url: 'https://solprep.app' },
    url: 'https://solprep.app/blog/sol-test-anxiety-help',
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
          SOL Test Anxiety: What It Is and How to Help Your Child
        </h1>
        <p className="text-sm text-muted-foreground mb-12">October 5, 2026 · 5 min read</p>

        <div className="space-y-8 text-muted-foreground leading-relaxed text-sm">

          <section className="space-y-3">
            <p>
              Test anxiety is real, it&apos;s recognized, and it&apos;s more common than most parents realize.
              Research consistently estimates that somewhere between 25 and 40 percent of students experience
              significant test anxiety — meaning it actively interferes with their ability to show what they know.
              On a high-stakes assessment like the Virginia SOL, that interference can mean the difference between
              a score that reflects what your child has learned and one that reflects how anxious they were
              on a single morning in April.
            </p>
            <p>
              This post explains what test anxiety actually is, why the SOL format in particular can amplify it,
              and what the research says about the most effective way to reduce it — including what Virginia schools
              are required to offer students whose anxiety meets the threshold for a formal accommodation.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">What test anxiety is — and isn&apos;t</h2>
            <p>
              Test anxiety is not just nervousness. Every student feels some level of stress before a test — and
              a moderate amount of arousal actually improves performance, a phenomenon researchers call the
              Yerkes-Dodson effect. Test anxiety is what happens when that stress becomes counterproductive:
              when it impairs working memory, causes physical symptoms like stomachache or headache, or triggers
              avoidance behavior in the days or weeks before the test.
            </p>
            <p>
              Researchers classify test anxiety as a specific form of performance anxiety with two components.
              The first is cognitive worry — intrusive thoughts about failure, negative self-talk, dwelling on
              consequences. The second is physiological arousal — the physical symptoms. Research shows that
              cognitive worry is the component most responsible for score impairment; the physical symptoms are
              uncomfortable but less directly disruptive to actually answering questions.
            </p>
            <p>
              One more thing worth saying clearly: test anxiety is not the same as low ability. Many
              high-achieving students experience severe test anxiety precisely because they care intensely about
              doing well. A child who knows the material but freezes on the test is not &quot;bad at tests&quot;
              — they&apos;re experiencing a real and addressable problem.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">How common it really is</h2>
            <p>
              A 2010 meta-analysis reviewing more than 150 studies confirmed that test anxiety is one of the
              strongest predictors of academic underperformance — stronger than most demographic variables.
              The effect is consistently larger on high-stakes tests, which is exactly what the Virginia SOL is
              designed to be.
            </p>
            <p>
              Students with learning disabilities, ADHD, or a history of academic struggles are at significantly
              higher risk. But so are perfectionist students with no learning differences at all.
              If your child shows physical symptoms before tests, describes dreading them, or performs noticeably
              worse on assessments than on homework or class participation, test anxiety is a reasonable
              explanation to explore.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Why the SOL format can make it worse</h2>
            <p>
              The Virginia SOL is a high-stakes, single-day, single-sitting test. Students typically take it in
              a computer lab with other students, under a visible time limit, after weeks of school-wide review
              activities that are often framed with some urgency. For a child who is already anxious, almost
              every one of those features is a trigger.
            </p>
            <p>
              Selected-response (multiple-choice) questions can also amplify anxiety in a specific way: they
              require committing to one answer with no partial credit. Anxious students often change answers
              back and forth, second-guessing themselves into errors on questions they originally got right.
              Seeing other students finish early, or being aware of how much time remains, shifts attention from
              the question to the clock — a pattern that reliably increases errors.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">The most effective antidote: familiarity</h2>
            <p>
              The most robust finding in test anxiety research is that familiarity with the test format is the
              most effective anxiety reducer for most students. This is grounded in exposure therapy theory:
              anxiety is maintained by avoidance and decreases through repeated, low-stakes contact with the
              anxiety-provoking situation.
            </p>
            <p>
              For test-anxious students, what this means practically is that the SOL should not be the first
              time they&apos;ve seen questions that look like SOL questions. When the format is familiar —
              the structure of the question, the number of answer choices, the way distractors are written —
              the cognitive overhead of &quot;what am I supposed to do here?&quot; disappears. That freed-up
              working memory is available for actually thinking about the answer.
            </p>
            <p>
              This is why short, repeated practice sessions are more effective than cramming. A 10-minute
              practice session three times a week provides more anxiety-reducing exposure than one 30-minute
              session the night before. The key is keeping those sessions genuinely low stakes — no pressure,
              no grading, no urgency.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">The goal isn&apos;t a higher score — it&apos;s a boring test</h2>
            <p>
              This framing shift matters a lot for how parents approach SOL prep with an anxious child.
              The goal of practice is not &quot;getting the score up.&quot; The goal is making the test format
              feel familiar enough that it stops being threatening. When your child has seen enough SOL-style
              questions that the format no longer surprises them, they&apos;ve already done most of the
              anxiety-reduction work — the knowledge improvement follows naturally.
            </p>
            <p>
              Practically: don&apos;t react to wrong practice answers with urgency. &quot;Let&apos;s look at
              that one together&quot; is a very different signal than &quot;you need to know this.&quot;
              Wrong answers during low-stakes practice are exactly what you want to find — that&apos;s the
              exposure working. Keep sessions short, keep the tone even, and let repetition do its job over weeks.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">What Virginia allows for test anxiety accommodations</h2>
            <p>
              If your child&apos;s test anxiety is severe enough to consistently interfere with school performance,
              it may qualify for a 504 plan. Virginia schools recognize anxiety disorders as a condition that
              can substantially limit a major life activity — which is the Section 504 eligibility threshold.
              Test anxiety alone is often not enough for an IEP, but a diagnosed anxiety disorder frequently
              qualifies for 504 support.
            </p>
            <p>
              Accommodations that Virginia allows on SOL tests for eligible students include: extended time
              (typically 1.5× or 2×), a separate testing room or reduced-distraction environment, scheduled
              breaks, and the ability to read questions aloud to themselves. Extended time is especially relevant
              for anxiety because it removes the clock as a stressor — and the VDOE has consistently found that
              extended time benefits students with anxiety more than it benefits students without it.
            </p>
            <p>
              If you think your child might qualify, ask the school counselor for a 504 evaluation. You don&apos;t
              need a formal diagnosis in hand first — the evaluation process is where the school determines eligibility.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Practice with the same accommodations your child gets at school</h2>
            <p>
              One thing that often gets missed: if your child has accommodations at school — extended time,
              read-aloud, a dyslexia font — they should be practicing at home with those same accommodations
              turned on. The whole point of the accommodation is to make the test environment feel normal,
              and that only works if the accommodation itself feels normal first.
            </p>
            <p>
              A child who has TTS at school but practices at home without it isn&apos;t building familiarity with
              their actual test experience. They&apos;re building familiarity with a harder version of it, which
              doesn&apos;t reduce anxiety on test day the same way.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Start practicing free at SolPrep</h2>
            <p>
              SolPrep gives Virginia students in grades 3–8 access to real VDOE-released practice questions in
              short, low-pressure sessions — with all the accommodations built in. Text-to-speech, no timer
              (extended time), dyslexia font, bionic reading, high contrast, step-by-step hints, and three
              adaptive learning tiers so every child starts at the right level.
            </p>
            <p>
              It&apos;s free. No subscription, no paywall, no ads. If test anxiety is something your child
              struggles with, the best thing you can do right now is start building that familiarity — a few
              questions at a time, as low stakes as it gets.
            </p>
            <p>
              <Link href="https://solprep.app/signup" className="text-primary underline">
                Start practicing free at SolPrep →
              </Link>
            </p>
          </section>

        </div>
      </main>

      <LandingFooter isLoggedIn={isLoggedIn} />
    </div>
  )
}
