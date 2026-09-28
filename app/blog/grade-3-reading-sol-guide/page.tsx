import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LandingNav } from '@/components/marketing/landing-nav'
import { LandingFooter } from '@/components/marketing/landing-footer'

export const metadata: Metadata = {
  title: 'Grade 3 Reading SOL: Why It Matters More Than Any Other Elementary Test',
  description:
    'The Virginia Literacy Act makes the Grade 3 Reading SOL the one elementary test with real retention stakes. Learn what it tests, what a passing score means, and how to help your child prepare.',
  keywords: [
    'Grade 3 Reading SOL Virginia',
    'Virginia Literacy Act retention',
    'third grade reading gate Virginia',
    'SOL reading test grade 3',
    'Virginia SOL reading skills',
    'Grade 3 SOL passing score',
    'reading retention Virginia law',
    'SOL prep Grade 3',
  ],
  alternates: { canonical: 'https://solprep.app/blog/grade-3-reading-sol-guide' },
  openGraph: {
    type: 'article',
    publishedTime: '2026-09-28',
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
      { '@type': 'ListItem', position: 3, name: 'Grade 3 Reading SOL Guide', item: 'https://solprep.app/blog/grade-3-reading-sol-guide' },
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Grade 3 Reading SOL: Why It Matters More Than Any Other Elementary Test',
    datePublished: '2026-09-28',
    author: { '@type': 'Organization', name: 'SolPrep' },
    publisher: { '@type': 'Organization', name: 'SolPrep', url: 'https://solprep.app' },
    url: 'https://solprep.app/blog/grade-3-reading-sol-guide',
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
          Grade 3 Reading SOL: Why It Matters More Than Any Other Elementary Test
        </h1>
        <p className="text-sm text-muted-foreground mb-12">September 28, 2026 · 6 min read</p>

        <div className="space-y-8 text-muted-foreground leading-relaxed text-sm">

          <section className="space-y-3">
            <p>
              When parents hear that the Grade 3 Reading SOL is different from every other elementary test
              in Virginia, the reaction is often skepticism. Their child has taken SOL tests before — what
              makes this one special?
            </p>
            <p>
              The answer is a state law called the Virginia Literacy Act. Under it, a third grader who
              doesn&apos;t demonstrate reading proficiency by the end of the school year is at real risk of
              not advancing to fourth grade. That makes the Grade 3 Reading SOL the one elementary test
              with immediate, concrete consequences — not someday, not for high school credit, but for
              the very next fall.
            </p>
            <p>
              This post explains what the law actually says, what the test actually measures, and what
              parents can do to help their child get there.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">What the Virginia Literacy Act says</h2>
            <p>
              Virginia passed the Virginia Literacy Act in 2022, with full implementation taking effect
              in the 2024–25 school year. The law is part of a nationwide move toward structured literacy
              instruction — explicit phonics, grade-level benchmarks, and early intervention built around
              research on how children learn to decode text.
            </p>
            <p>
              The key provision for parents: students who are not reading at grade level by the end of
              third grade may be retained rather than promoted. Schools are required to identify struggling
              readers early, put reading intervention plans in place, and document the support provided.
              Retention is not automatic — families have input, and schools must consider all available
              evidence — but it is on the table in a way it never was before.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Why third grade specifically?</h2>
            <p>
              Reading in third grade shifts from &quot;learning to read&quot; to &quot;reading to learn.&quot;
              Every subject from that point forward — science, social studies, even many math word problems
              — depends on reading fluency and comprehension. A student who isn&apos;t a fluent decoder by
              third grade doesn&apos;t just struggle in reading class; they face a barrier across every
              subject for the rest of their school career.
            </p>
            <p>
              This is the research that drove the Virginia Literacy Act. Studies going back to the 1990s,
              including work published by the Annie E. Casey Foundation, found that students who aren&apos;t
              reading at grade level by the end of third grade are significantly less likely to graduate
              from high school than proficient readers. Early intervention — even when it feels disruptive
              — is a better outcome than years of compounding academic struggle.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">What the Grade 3 Reading SOL actually tests</h2>
            <p>
              The Grade 3 Reading SOL is a 45–50 question computer-adaptive assessment administered during
              the spring testing window, typically late April through June. It covers five skill strands:
            </p>
            <p>
              <strong className="text-foreground">Word Study and Phonics</strong> — Phonemic awareness, decoding
              multisyllabic words, understanding word families, and recognizing prefixes and suffixes. This
              is the foundation. Students who struggle here often struggle across the rest of the test.
            </p>
            <p>
              <strong className="text-foreground">Vocabulary</strong> — Understanding words in context, using
              context clues, and figuring out the meaning of unfamiliar words from roots or surrounding text.
            </p>
            <p>
              <strong className="text-foreground">Reading Comprehension — Fiction</strong> — Identifying the
              main character, setting, and plot; recognizing cause and effect; drawing inferences;
              understanding character motivation.
            </p>
            <p>
              <strong className="text-foreground">Reading Comprehension — Nonfiction</strong> — Finding the
              main idea and supporting details, identifying the author&apos;s purpose, and comparing two
              informational passages.
            </p>
            <p>
              <strong className="text-foreground">Literary Elements and Author&apos;s Craft</strong> — Why did
              the author use that word? What does this heading tell us? What is the narrator&apos;s point of view?
            </p>
            <p>
              Each of these shows up on the score report as a separate reporting category — one of the most
              useful things on the document, because it tells you not just whether your child passed, but
              exactly where they&apos;re strong and where they need more practice.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">How scores work — and what &quot;passing&quot; means</h2>
            <p>
              The Grade 3 Reading SOL uses scaled scores from 0 to 600. A score of 400 is the passing
              threshold. Scores between 400 and 499 are Pass/Proficient. Scores of 500 and above are
              Pass/Advanced.
            </p>
            <p>
              For the Grade 3 Reading SOL, that 400 threshold carries extra weight. It is the evidence
              Virginia schools use to determine whether a student is reading at grade level under the
              Virginia Literacy Act. A score below 400 typically triggers a formal reading intervention
              plan, parent notification, and a possible retention review.
            </p>
            <p>
              The test is computer-adaptive, which means questions adjust based on how well a child is
              doing in real time. A child who answers early questions correctly will see harder questions;
              a child who struggles will see scaffolded versions. This makes the scaled score a more
              accurate reflection of actual skill than a traditional fixed-form test produces.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Skills parents can build at home</h2>
            <p>
              The good news: the skills the Grade 3 Reading SOL tests are the same skills good readers
              build through everyday reading. Parents don&apos;t need to replicate school instruction —
              they need to support it consistently.
            </p>
            <p>
              <strong className="text-foreground">Ask &quot;why&quot; questions about books.</strong>{' '}
              &quot;Why do you think the character did that?&quot; practices inference and character
              motivation — two of the most commonly tested comprehension skills.
            </p>
            <p>
              <strong className="text-foreground">Point out context clues.</strong> When your child
              hits an unfamiliar word, don&apos;t just tell them what it means. Ask: &quot;What do the
              words around it tell you?&quot; This directly trains the vocabulary strand.
            </p>
            <p>
              <strong className="text-foreground">Read nonfiction together.</strong> Many children read
              mostly fiction at home. Age-appropriate nonfiction — science books, history books, magazines
              like National Geographic Kids — builds the main idea and author&apos;s purpose skills that
              trip up even strong fiction readers.
            </p>
            <p>
              <strong className="text-foreground">Talk about what they read.</strong> Oral comprehension
              predicts reading comprehension. A child who can retell what they read — in order, with
              details — is building exactly the schema the test draws on.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">What happens if your child doesn&apos;t pass</h2>
            <p>
              Virginia law requires that schools meet with parents before making a retention decision.
              At that meeting, families can present evidence — classroom grades, teacher observations,
              work samples — that the child is reading at grade level even if the SOL score tells a
              different story.
            </p>
            <p>
              Options that schools and families can pursue include: summer reading intervention, a written
              promotion agreement outlining steps the child will take to demonstrate proficiency, or a
              second SOL administration. Students may retest, and many families use the summer to close
              the gap before the fall.
            </p>
            <p>
              If your child has an IEP or 504 plan, the retention decision must account for their
              disability and the accommodations they&apos;re entitled to. A single test score cannot be
              the only factor in a retention decision, and parents have the right to advocate for their
              child at every step of that process.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Starting early is the whole strategy</h2>
            <p>
              The families who feel most prepared for spring SOL season didn&apos;t start in April. They
              built a habit in the fall — short, low-stakes practice a few times a week — and by spring
              the test format was familiar, the question types weren&apos;t a surprise, and their child
              walked into the testing room feeling confident.
            </p>
            <p>
              Familiarity is genuinely the best antidote to test anxiety, and for the Grade 3 Reading SOL
              in particular, starting early gives struggling readers time to actually close skill gaps
              rather than just cram vocabulary in the final week.
            </p>
            <p>
              If your child has accommodations at school — text-to-speech, extended time, a dyslexia
              font — they should be practicing with those accommodations at home too, not just on test day.
              Accommodations work best when they&apos;re familiar, not novel.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Start practicing free at SolPrep</h2>
            <p>
              SolPrep was built by a Virginia parent specifically for this kind of practice. Real VDOE
              released questions, adaptive difficulty, and built-in accommodations for kids who learn
              differently — text-to-speech, dyslexia font, bionic reading, high contrast, extended time.
              No subscription, no ads. Free.
            </p>
            <p>
              If your child is heading into third grade — or is already there — the time to start is now,
              not the week before the test.{' '}
              <a href="https://solprep.app/signup" className="text-primary underline">
                Start practicing free at SolPrep →
              </a>
            </p>
          </section>

        </div>
      </main>

      <LandingFooter isLoggedIn={isLoggedIn} />
    </div>
  )
}
