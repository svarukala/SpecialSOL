import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LandingNav } from '@/components/marketing/landing-nav'
import { LandingFooter } from '@/components/marketing/landing-footer'

export const metadata: Metadata = {
  title: 'New: Scratchpad, Text Highlighting, and a Croc Hint for SOL Practice — SolPrep',
  description:
    'SolPrep just added a freehand scratchpad, text highlighting, and a "Show me the croc first!" hint button in Crocodile Numbers — tools that help kids work through hard questions the way their brain actually works.',
  keywords: [
    'Virginia SOL practice tools',
    'scratchpad for kids',
    'text highlighting reading',
    'crocodile numbers math',
    'SOL test prep features',
    'learning accommodations',
    'SolPrep update',
  ],
  alternates: { canonical: 'https://solprep.app/blog/new-practice-tools' },
  openGraph: {
    type: 'article',
    publishedTime: '2026-05-19',
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
      { '@type': 'ListItem', position: 3, name: 'New Practice Tools', item: 'https://solprep.app/blog/new-practice-tools' },
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'New: Scratchpad, Text Highlighting, and a Croc Hint for SOL Practice',
    datePublished: '2026-05-19',
    author: { '@type': 'Organization', name: 'SolPrep' },
    publisher: { '@type': 'Organization', name: 'SolPrep', url: 'https://solprep.app' },
    url: 'https://solprep.app/blog/new-practice-tools',
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

        <div className="mt-6 mb-2 text-sm font-semibold text-primary uppercase tracking-wide">Product Update</div>
        <h1 className="text-3xl sm:text-4xl font-bold leading-tight tracking-tight mb-4">
          New: Scratchpad, Text Highlighting, and a Croc Hint
        </h1>
        <p className="text-sm text-muted-foreground mb-12">May 19, 2026 · 3 min read</p>

        <div className="space-y-8 text-muted-foreground leading-relaxed text-sm">

          <section className="space-y-3">
            <p>
              When a child is stuck on a word problem, the first thing they naturally want to do is
              mark up the text — circle the important numbers, cross out the noise, jot something in
              the margin. On paper, that&apos;s easy. On a screen, it usually isn&apos;t.
            </p>
            <p>
              We just shipped three tools that change that. A freehand scratchpad. Text
              highlighting directly on the question. And in Crocodile Numbers, a new hint button
              that shows the animated crocodile <em>before</em> the student has to answer — so they
              can see the visual model first, then decide.
            </p>
            <p>
              These aren&apos;t checkbox features. They&apos;re the kind of small things that make
              a practice session feel like a real workspace instead of a quiz form. Here&apos;s what
              each one does and why we built it.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-base font-semibold text-foreground">✏️ The Scratchpad</h2>
            <p>
              The scratchpad is a floating freehand drawing panel that opens over the practice
              session. The child can write, draw diagrams, circle things, and cross things out —
              anything they&apos;d do in a test booklet margin.
            </p>
            <p>
              It has a pen tool and an eraser, undo, and a clear button. It&apos;s draggable and
              resizable so it can sit wherever it&apos;s not in the way. Strokes reset when the
              student moves to the next question, so the slate is always clean.
            </p>
            <p>
              This is particularly useful for multi-step math problems, where kids need somewhere
              to work through the arithmetic before selecting an answer, and for reading
              comprehension questions, where writing down a key detail helps hold it in mind.
            </p>

            <div className="rounded-xl overflow-hidden border my-4">
              <Image
                src="/blog/practice-tools-demo.png"
                alt="A practice question with text highlighted in yellow and a scratchpad open showing handwritten notes"
                width={1200}
                height={800}
                className="w-full"
              />
            </div>
            <p className="text-xs text-muted-foreground text-center -mt-2">
              Scratchpad and text highlighting working together on a graph reading question.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-base font-semibold text-foreground">🖊️ Text Highlighting</h2>
            <p>
              The highlighter button (the marker icon in the toolbar) lets a student click and
              drag over any part of the question to highlight it in yellow. Multiple highlights
              can be added and they persist through the session — they don&apos;t disappear when
              the student scrolls or clicks an answer.
            </p>
            <p>
              This is most useful in reading comprehension. Highlighting the sentence that answers
              the question, or the specific numbers a word problem is asking about, is a genuine
              test strategy — and now kids can practice it digitally the same way they would on a
              paper SOL test.
            </p>
            <p>
              Turning on highlight mode automatically turns off Bionic Reading (both affect text
              rendering and they don&apos;t mix), so the student always sees a clean, consistent
              view of the question.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-base font-semibold text-foreground">🐊 &ldquo;Show me the croc first!&rdquo;</h2>
            <p>
              Crocodile Numbers teaches comparison symbols (&lt; = &gt;) using the classic visual
              of a hungry crocodile that always turns toward the bigger number. In Learn mode —
              where the goal is to build understanding, not just score points — we added a hint
              button that lets a student see the crocodile animation before they answer.
            </p>
            <p>
              The crocodile shows both numbers with a visual count, animates to face the larger
              one, and plays the comparison sound. The student can watch it as many times as they
              need, then try to answer on their own.
            </p>

            <div className="rounded-xl overflow-hidden border my-4">
              <Image
                src="/blog/croc-numbers-demo.gif"
                alt="Animated demo of Crocodile Numbers: the croc hint button appears, the student taps it, the crocodile animation plays showing which number is bigger, then the student answers correctly"
                width={600}
                height={900}
                className="w-full"
                unoptimized
              />
            </div>
            <p className="text-xs text-muted-foreground text-center -mt-2">
              The full Learn mode flow — hint button, croc animation, and answering.
            </p>

            <p>
              This matters for kids who are still internalizing the concept. Seeing the model
              and then answering beats simply being told they were wrong. The crocodile becomes
              a scaffold they can lean on until they no longer need it.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Try them and tell us what you think</h2>
            <p>
              These tools are live now for all SolPrep families. Open a practice session, look
              for the ✏️ (scratchpad) and highlighter buttons in the toolbar, and give them a try.
              For Crocodile Numbers, switch to Learn mode and look for the green hint button below
              the answer choices.
            </p>
            <p>
              We build SolPrep around real feedback from families. If something works great, if
              something is confusing, or if there&apos;s a tool you wish existed — we genuinely
              want to hear it. Hit the feedback button inside the app or email us directly.
            </p>
          </section>

          <div className="rounded-xl border bg-muted/30 px-5 py-5 space-y-3">
            <p className="text-sm font-semibold text-foreground">Try the new tools today</p>
            <p className="text-xs text-muted-foreground">
              Free for all families. Works on phone, tablet, and desktop.
            </p>
            <Link
              href={isLoggedIn ? '/dashboard' : '/signup'}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              {isLoggedIn ? 'Go to your dashboard →' : 'Create free account →'}
            </Link>
          </div>

        </div>
      </main>

      <LandingFooter isLoggedIn={isLoggedIn} />
    </div>
  )
}
