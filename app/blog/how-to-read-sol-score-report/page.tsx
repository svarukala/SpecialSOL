import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LandingNav } from '@/components/marketing/landing-nav'
import { LandingFooter } from '@/components/marketing/landing-footer'

export const metadata: Metadata = {
  title: "How to Read Your Child's SOL Score Report",
  description:
    "A plain-language guide to understanding Virginia SOL score reports — scaled scores, Pass/Proficient vs Pass/Advanced, reporting category breakdowns, and how to use the data to target practice.",
  keywords: [
    'SOL score report',
    'Virginia SOL scaled score',
    'SOL Pass Proficient Pass Advanced',
    'how to read SOL score report',
    'SOL reporting categories',
    'SOL score 400',
    'Virginia SOL score explained',
    'Grade 3 reading gate Virginia',
    'SOL score parent guide',
    'VDOE score report',
  ],
  alternates: { canonical: 'https://solprep.app/blog/how-to-read-sol-score-report' },
  openGraph: {
    type: 'article',
    publishedTime: '2026-05-05',
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
          How to Read Your Child&apos;s SOL Score Report
        </h1>
        <p className="text-sm text-muted-foreground mb-12">May 5, 2026 · 5 min read</p>

        <div className="space-y-8 text-muted-foreground leading-relaxed text-sm">

          <section className="space-y-3">
            <p>
              When your child brings home a Virginia SOL score report, the page looks dense — a scaled score,
              a performance level, a table of categories with numbers next to each one. Most parents glance
              at whether it says &ldquo;Pass&rdquo; and move on. That&apos;s understandable, but the report
              contains more useful information than just the pass/fail. This guide walks through every part
              of it so you know exactly what you&apos;re looking at.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">The scaled score: 0 to 600</h2>
            <p>
              Every Virginia SOL test is scored on a scale from 0 to 600. Your child doesn&apos;t receive
              a raw percentage — the number of correct answers is converted to a scaled score through a
              process called equating. Equating adjusts for slight differences in difficulty between test
              versions from year to year, so a 430 on this year&apos;s test means the same thing as a 430
              on last year&apos;s test, even if the questions weren&apos;t identical.
            </p>
            <p>
              The scale is designed so that 400 is the passing threshold. Below 400: did not pass.
              400 and above: passing. Above 500: advanced. These cut points are set by the Virginia Board
              of Education — they are policy decisions, not measurement thresholds. A score of 399 is not
              meaningfully different from a score of 401 in terms of what a student knows. But for
              reporting and accountability purposes, 400 is the line.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">What 400 means — and what it doesn&apos;t</h2>
            <p>
              A score of 400 (Pass/Proficient) means your child has demonstrated sufficient knowledge of
              grade-level content to meet the standard Virginia sets. It is not a guarantee that every
              topic is mastered — it means the overall performance cleared the policy threshold.
            </p>
            <p>
              A child can pass the overall test while still having meaningful gaps in specific topic areas.
              The score report&apos;s reporting category table (described below) is where those gaps become
              visible. Paying attention only to the overall score misses the most actionable part of
              the report.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Pass/Proficient vs. Pass/Advanced</h2>
            <p>
              The three performance levels on every Virginia SOL score report are:
            </p>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li>
                <strong className="text-foreground">Did Not Pass</strong> — scaled score below 400.
                The student has not met the grade-level standard.
              </li>
              <li>
                <strong className="text-foreground">Pass/Proficient</strong> — scaled score of 400–499.
                The student has met the standard. This is the passing threshold for all purposes.
              </li>
              <li>
                <strong className="text-foreground">Pass/Advanced</strong> — scaled score of 500 or above.
                The student has exceeded the standard and demonstrated mastery beyond what is required.
              </li>
            </ul>
            <p>
              For grades 3–7, Pass/Proficient and Pass/Advanced are both passing — the distinction matters
              for context, but both move a student forward.
            </p>
            <p>
              For <strong className="text-foreground">8th grade End-of-Course (EOC) tests</strong> in
              Algebra I, Biology, and other subjects, Pass/Advanced carries additional weight: it can
              earn a student verified credit toward high school graduation one year early. A student who
              earns Pass/Advanced on the Algebra I SOL in 8th grade can have that count as one of the
              five verified credits required for a Standard Diploma — without retaking an EOC in high school.
              This is worth knowing if your 8th grader is taking a high school course.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">The reporting category table</h2>
            <p>
              Below the overall score, every SOL score report includes a table that breaks performance
              down by topic area. The categories vary by subject and grade — a Grade 5 Math report might
              show categories like Number and Number Sense, Computation and Estimation, Measurement and
              Geometry, Probability and Statistics, and Patterns, Functions, and Algebra. A Grade 6
              Reading report might show categories like Understand and Analyze Literary and Nonfiction
              Texts, and Understand and Use Language.
            </p>
            <p>
              Each category shows the number of questions answered correctly out of the number of
              questions in that category — for example, 7/10 or 4/8. Some reports also show a percentage.
              What matters is not the raw number but the ratio: a 5/6 in one category and a 3/8 in
              another tells you very different things, even if the raw numbers look close.
            </p>
            <p>
              This breakdown is the most diagnostic part of the report. A student who passed overall
              with a 420 but scored 3/8 in one category has a specific gap that targeted practice
              can close. A student who scored 490 but has 4/10 in one category may be coasting on
              strength in other areas while heading into next year with a real weakness.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">How to use the categories to target practice</h2>
            <p>
              Once you&apos;ve identified a weak category, the path forward is specific. General SOL
              practice — working through random questions — will improve overall performance slowly.
              Targeting a weak category directly is faster and more efficient.
            </p>
            <p>
              A practical approach: take the category name from the score report and map it to the
              topics your child practices. For example, if the score report shows a low score in
              &ldquo;Measurement and Geometry&rdquo; for Grade 4, focus practice sessions on
              measurement units, elapsed time, perimeter, area, and basic geometry — not on
              computation or fractions, where they may already be strong.
            </p>
            <p>
              SolPrep organizes every practice question by topic, aligned to current Virginia SOL
              standards. When your child practices, the parent dashboard shows accuracy by topic —
              the same breakdown as the score report, updated after every session. You can see
              exactly where a gap persists and whether practice is closing it.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">The Grade 3 Reading gate</h2>
            <p>
              Grade 3 Reading deserves special attention. Virginia law requires that students demonstrate
              reading proficiency by the end of third grade. A student who does not pass the Grade 3
              Reading SOL must either pass an alternative assessment, demonstrate proficiency through
              a reading portfolio, or — if neither alternative is met — may be retained.
            </p>
            <p>
              This is the most direct connection between an SOL result and grade retention in the
              elementary years. Schools take it seriously, and families should too. If a third grader
              is struggling with Reading, the time to address it is before the spring test window —
              not after.
            </p>
            <p>
              The score report&apos;s reading categories (literary text, informational text, vocabulary,
              language) show which aspects of reading need the most work. A child who struggles
              specifically with informational text comprehension needs different practice than one
              who struggles with vocabulary in context.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">What a retake looks like</h2>
            <p>
              Students who do not pass during the primary spring testing window (late April through
              early June) typically have opportunities to retake in summer or in the fall of the
              following school year. The number of retake windows and the scheduling varies by
              school division — contact your school&apos;s testing coordinator for specifics.
            </p>
            <p>
              A retake is an opportunity, not a penalty. The score report from the first attempt is
              the best guide for what to work on between the first test and the retake. Students who
              use that time for targeted practice — rather than general review — tend to improve more
              per hour of study.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">One number vs. the full picture</h2>
            <p>
              The overall scaled score is one number. The reporting categories are a map. The overall
              score tells you whether your child passed; the categories tell you what to do next.
            </p>
            <p>
              For a student who passed: the categories show where they&apos;re strongest and where they
              have room to grow — useful context heading into the next grade&apos;s content.
            </p>
            <p>
              For a student who didn&apos;t pass: the categories show which areas contributed most to
              the shortfall, so the path to passing a retake is specific rather than vague.
            </p>
            <p>
              In both cases, the score report gives you more than a verdict — it gives you a
              starting point for the next step.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Put the categories to work</h2>
            <p>
              SolPrep is free Virginia SOL practice built around real VDOE released test questions
              for grades 3–8 in Math and Reading. Practice is organized by topic — so if the score
              report shows a weak category, you can go directly to that topic rather than working
              through a random mix.
            </p>
            <p>
              The parent dashboard shows accuracy by topic after every session, updated in real time.
              If you&apos;re using it to prepare for a retake, you can watch the weak category improve
              session by session and know when it&apos;s genuinely closing.
            </p>
            <p>
              <Link href="/signup" className="text-primary underline">
                Create a free account
              </Link>{' '}
              and start a session today. Set up takes under two minutes, and you can be working on
              the exact categories the score report flagged within the first session.
            </p>
          </section>

        </div>
      </main>

      <LandingFooter isLoggedIn={isLoggedIn} />
    </div>
  )
}
