import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LandingNav } from '@/components/marketing/landing-nav'
import { LandingFooter } from '@/components/marketing/landing-footer'

export const metadata: Metadata = {
  title: 'Math vs Reading SOL — Where Virginia Students Struggle Most (and Why)',
  description:
    'A grade-by-grade look at where Virginia students lose points on Math and Reading SOL tests — common weak spots, why reading comprehension affects math scores, and how to target practice effectively.',
  keywords: [
    'Virginia SOL math struggles',
    'Virginia SOL reading struggles',
    'SOL weak topics by grade',
    'math vs reading SOL Virginia',
    'Virginia SOL pass rates',
    'SOL test prep by grade',
    'reading comprehension math scores',
    'Virginia SOL reporting categories',
  ],
  alternates: { canonical: 'https://solprep.app/blog/math-vs-reading-sol' },
  openGraph: {
    type: 'article',
    publishedTime: '2026-10-26',
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
      { '@type': 'ListItem', position: 3, name: 'Math vs Reading SOL', item: 'https://solprep.app/blog/math-vs-reading-sol' },
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Math vs Reading SOL — Where Virginia Students Struggle Most (and Why)',
    datePublished: '2026-10-26',
    author: { '@type': 'Organization', name: 'SolPrep' },
    publisher: { '@type': 'Organization', name: 'SolPrep', url: 'https://solprep.app' },
    url: 'https://solprep.app/blog/math-vs-reading-sol',
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
          Math vs Reading SOL — Where Virginia Students Struggle Most (and Why)
        </h1>
        <p className="text-sm text-muted-foreground mb-12">October 26, 2026 · 6 min read</p>

        <div className="space-y-8 text-muted-foreground leading-relaxed text-sm">

          <section className="space-y-3">
            <p>
              Every spring, Virginia students in grades 3 through 8 sit for Math and Reading SOL tests.
              Both tests matter — both count toward school accreditation, and both show up on the score report
              a parent brings home. But they don&apos;t work the same way, the skills they test are different
              in kind, and students tend to struggle with them for very different reasons.
            </p>
            <p>
              After working with VDOE released test materials across all six grade levels, we&apos;ve seen
              patterns in where points get lost. This post breaks down the most common weak spots in both
              subjects — grade by grade — and explains something that surprises a lot of parents: reading
              comprehension ability directly affects math scores, and not just on reading tests.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">The big picture on pass rates</h2>
            <p>
              Historically, Virginia Math and Reading SOL pass rates track close together in the lower
              elementary grades, then diverge. Math scores tend to drop in grades 6 and 7 as content
              shifts from arithmetic to algebraic reasoning — a conceptual leap that trips up a significant
              share of students. Reading scores tend to stay steadier in middle school but mask a wide range
              of underlying skill levels because the test format rewards test-taking strategy as much as
              genuine comprehension.
            </p>
            <p>
              The more useful question isn&apos;t &quot;which subject has lower pass rates&quot; but
              &quot;where within each subject are the points actually being lost?&quot; That&apos;s what
              the reporting category table on your child&apos;s score report is for — and it&apos;s the
              question this post tries to answer before you even have a score report in hand.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Where math breaks down, grade by grade</h2>
            <p>
              <strong className="text-foreground">Grades 3 and 4</strong> — The most common weak spot
              is fractions. Students often arrive at the test with a solid grasp of whole-number operations
              but limited exposure to fraction concepts beyond simple visual models. Grade 3 questions ask
              students to identify fractions on a number line, compare fractions with the same numerator
              or denominator, and partition shapes — all tasks that require conceptual understanding, not
              just memorized procedures. Grade 4 adds equivalent fractions and mixed numbers, which trip
              up students who learned fractions as &quot;shading pieces of a circle&quot; rather than as
              a number with a value.
            </p>
            <p>
              Measurement is the second common gap at this level — particularly elapsed time and unit
              conversions. These questions require holding multiple pieces of information in working memory
              simultaneously, which is especially hard for students with attention differences.
            </p>
            <p>
              <strong className="text-foreground">Grade 5</strong> — Decimal operations and order of
              operations are where fifth graders lose the most points. The order-of-operations questions
              on the Grade 5 SOL often look deceptively simple but catch students who apply left-to-right
              rules without accounting for exponents or grouping symbols. Fraction addition and subtraction
              with unlike denominators is a close second — students who can add fractions with the same
              denominator often haven&apos;t internalized why finding a common denominator is necessary,
              so they make consistent procedural errors on unfamiliar problem types.
            </p>
            <p>
              <strong className="text-foreground">Grades 6 and 7</strong> — This is where the largest
              drop in math performance occurs statewide. The shift from arithmetic to algebraic reasoning
              requires students to stop thinking about &quot;what number goes here&quot; and start thinking
              about relationships between quantities. Students who made it through elementary math by
              memorizing procedures often hit a wall. Ratios, proportional reasoning, and writing
              expressions from verbal descriptions are the specific skills where the gap is widest. Percent
              problems — particularly those involving percent change, markup, or discount — also appear
              frequently and require multi-step reasoning that many students haven&apos;t practiced.
            </p>
            <p>
              <strong className="text-foreground">Grade 8</strong> — Linear functions and the Pythagorean
              theorem are the most frequently missed topics. Grade 8 math questions often present the same
              concept in multiple representations — a table, a graph, and an equation all describing the
              same linear relationship — and students who understand one representation sometimes can&apos;t
              connect it to the others. Slope questions, in particular, appear in multiple formats and
              require students to recognize the same meaning across all of them.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Where reading breaks down</h2>
            <p>
              Reading SOL tests are passage-based — students read a selection (fiction or nonfiction) and
              then answer questions about it. The skill that causes the most difficulty isn&apos;t
              vocabulary or literal recall; it&apos;s inference. Questions that ask students to draw
              conclusions, identify implied main ideas, or explain a character&apos;s motivation require
              going beyond what&apos;s stated in the text — and that&apos;s where a wide range of
              students, including many who read fluently, lose points.
            </p>
            <p>
              For fiction passages, the weak spots are character motivation and theme. Students can often
              summarize what happened but struggle to explain why a character made a choice or what the
              passage is really about beyond the surface events.
            </p>
            <p>
              For nonfiction passages, the biggest gaps are author&apos;s purpose and comparing texts.
              Questions asking students to identify why an author wrote a piece — to persuade, to inform,
              to entertain — require understanding tone and intent, not just content. Paired-passage
              questions (two short texts on a related topic) appear in grades 5 through 8 and are
              particularly challenging because students must track two separate authors&apos; viewpoints
              simultaneously.
            </p>
            <p>
              Literary and author&apos;s craft questions — figurative language, point of view, how word
              choice affects meaning — are the hardest reporting category for many students because this
              vocabulary (metaphor, simile, first-person, third-person omniscient) is taught in class but
              often not deeply practiced in the context of unfamiliar passages.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Why reading comprehension affects math scores</h2>
            <p>
              This is the connection that surprises parents most: a child&apos;s reading comprehension
              level directly affects how they perform on math SOL questions — even in calculation-heavy
              sections.
            </p>
            <p>
              Virginia SOL math questions are word problems. Even a grade 3 multiplication question is
              typically presented as a short scenario: &quot;A baker puts 6 cookies on each tray. She has
              4 trays. How many cookies does she have in all?&quot; A student who struggles to parse that
              sentence quickly — who loses track of which number goes where, or misreads &quot;each&quot;
              — may answer incorrectly not because they don&apos;t know multiplication, but because they
              can&apos;t efficiently extract the math from the language.
            </p>
            <p>
              By grades 6 through 8, multi-step word problems routinely require students to hold a
              complex scenario in mind, identify the relevant quantities, and plan a multi-step solution
              — all before doing any computation. Students who read slowly or struggle with working memory
              for text are at a significant disadvantage on these questions even when they know the math.
            </p>
            <p>
              This means that improving reading fluency and comprehension has a direct payoff on math scores
              — an investment that many parents don&apos;t think to make when a child&apos;s identified
              gap is &quot;math.&quot; Strong readers who practice math tend to close math gaps faster,
              because the reading load of the questions isn&apos;t consuming their cognitive bandwidth.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">The format matters as much as the content</h2>
            <p>
              Both Math and Reading SOL tests are almost entirely multiple choice, but they use that format
              very differently. Math questions typically have one clearly correct answer — if you know the
              procedure, the right answer is right. Reading questions often have two plausible-looking
              answers, and the correct one requires a more precise reading of both the passage and the
              question stem. Students who haven&apos;t practiced with real VDOE questions sometimes find
              that their in-class comprehension skills don&apos;t translate directly to picking the right
              choice under time pressure.
            </p>
            <p>
              This is why test format familiarity matters so much — not to teach students to &quot;game&quot;
              multiple choice, but to make the format itself invisible, so they can spend their cognitive
              energy on the actual question rather than on figuring out what&apos;s being asked.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">How to use this for targeted practice</h2>
            <p>
              If your child has taken a previous SOL test, the reporting category breakdown on the score
              report is the clearest guide to where to focus. Map the category name to the specific
              skills above — a low score in &quot;Computation and Estimation&quot; for grade 5 points
              directly at decimal operations and fraction procedures. A low score in
              &quot;Reasoning, Lines, and Transformations&quot; for grade 7 points at geometric thinking
              and proportional reasoning, not computation.
            </p>
            <p>
              If you&apos;re preparing before a first test or a retake without a previous score report,
              the grade-by-grade patterns above are a reasonable starting point. Fractions in grades 3–5,
              ratios and algebraic reasoning in grades 6–7, and linear functions in grade 8 are all
              high-yield areas for math practice. Inference and author&apos;s purpose are the most
              consistently challenging reading skills across all grade levels.
            </p>
            <p>
              And if your child struggles with math word problems in particular — even when the underlying
              math concept seems solid — consider adding reading practice to your rotation. Improving the
              fluency with which they process text removes a real barrier to showing what they know.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Practice with real questions, starting free</h2>
            <p>
              SolPrep&apos;s question library is organized by grade, subject, and topic — so you can
              go directly to &quot;Grade 6 Ratios and Proportional Reasoning&quot; or &quot;Grade 4
              Fractions&quot; rather than working through a mixed practice set. Every question comes
              from official VDOE released test materials, so the format, vocabulary, and difficulty match
              the actual SOL. Three adaptive tiers let students start where they are, not where the
              curriculum expects them to be.
            </p>
            <p>
              If your child has IEP or 504 accommodations — text-to-speech, dyslexia font, extended time,
              bionic reading — SolPrep includes all of them, set once from the parent dashboard and applied
              automatically to every session.
            </p>
            <p>
              <a href="https://solprep.app/signup" className="text-primary underline font-medium">
                Start practicing free at SolPrep
              </a>{' '}
              — no credit card, no paywall. Grades 3–8, Math and Reading, real VDOE questions.
            </p>
          </section>

        </div>
      </main>

      <LandingFooter isLoggedIn={isLoggedIn} />
    </div>
  )
}
