import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LandingNav } from '@/components/marketing/landing-nav'
import { LandingFooter } from '@/components/marketing/landing-footer'

export const metadata: Metadata = {
  title: 'What Is the Virginia SOL Test? A Parent\'s Complete Guide (Grades 3–8)',
  description:
    'Everything Virginia parents need to know about SOL tests — which grades take them, what subjects are covered, how scoring works, what a passing score means, and what happens if your child doesn\'t pass.',
  keywords: [
    'Virginia SOL test',
    'SOL test grades 3-8',
    'Virginia Standards of Learning',
    'SOL test score explained',
    'what is SOL test Virginia',
    'Virginia SOL passing score',
    'SOL test preparation',
    'VDOE released tests',
    'virginia sol test parent guide',
    'sol test math reading',
  ],
  alternates: { canonical: 'https://solprep.app/blog/virginia-sol-test-parent-guide' },
  openGraph: {
    type: 'article',
    publishedTime: '2026-04-11',
    authors: ['SolPrep'],
  },
}

export default async function ArticlePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isLoggedIn = !!user

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav isLoggedIn={isLoggedIn} />

      <main className="max-w-2xl mx-auto px-4 py-16 sm:py-24">
        <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← All posts
        </Link>

        <div className="mt-6 mb-2 text-sm font-semibold text-primary uppercase tracking-wide">Education</div>
        <h1 className="text-3xl sm:text-4xl font-bold leading-tight tracking-tight mb-4">
          What Is the Virginia SOL Test? A Parent&apos;s Complete Guide (Grades 3–8)
        </h1>
        <p className="text-sm text-muted-foreground mb-12">April 11, 2026 · 9 min read</p>

        <div className="space-y-8 text-muted-foreground leading-relaxed text-sm">

          <section className="space-y-3">
            <p>
              If your child is in grades 3 through 8 in a Virginia public school, they take SOL tests every
              spring. Most parents know this — but far fewer know how the tests are structured, what the
              scores actually mean, or what happens when a child doesn&apos;t pass. This guide answers all of it,
              in plain language.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">What does SOL stand for?</h2>
            <p>
              SOL stands for <strong className="text-foreground">Standards of Learning</strong> — Virginia&apos;s
              statewide academic standards that define what students are expected to know and be able to do
              at each grade level. The Virginia Department of Education (VDOE) writes and updates these
              standards periodically to reflect both research and real-world skills.
            </p>
            <p>
              The SOL tests are the assessments that measure whether students have met those standards.
              Virginia has administered them since 1998, making them one of the longer-running statewide
              testing programs in the country. The tests are not optional — they are administered to all
              students in Virginia public schools in tested grades and subjects.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Which grades take SOL tests, and in what subjects?</h2>
            <p>
              Every grade from 3 to 8 takes Math and Reading SOL tests each spring. Beyond those two,
              the subject coverage expands as students get older:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li><strong className="text-foreground">Math:</strong> Grades 3, 4, 5, 6, 7, and 8</li>
              <li><strong className="text-foreground">Reading:</strong> Grades 3, 4, 5, 6, 7, and 8</li>
              <li><strong className="text-foreground">Science:</strong> Grades 3, 5, and 8</li>
              <li><strong className="text-foreground">History &amp; Social Science:</strong> Grades 3, 4, 5, 6, 7, and 8 (specific eras and topics vary by grade)</li>
              <li><strong className="text-foreground">Writing:</strong> Grades 5 and 8</li>
            </ul>
            <p>
              Math and Reading are tested every year because they are foundational to everything else a
              student learns. Science and History tests are spaced out because the curriculum covers
              distinct eras or topics at each grade level — there&apos;s no point re-testing grade 3 science
              content in grade 4.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">What does the test look like?</h2>
            <p>
              SOL tests are administered on computers and are almost entirely multiple-choice — four answer
              options labeled A, B, C, D (or F, G, H, J on some older tests). Most tests have between
              40 and 50 questions. Students select one answer per question and move on; there is no
              partial credit.
            </p>
            <p>
              Some newer versions of the tests include <em>technology-enhanced items</em> — questions
              where students drag and drop, click on a part of an image, or select multiple correct answers.
              These are still scored as right or wrong.
            </p>
            <p>
              <strong className="text-foreground">Math tests</strong> are split into two sections: a
              calculator-inactive section (testing number sense, mental math, and estimation) and a
              calculator-active section. The calculator provided is a simple four-function calculator
              built into the test software — not a graphing calculator.
            </p>
            <p>
              <strong className="text-foreground">Reading tests</strong> are passage-based. Students read
              a literary or informational passage and answer comprehension, vocabulary, and analysis
              questions about it. The passages are selected to reflect the complexity expected at each
              grade level.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">When are SOL tests given?</h2>
            <p>
              The primary testing window runs from <strong className="text-foreground">late April through
              early June</strong> each school year. Schools schedule their specific test dates within
              this window — your child&apos;s school will typically communicate the schedule a few weeks in advance.
            </p>
            <p>
              Students who do not pass during the spring window have opportunities to retake in summer
              or in the fall of the following school year. The number of retake opportunities and the
              specific windows vary by school division.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">How is the SOL test scored?</h2>
            <p>
              This is where most parents get confused — and understandably so, because the scoring has
              a few layers.
            </p>
            <p>
              Raw scores (the number of questions answered correctly) are converted to a
              <strong className="text-foreground"> scaled score</strong> on a 0–600 point scale. The
              conversion accounts for slight differences in difficulty between test versions from year to
              year, so a scaled score of 430 means the same thing regardless of which version of the test
              a student took.
            </p>
            <p>
              Scaled scores are grouped into three performance levels:
            </p>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li>
                <strong className="text-foreground">Did Not Pass</strong> — scaled score below 400.
                The student has not demonstrated proficiency with grade-level content.
              </li>
              <li>
                <strong className="text-foreground">Pass/Proficient</strong> — scaled score of 400–499.
                The student has met the grade-level standard. This is the passing threshold.
              </li>
              <li>
                <strong className="text-foreground">Pass/Advanced</strong> — scaled score of 500 or above.
                The student has exceeded the grade-level standard and demonstrated mastery beyond
                what is required.
              </li>
            </ul>
            <p>
              A score of exactly 400 is passing. A score of 399 is not. The specific cut score can vary
              slightly by subject and test year as VDOE recalibrates, so always refer to the score report
              your child brings home for the definitive result.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">How to read your child&apos;s score report</h2>
            <p>
              Score reports include the scaled score and the performance level, but also something more
              useful for parents: <strong className="text-foreground">reporting category breakdowns</strong>.
              These show how the student performed in each topic area within the test — for example,
              a grade 4 math report might show separate scores for Number Sense, Computation and Estimation,
              Measurement, Geometry, and Patterns/Functions/Algebra.
            </p>
            <p>
              This breakdown is where the real diagnostic value is. A child can pass the overall test
              while still struggling significantly in one category — and that category is exactly where
              targeted practice will have the most impact before the next test.
            </p>
            <p>
              Some score reports also include a percentile rank (how the student&apos;s score compares to other
              Virginia students who took the same test), though this is a relative measure and a high
              percentile in a weak subject area shouldn&apos;t be mistaken for mastery.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">What happens if my child doesn&apos;t pass?</h2>
            <p>
              For most grades (3–7), not passing an SOL test does not automatically mean a student is
              held back. Retention decisions are made by the school based on the full picture of a
              student&apos;s performance, not SOL scores alone. However, failing an SOL test does trigger
              requirements for additional support, and schools are required to notify parents and provide
              a remediation plan.
            </p>
            <p>
              <strong className="text-foreground">Grade 3 Reading is the most consequential.</strong> Virginia
              law requires that students demonstrate reading proficiency by the end of third grade. Students
              who do not pass the Grade 3 Reading SOL must demonstrate proficiency through an alternative
              assessment or reading portfolio, or they may be retained. This is taken very seriously by
              schools and is worth preparing for well in advance.
            </p>
            <p>
              For high school graduation, students must earn verified credits by passing SOL tests in five
              content areas (English Reading, English Writing, Math, Science, and History). Grades 3–8
              SOL tests don&apos;t directly count toward graduation credits, but the skills they test are the
              foundation everything else is built on.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">What&apos;s actually on the Math SOL by grade?</h2>
            <p>
              The Math SOL curriculum spirals — each grade builds directly on what came before. Here&apos;s
              a brief overview of the major content areas by grade:
            </p>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li><strong className="text-foreground">Grade 3:</strong> Place value, addition/subtraction with regrouping, multiplication and division concepts, fractions, measurement, basic geometry, data/graphs</li>
              <li><strong className="text-foreground">Grade 4:</strong> Multi-digit multiplication and division, fractions and decimals, measurement and elapsed time, geometry, probability</li>
              <li><strong className="text-foreground">Grade 5:</strong> Decimal operations, fraction operations, order of operations, volume and area, coordinate plane, data analysis</li>
              <li><strong className="text-foreground">Grade 6:</strong> Ratios and proportional reasoning, integers, algebraic expressions, geometry, statistics</li>
              <li><strong className="text-foreground">Grade 7:</strong> Proportions, percent, linear equations, transformations, probability, data analysis</li>
              <li><strong className="text-foreground">Grade 8:</strong> Linear functions, systems of equations, Pythagorean theorem, geometry, statistics</li>
            </ul>
            <p>
              If a student struggles with a later grade&apos;s content, it often traces back to a gap in an
              earlier grade&apos;s foundation. A grade 6 student who struggles with ratios may be missing
              fraction fluency from grade 5.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Where do the practice questions come from?</h2>
            <p>
              VDOE releases actual past test questions publicly — these are called <em>released tests</em>.
              They are the single best preparation resource available because they are the real thing:
              the same question format, the same difficulty calibration, the same language. No third-party
              practice book can replicate the specificity of actual VDOE-written questions.
            </p>
            <p>
              Released tests are available on the VDOE website, typically as downloadable PDFs. The
              challenge for most families is that the PDFs are static — you can read them, but you
              can&apos;t practice interactively with them, track which topics you&apos;re weak on, or get immediate
              feedback.
            </p>
            <p>
              SolPrep was built to solve exactly this problem. We extracted over 2,300 questions from
              official VDOE released tests for grades 3–8 in Math and Reading, and built an interactive
              practice platform around them. Every question on SolPrep is either a real VDOE released
              test question or an AI-generated question aligned to current Virginia SOL standards.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">How to prepare — what actually works</h2>
            <p>
              A few principles that research and practice both support:
            </p>
            <p>
              <strong className="text-foreground">Use real VDOE questions.</strong> Generic test prep
              books often don&apos;t match the specific wording, format, or difficulty calibration of the
              actual SOL. Practicing with real released questions means your child is practicing for
              the exact thing they&apos;ll face.
            </p>
            <p>
              <strong className="text-foreground">Practice frequently in short sessions, not marathon
              cramming.</strong> The research on spaced repetition is clear: 15–20 minutes of practice
              three or four times per week produces better retention than a single two-hour session.
              SOL tests happen in late spring — starting in January or February gives enough time for
              meaningful improvement without pressure.
            </p>
            <p>
              <strong className="text-foreground">Focus on weak topics, not just volume.</strong> A child
              who already understands fractions doesn&apos;t benefit from practicing more fraction problems.
              The score report&apos;s reporting category breakdown tells you exactly where the gaps are.
              Target those categories specifically.
            </p>
            <p>
              <strong className="text-foreground">Don&apos;t neglect Reading.</strong> Reading SOL scores predict
              performance on every other subject&apos;s test — because all tests require reading comprehension.
              A student who struggles with the Reading SOL likely also loses points on Math and Science
              tests due to misreading questions.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">A note on test anxiety</h2>
            <p>
              Test anxiety is real and common — studies suggest it affects 25–40% of students to some
              degree. The best antidote is familiarity: students who have practiced with the test format
              many times experience the real test as familiar rather than threatening. This is one of
              the strongest arguments for regular at-home practice well before the test window.
            </p>
            <p>
              If your child has a diagnosed anxiety disorder, ADHD, or other condition that affects
              test performance, ask their teacher or school counselor about available accommodations.
              Virginia allows accommodations including extended time, read-aloud, reduced-distraction
              environments, and more — all documented in an IEP or 504 plan. These same accommodations
              are available in SolPrep so your child can practice the way they&apos;ll test.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Start practicing with real VDOE questions — free</h2>
            <p>
              SolPrep is a free Virginia SOL practice platform built around real VDOE released test
              questions for grades 3–8 in Math and Reading. You can set up a child profile in under
              two minutes, choose practice or timed test mode, and start working through the same
              questions that have appeared on real SOL exams.
            </p>
            <p>
              If your child has IEP or 504 accommodations, SolPrep supports text-to-speech, dyslexia
              font, bionic reading, high contrast, extended time, and font size adjustments — all
              configurable per child, free, no account required for parents to browse.
            </p>
            <p>
              <Link href="/signup" className="text-primary underline">
                Create a free account
              </Link>{' '}
              and start a session today. The spring testing window comes faster than it feels like it will.
            </p>
          </section>

        </div>
      </main>

      <LandingFooter isLoggedIn={isLoggedIn} />
    </div>
  )
}
