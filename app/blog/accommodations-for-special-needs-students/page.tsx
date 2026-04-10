import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LandingNav } from '@/components/marketing/landing-nav'
import { LandingFooter } from '@/components/marketing/landing-footer'

export const metadata: Metadata = {
  title: 'Accommodations for Special Needs Students — The Science Behind SolPrep\'s Accessibility Features',
  description:
    'What IEP and 504 accommodations look like in practice, the research behind dyslexia fonts, bionic reading, high contrast, and text-to-speech — and how SolPrep implements each one for Virginia SOL prep.',
  keywords: [
    'IEP accommodations Virginia SOL',
    '504 plan test accommodations',
    'dyslexia font reading research',
    'bionic reading science',
    'text to speech learning disabilities',
    'high contrast accessibility',
    'special needs test prep Virginia',
    'SOL accommodations dyslexia ADHD',
  ],
  alternates: { canonical: 'https://solprep.app/blog/accommodations-for-special-needs-students' },
  openGraph: {
    type: 'article',
    publishedTime: '2026-04-10',
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
          Accommodations for Special Needs Students — What the Research Says, and What We Built
        </h1>
        <p className="text-sm text-muted-foreground mb-12">April 10, 2026 · 10 min read</p>

        <div className="space-y-8 text-muted-foreground leading-relaxed text-sm">

          <section className="space-y-3">
            <p>
              When a child has an IEP or 504 plan, they're entitled to accommodations that level the playing field —
              not to make tests easier, but to remove barriers that have nothing to do with what they actually know.
              A student who understands a math concept shouldn't fail because the question was printed in a font that
              makes letters flip, or because a 30-minute time limit triggers anxiety before they've read the first problem.
            </p>
            <p>
              These accommodations are well-established in public school law. What's less common is seeing them
              implemented in the test prep tools students use at home. SolPrep was built specifically to bring
              classroom accommodations into SOL practice — and this post explains both the research behind each one
              and how we implemented it.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">What IEP and 504 accommodations actually are</h2>
            <p>
              The Individuals with Disabilities Education Act (IDEA) guarantees students with qualifying disabilities
              a free, appropriate public education — including accommodations documented in an Individualized Education
              Program (IEP). Section 504 of the Rehabilitation Act covers students who don't qualify for special
              education services but still need support, typically through a 504 plan.
            </p>
            <p>
              Accommodations are not modifications. A modification changes <em>what</em> is being assessed —
              fewer questions, different content. An accommodation changes <em>how</em> a student demonstrates
              knowledge — more time, different format, assistive technology — while keeping the content the same.
              The distinction matters because standardized tests like the Virginia SOL use accommodations, not
              modifications, to maintain the validity of the assessment.
            </p>
            <p>
              Common SOL-approved accommodations in Virginia include: extended time, read-aloud (text-to-speech),
              breaks as needed, enlarged print, reduced-distraction testing environment, use of a calculator,
              and directions read aloud. Each of these maps to something SolPrep offers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Text-to-speech (read aloud)</h2>
            <p>
              Read-aloud is one of the most commonly granted SOL accommodations for students with dyslexia,
              visual impairments, and language processing disorders. The research basis is strong: a 2014 meta-analysis
              by Buzick and Stone across 15 studies found that read-aloud accommodations significantly improved
              scores for students with reading disabilities — an average effect size of 0.62, meaning the
              accommodation added more than half a standard deviation to their performance.
            </p>
            <p>
              The mechanism is well understood. Reading a question requires two separate cognitive operations:
              decoding (turning printed symbols into words) and comprehension (understanding the meaning). For
              students with dyslexia, decoding consumes so much working memory that comprehension suffers — even
              when the student fully understands the underlying concept. Read-aloud removes the decoding bottleneck
              and lets comprehension do its job.
            </p>
            <p>
              In SolPrep, TTS reads the full question text and each answer choice aloud. Parents can also set the
              speech rate — slower for kids who need more processing time, faster for those who just need the
              initial barrier removed. The feature uses the Web Speech API, which is built into all modern browsers,
              so it works without any plugins or installs.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Dyslexia-friendly font (OpenDyslexic)</h2>
            <p>
              Dyslexia affects approximately 15–20% of the population and is the most common learning disability
              among school-age children. One of its hallmarks is letter reversal and rotation — the brain
              perceives similar-shaped letters like b/d, p/q, or n/u as interchangeable, leading to misreading.
            </p>
            <p>
              OpenDyslexic, created by designer Abelardo Gonzalez, addresses this by giving each letter a
              weighted bottom — a heavier baseline that provides an orientation anchor for the eye.
              The theory is that this added visual weight makes it harder for the brain to unconsciously
              rotate or flip a letter, because the &quot;heavy&quot; end would be wrong if flipped.
            </p>
            <p>
              The research is nuanced. A frequently cited 2013 study by Rello and Baeza-Yates found that
              OpenDyslexic improved reading speed for participants with dyslexia compared to Arial,
              Times New Roman, and Helvetica. However, a 2016 study by Wery and Diliberto found no significant
              improvement in reading speed or accuracy. A 2019 meta-analysis concluded that while no single
              font is definitively superior for all dyslexic readers, fonts with clear letterform differentiation
              (like OpenDyslexic) consistently perform better for a meaningful subset of readers.
            </p>
            <p>
              Our interpretation: the evidence doesn't support mandating OpenDyslexic for everyone, but for
              the students it helps, the improvement is real and meaningful. We make it optional — parents enable
              it if their child responds positively. That's the right call: accommodate the individual, not the diagnosis.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Bionic reading</h2>
            <p>
              Bionic Reading was introduced by Swiss typographic designer Renato Capocci in 2022. The concept
              is based on how the brain processes text during reading: rather than reading every letter of every
              word, skilled readers use fixation points — brief moments where the eye stops — and the brain
              predicts the rest of the word from partial information. Bionic Reading makes those fixation points
              explicit by bolding the first few letters of each word.
            </p>
            <p>
              The algorithm we use: for each word of length <em>n</em>, bold the first{' '}
              <code>min(ceil(n / 2), 4)</code> characters. So &quot;reading&quot; (7 letters) gets its
              first 4 bolded — <strong>read</strong>ing. &quot;cat&quot; (3 letters) gets the first 2 —{' '}
              <strong>ca</strong>t. This gives the eye a consistent anchor without overwhelming short words.
            </p>
            <p>
              The scientific picture here is honest: a 2023 study by researchers at the University of Würzburg
              found that Bionic Reading did not significantly improve reading speed or comprehension for typical
              readers — and may slightly slow some readers down by drawing attention to the formatting.
              However, the same study noted that self-reported comfort and preference were higher for readers
              who struggled with attention or processing speed, particularly those with ADHD.
            </p>
            <p>
              For students with ADHD, the bolded anchors may help maintain focus and reduce re-reading of lines
              — not because it changes comprehension, but because it gives the eye a path to follow.
              Users in our feedback have described it as making the text feel &quot;less overwhelming.&quot;
              Again, we surface it as an opt-in toggle, not a default.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">High contrast mode</h2>
            <p>
              High contrast is the most broadly supported accessibility accommodation — mandated by WCAG 2.1
              (the international web accessibility standard) for all public-facing websites, and commonly listed
              in IEPs for students with visual impairments, migraines, or sensory sensitivities.
            </p>
            <p>
              The WCAG 2.1 standard requires a contrast ratio of at least 4.5:1 between text and background
              for normal text, and 3:1 for large text (18pt or 14pt bold and above). Standard reading on a
              white background with black text is approximately 21:1 — the theoretical maximum. The challenge
              is that many sites use gray text on white backgrounds for aesthetic reasons, which can drop to
              3:1 or lower — technically passing for large text but failing for body copy.
            </p>
            <p>
              Irlen Syndrome (also called scotopic sensitivity or visual stress) affects an estimated 12–14%
              of the general population and up to 46% of individuals with dyslexia (Irlen, 2005). People with
              Irlen Syndrome often experience visual distortions when reading text on high-brightness white
              backgrounds: words appear to move, letters blur, or the page seems to &quot;shimmer.&quot;
              For these students, reducing background brightness — not just increasing contrast — can
              significantly reduce reading fatigue.
            </p>
            <p>
              SolPrep's high contrast mode switches to true black-on-white rendering across all question content,
              removing the muted gray tones used in the default theme. We intentionally kept the implementation
              simple — one toggle, one state — rather than offering multiple contrast profiles. Adding complexity
              to an accommodation UI defeats the purpose.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Extended time</h2>
            <p>
              Extended time is the most commonly granted testing accommodation in U.S. public schools.
              The VDOE allows 1.5× and 2× time extensions on SOL assessments for qualifying students.
              The research is clear: extended time improves scores for students with learning disabilities
              more than it improves scores for non-disabled students, which demonstrates that it accommodates
              a real barrier rather than providing an unfair advantage.
            </p>
            <p>
              In SolPrep's test mode, extended time means removing the countdown timer entirely. This was
              a deliberate design choice over implementing a multiplied timer. The reason: a visible countdown
              — even a generous one — activates time-monitoring behavior in students with anxiety or ADHD.
              They watch the clock instead of reading the question. Removing the timer eliminates the stressor
              completely, which is closer to what an extended time accommodation actually achieves in a proctored
              exam (the student knows they have more time; they stop checking).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Font size and text spacing</h2>
            <p>
              Font size affects reading speed and comprehension, especially for younger readers and students
              with low vision. Research by Legge and Bigelow (2011) established that for most readers, optimal
              reading speed occurs at character sizes between 0.2° and 2° of visual angle — which for typical
              reading distances translates to roughly 16–24px on screen.
            </p>
            <p>
              SolPrep offers three font size levels: default (18px), medium (24px), and large (30px).
              The default is already above the web average of 16px, reflecting the younger audience.
              The large option is particularly useful for students with low vision or those who read on
              tablets held at arm's length.
            </p>
            <p>
              Line spacing is also relevant. The British Dyslexia Association recommends 1.5× line spacing
              as a general guideline for dyslexic readers, as tighter spacing increases the risk of
              &quot;crowding&quot; — where adjacent letters interfere with each other's visual recognition.
              SolPrep's question cards use 1.6× line height throughout.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Reduced distractions</h2>
            <p>
              A reduced-distraction testing environment is a standard IEP accommodation for students with
              ADHD, anxiety disorders, and sensory processing differences. In a school setting, this usually
              means a separate room or a carrel (a three-sided privacy screen). On a website, it means
              removing visual motion and decorative elements.
            </p>
            <p>
              When this accommodation is enabled in SolPrep, animations are suppressed (using CSS{' '}
              <code>prefers-reduced-motion</code> semantics at the component level), celebration effects
              after correct answers are simplified, and decorative illustrations are hidden.
              The question card becomes visually minimal — text, choices, submit. Nothing competing for attention.
            </p>
            <p>
              This aligns with recommendations from the American Academy of Pediatrics on ADHD and technology:
              interface elements that draw the eye away from the primary task increase error rates and
              time-on-task for children with attention differences.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Step-by-step hints</h2>
            <p>
              Hints aren't typically listed as an IEP accommodation for standardized tests, but they are
              central to the scaffolded instruction model that effective special education teachers use
              every day. The theoretical basis is Vygotsky's Zone of Proximal Development: a student can
              do more with guided support than they can alone, and that supported practice builds toward
              independent performance.
            </p>
            <p>
              SolPrep's three-hint system is deliberately progressive. Hint 1 restates the question in
              simpler terms or points to the relevant concept. Hint 2 narrows the approach — tells the
              student what strategy to use. Hint 3 nearly gives the answer away, leaving only the final
              step to the student. This structure keeps the student doing cognitive work at every step
              rather than just being handed the answer.
            </p>
            <p>
              We track hint usage in session data. Parents can see how many hints their child used per
              session, which is a useful signal: a child using 3 hints on every question needs more
              foundational support; a child using 0 hints may be ready for the next tier.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Adaptive learning tiers</h2>
            <p>
              Beyond the individual accommodations, SolPrep's three-tier content system is itself an
              accommodation strategy — one that mirrors what special education teachers call
              &quot;differentiated instruction.&quot;
            </p>
            <p>
              The Foundational tier is designed for students who are working below grade level on the
              underlying concepts, not just the reading. A grade 5 student who has not yet mastered
              two-digit multiplication shouldn't be presented with a standard-tier question that assumes
              fluency. Foundational questions for grade 5 math might present the concept at a recognition
              level: &quot;Which of these shows 3 groups of 4?&quot; — testing the same multiplication
              standard but at the entry point, not the mastery level.
            </p>
            <p>
              This distinction — concept access vs. concept mastery — is something conventional test prep
              tools rarely make. When a student can't answer a grade-level question, most tools mark it
              wrong and move on. SolPrep's tier system is designed to find <em>where the student actually is</em>{' '}
              and build from there.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">What we didn't build, and why</h2>
            <p>
              There are accommodations we looked at and decided not to implement, at least for now.
            </p>
            <p>
              <strong className="text-foreground">Color overlays.</strong> Some research (particularly from
              Wilkins, 2003) suggests that reading through a colored overlay reduces visual stress for
              students with Irlen Syndrome. We looked at implementing this as a CSS filter, but the
              evidence for specific color preferences is highly individual — what helps one reader makes
              things worse for another. A feature that requires calibration to be useful isn't a good
              fit for a simple toggle UI. We may revisit this with a color picker.
            </p>
            <p>
              <strong className="text-foreground">Word prediction and AAC support.</strong> Students who
              use Augmentative and Alternative Communication devices have very specific software requirements
              that a web app isn't positioned to replicate. We don't try.
            </p>
            <p>
              <strong className="text-foreground">Sign language video.</strong> We don't have the production
              capacity to film signed versions of 3,700 questions. This is a real gap for Deaf students
              — we acknowledge it.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">The bigger picture</h2>
            <p>
              The gap between what schools are required to provide in IEPs and what exists in commercially
              available educational technology is significant. A school psychologist writing an IEP might
              specify &quot;extended time, read-aloud, preferential seating, dyslexia font&quot; — and
              then the family goes home to practice for the SOL on a website that offers none of it.
            </p>
            <p>
              SolPrep exists to close that gap for Virginia families. We aren't a replacement for good
              special education instruction. We're a practice tool that doesn't penalize a child for how
              they learn.
            </p>
            <p>
              If your child has accommodations at school that we haven't addressed, or if something we've
              built isn't working as it should, we want to know. Reach out at{' '}
              <a href="mailto:admin@t20squares.com" className="text-primary underline">admin@t20squares.com</a>.
            </p>
          </section>

        </div>
      </main>

      <LandingFooter isLoggedIn={isLoggedIn} />
    </div>
  )
}
