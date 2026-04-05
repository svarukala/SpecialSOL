import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LandingNav } from '@/components/marketing/landing-nav'
import { LandingFooter } from '@/components/marketing/landing-footer'

export const metadata: Metadata = {
  title: 'How We Used AI to Build SolPrep — From PDF to Practice Questions',
  description:
    'A deep dive into how SolPrep uses Claude AI to extract Virginia SOL questions from VDOE PDFs, generate adaptive practice questions, and use LLM-as-judge to filter quality — including math diagram generation in SVG.',
  alternates: { canonical: 'https://solprep.app/blog/how-we-built-solprep-with-ai' },
  openGraph: {
    type: 'article',
    publishedTime: '2026-04-05',
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

        <div className="mt-6 mb-2 text-sm font-semibold text-primary uppercase tracking-wide">Engineering</div>
        <h1 className="text-3xl sm:text-4xl font-bold leading-tight tracking-tight mb-4">
          How We Used AI to Build SolPrep — From PDF to Practice Questions
        </h1>
        <p className="text-sm text-muted-foreground mb-12">April 5, 2026 · 8 min read</p>

        <div className="space-y-8 text-muted-foreground leading-relaxed text-sm">

          <section className="space-y-3">
            <p>
              SolPrep started as a weekend project to help one kid prepare for Virginia SOL tests. It grew into a
              platform with over 3,300 practice questions, adaptive learning tiers, accessibility accommodations,
              and AI-generated math diagrams. Almost every step of building it involved AI — not just as a feature,
              but as the primary build tool.
            </p>
            <p>
              This post covers the AI pipeline in detail: how we extract real VDOE questions from PDFs,
              generate new ones, use LLMs as judges to filter quality, and generate SVG diagrams for math problems.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">1. Starting with real questions: parsing VDOE released tests</h2>
            <p>
              The Virginia Department of Education publishes released SOL tests as public domain PDFs — one of the
              most underused education resources on the internet. These are real questions from real past tests,
              but they sit in PDFs that are hard to use programmatically.
            </p>
            <p>
              Our first pipeline step extracts raw text from each PDF, then passes it to Claude with a structured
              prompt asking it to parse every question into JSON with fields for grade, subject, SOL standard,
              question text, four answer choices, the correct answer, difficulty estimate, topic, and subtopic.
            </p>
            <p>
              The tricky part: VDOE alternates answer choice labels between question sets. Some questions use
              A/B/C/D, others use F/G/H/J (a pattern they use on the actual test). Our first extraction pass
              missed this, and users were seeing &quot;F&quot;, &quot;G&quot;, &quot;H&quot;, &quot;J&quot; as
              answer labels instead of A/B/C/D. The fix was adding an explicit normalization rule to the extraction
              prompt: <em>&quot;Normalize all choice IDs to A, B, C, D — map F→A, G→B, H→C, J→D.&quot;</em>
            </p>
            <p>
              We ran the extraction across 3,104 released questions and ended up with 2,322 unique
              questions after deduplication (a <code>(sol_standard, question_text)</code> unique constraint
              on the database catches near-duplicates from running the pipeline multiple times).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">2. Generating AI questions to fill curriculum gaps</h2>
            <p>
              Released VDOE tests cover some topics well and others sparsely. To fill gaps, we built a question
              generation pipeline that produces 6 questions per curriculum topic per grade.
            </p>
            <p>
              Each call passes Claude the SOL standard, topic name, grade level, and detailed formatting rules:
              exactly 4 choices with IDs a/b/c/d, exactly one correct answer, three progressive hints
              (the third nearly gives the answer away), difficulty distribution (2–3 easy, 2 medium, 1–2 hard),
              and two text versions of every question — a standard academic phrasing and a simplified version
              using concrete nouns and shorter sentences.
            </p>
            <p>
              The output is validated against a Zod schema before insertion. Any batch that fails schema
              validation is logged but not inserted — rather than silently store malformed questions.
            </p>
            <p>
              Across 90 topics × 6 grades, this produced ~540 questions per generation run. Total AI-generated
              content: 452 standard questions + 576 foundational questions (see section 3).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">3. Adaptive tiers: what &quot;foundational&quot; actually means</h2>
            <p>
              A key insight from talking to parents of kids with IEPs: the problem isn&apos;t just difficulty —
              it&apos;s cognitive load. A grade 5 child with a reading disability might understand the math
              concept but fail the question because the sentence is too long, the vocabulary too abstract,
              or the context too unfamiliar.
            </p>
            <p>
              We built a &quot;foundational&quot; tier with explicit generation rules:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Maximum sentence length: one short sentence</li>
              <li>No words above 3rd-grade reading level</li>
              <li>Concrete nouns only — &quot;apples&quot; not &quot;items&quot;, &quot;boxes&quot; not &quot;containers&quot;</li>
              <li>Questions test the same SOL standard but at the most basic recognition level</li>
              <li>Multi-digit addition becomes single-digit; fractions become &quot;which shape shows one half&quot;</li>
            </ul>
            <p>
              The generation prompt treats foundational as its own mode, not just &quot;easier standard.&quot;
              The resulting questions look and feel completely different — short, visual, concrete — while
              still mapping to the same curriculum standards.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">4. LLM-as-judge: quality filtering before publishing</h2>
            <p>
              Raw generation output isn&apos;t production-ready. Some questions have ambiguous correct answers,
              distractors that are obviously wrong, or hints that give away the answer immediately. We built
              a review pipeline using Claude as a judge before any question reaches users.
            </p>
            <p>
              The judge prompt evaluates each question on:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-foreground">Answer validity</strong> — is exactly one choice unambiguously correct?</li>
              <li><strong className="text-foreground">Distractor quality</strong> — do the wrong answers represent plausible mistakes, or are they obviously wrong?</li>
              <li><strong className="text-foreground">Hint progression</strong> — does hint 3 nearly give it away without stating the answer directly?</li>
              <li><strong className="text-foreground">SOL alignment</strong> — does the question actually test the stated standard?</li>
              <li><strong className="text-foreground">Age appropriateness</strong> — is the context and vocabulary right for the grade?</li>
            </ul>
            <p>
              Questions that fail review go into a <code>questions_pending</code> staging table with
              a <code>rejected</code> status. The admin panel shows rejected questions with the judge&apos;s
              reasoning, and we can either fix and re-approve them or discard them. In practice, about 85%
              of generated questions pass on the first attempt.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">5. Generating math diagrams as SVG</h2>
            <p>
              Many VDOE math questions reference diagrams — number lines, bar models, geometric figures,
              data tables. When we extracted the text from PDFs, the images didn&apos;t come with them.
              Rather than skip these questions, we built an image generation pipeline.
            </p>
            <p>
              We use Gemini&apos;s multimodal output (via the Vercel AI Gateway) to generate SVG code
              directly from the question text. The prompt asks for a clean, minimal SVG that a student
              would see alongside the question — no unnecessary decoration, high contrast, labeled axes
              where relevant.
            </p>
            <p>
              SVG was the right format choice for several reasons: it scales perfectly on any screen size,
              it&apos;s a text format so it stores cheaply in the database alongside the question, and it
              renders crisply on both high-DPI displays and printed pages.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">6. LLM-as-judge for images</h2>
            <p>
              Image generation output is even less consistent than text. A model might respond with
              markdown-wrapped code blocks instead of raw SVG, produce SVG that doesn&apos;t render,
              or generate a diagram that contradicts the question (a number line showing the wrong range,
              a bar chart with incorrect values).
            </p>
            <p>
              We added a judge step after every image generation call. The judge receives the original
              question text and the generated SVG and evaluates:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Does the SVG render (basic structural validity)?</li>
              <li>Does the diagram match the question content — correct values, labels, scale?</li>
              <li>Is it clean enough for a student to read quickly?</li>
              <li>Does it avoid depicting the answer (a critical rule — the diagram must show the setup, not the solution)?</li>
            </ul>
            <p>
              Images that fail the judge are discarded and the question runs without an image rather than
              showing a misleading one. Of 3,104 DOE questions processed, 565 ended up with validated SVG
              diagrams (~18%). The others either didn&apos;t need an image or generated ones the judge rejected.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">7. What we learned</h2>
            <ul className="list-disc pl-5 space-y-3">
              <li>
                <strong className="text-foreground">Structured output + schema validation is non-negotiable.</strong> Without
                a Zod schema enforced at the boundary, you get subtly broken questions in production.
                Schema validation caught ~15% of raw generations before they ever touched the database.
              </li>
              <li>
                <strong className="text-foreground">Prompts are code.</strong> The F/G/H/J normalization bug, the
                simplified_text null constraint, the &quot;don&apos;t depict the answer in the diagram&quot; rule —
                all were prompt changes that fixed real user-facing bugs. Treat prompt iteration like code review.
              </li>
              <li>
                <strong className="text-foreground">The judge pattern scales.</strong> Using the same model to generate
                and evaluate creates a useful feedback loop. The generator doesn&apos;t know it&apos;s being judged;
                the judge doesn&apos;t need to be a different model. For our scale, one judge call per question
                added ~30% cost and cut bad output by ~85%.
              </li>
              <li>
                <strong className="text-foreground">Real content beats synthetic for trust.</strong> &quot;Real VDOE
                released questions&quot; resonates with parents immediately in a way that &quot;AI-generated questions
                aligned to SOL standards&quot; doesn&apos;t. Lead with authenticity; use AI to fill gaps, not replace the real thing.
              </li>
              <li>
                <strong className="text-foreground">Database constraints as a quality layer.</strong> A unique constraint
                on <code>(sol_standard, question_text)</code> silently deduplicated 963 questions when we
                transferred data to production. Constraints aren&apos;t just data integrity — they&apos;re a
                quality filter that works even when pipelines run multiple times.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">What&apos;s next</h2>
            <p>
              We&apos;re working on per-student adaptive question selection — using session history to surface
              questions in weak areas rather than random selection within a topic. We&apos;re also exploring
              reading passage generation for reading comprehension questions, which are significantly harder
              to generate well than math.
            </p>
            <p>
              SolPrep is free at{' '}
              <Link href="/" className="text-primary underline">solprep.app</Link>.
              If you&apos;re a Virginia parent, try it with your kid. If you&apos;re a developer curious
              about any part of this pipeline, feel free to reach out at{' '}
              <a href="mailto:admin@t20squares.com" className="text-primary underline">admin@t20squares.com</a>.
            </p>
          </section>

        </div>
      </main>

      <LandingFooter isLoggedIn={isLoggedIn} />
    </div>
  )
}
