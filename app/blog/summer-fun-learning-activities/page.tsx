import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LandingNav } from '@/components/marketing/landing-nav'
import { LandingFooter } from '@/components/marketing/landing-footer'

export const metadata: Metadata = {
  title: 'Summer Learning That Actually Feels Like Play — 8 New Activities on SolPrep',
  description:
    'SolPrep is launching 8 summer learning games for kids in grades 3–8 — Spelling Bee, Times Tables, Summer Reading, Fraction Frenzy, Money Match, Learn Clock, Crocodile Numbers, and Question Quest. Sign up for early access.',
  keywords: [
    'summer learning activities for kids',
    'fun educational games grades 3-8',
    'summer math practice',
    'summer reading program',
    'spelling bee practice kids',
    'times tables games',
    'fraction practice games',
    'money math for kids',
    'telling time practice',
    'Virginia SOL summer',
    'stop summer slide',
    'educational summer activities',
  ],
  alternates: { canonical: 'https://solprep.app/blog/summer-fun-learning-activities' },
  openGraph: {
    type: 'article',
    publishedTime: '2026-05-13',
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

        <div className="mt-6 mb-2 text-sm font-semibold text-primary uppercase tracking-wide">Product Update</div>
        <h1 className="text-3xl sm:text-4xl font-bold leading-tight tracking-tight mb-4">
          Summer Learning That Actually Feels Like Play
        </h1>
        <p className="text-sm text-muted-foreground mb-12">May 13, 2026 · 6 min read</p>

        <div className="space-y-8 text-muted-foreground leading-relaxed text-sm">

          <section className="space-y-3">
            <p>
              Summer break is a gift — and also, quietly, a risk. Research consistently shows that
              kids lose ground during the summer months, particularly in math and reading. By the
              time September rolls around, many students spend the first few weeks of school
              re-learning things they already knew in June. It&apos;s called the summer slide, and
              it&apos;s real.
            </p>
            <p>
              But here&apos;s the thing: the solution doesn&apos;t have to feel like homework. The
              research is equally clear that kids who stay engaged with learning over the summer — even
              casually, even playfully — come back sharper. The goal isn&apos;t to replicate school.
              It&apos;s to keep the brain warm.
            </p>
            <p>
              That&apos;s the idea behind what we&apos;re building this summer at SolPrep. We&apos;re
              launching eight new learning activities — games, really — designed for kids in grades
              3–8. Each one practices something that matters for school, but in a form that a kid will
              actually want to open on a Tuesday afternoon.
            </p>
          </section>

          {/* Early access CTA — inline, early in the post */}
          <div className="rounded-xl border bg-muted/30 px-5 py-5 space-y-3">
            <p className="text-sm font-semibold text-foreground">Want early access?</p>
            <p className="text-xs text-muted-foreground">
              Summer activities are available now for families with early access. Sign up for a
              free SolPrep account and request early access — we&apos;re approving families on a
              rolling basis.
            </p>
            <Link
              href={isLoggedIn ? '/dashboard' : '/signup'}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              {isLoggedIn ? 'Go to your dashboard →' : 'Create free account →'}
            </Link>
          </div>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">The eight activities</h2>
            <p>
              Here&apos;s what&apos;s available — and why each one is worth a few minutes of your
              kid&apos;s day.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">🐝 Spelling Bee</h2>
            <p>
              A word is read aloud. The student types the spelling. That&apos;s it — but it&apos;s
              surprisingly engaging. Words are chosen to match grade-level vocabulary from the
              Virginia SOL reading standards, so the practice is directly relevant to school.
            </p>
            <p>
              Each word comes with a definition the student can peek at if they&apos;re stuck, which
              reinforces vocabulary alongside spelling. The session wraps up with a score and a review
              of any words they missed. After a week of daily spelling, most kids genuinely start
              caring whether they beat their previous score.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">✖️ Times Tables</h2>
            <p>
              Multiplication fact fluency is one of the single most high-leverage skills in
              elementary and middle school math. A student who has to stop and calculate 7 × 8 in the
              middle of a multi-step problem loses the thread. One who knows it instantly doesn&apos;t.
            </p>
            <p>
              The Times Tables activity works through multipliers from 2 to 12, tracks which facts a
              student has truly mastered, and keeps bringing back the ones that aren&apos;t sticking.
              It&apos;s timed — not in a stressful way, but enough that students who practice regularly
              can watch their speed improve. Fact fluency built over six summer weeks is hard to lose.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">📚 Summer Reading Library</h2>
            <p>
              Reading comprehension is a skill, and like any skill it weakens without practice. The
              Summer Reading Library offers short stories — fiction and nonfiction — with
              comprehension questions after each one. Stories are matched to grade level and cover a
              range of topics to hold interest across the summer.
            </p>
            <p>
              The questions aren&apos;t just recall. They ask students to infer, identify main ideas,
              understand vocabulary in context, and think about how a story is structured — exactly
              what the Virginia SOL Reading tests assess. A student who reads and answers questions
              on a few stories per week over the summer will notice the difference in September.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">❓ Question Quest</h2>
            <p>
              Who, what, where, when, why, how. These six question words are the skeleton of reading
              comprehension — and many students, especially younger ones, struggle to identify the
              answer type a question is asking for before they even try to answer it.
            </p>
            <p>
              Question Quest presents short scenarios and asks students to answer the right kind of
              question. It&apos;s designed for grades 3–5 and is particularly helpful for students
              working on reading comprehension, inference, and vocabulary. The scenarios are fun —
              mini mystery-style prompts that kids often ask to play again.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">🐊 Crocodile Numbers</h2>
            <p>
              The crocodile always eats the bigger number. That visual — a hungry crocodile choosing
              between two values — is how millions of kids learned &lt; and &gt; in elementary school,
              and it sticks.
            </p>
            <p>
              Crocodile Numbers extends this to comparisons across whole numbers, fractions, decimals,
              and negative numbers depending on grade level. In Practice mode, students work at their
              own pace with feedback. In Test mode, they race against a timer. In Compete mode,
              difficulty ramps up dynamically as they get on a streak. It looks like a game. It is
              practicing one of the foundational concepts in number sense.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">🕐 Learn Clock</h2>
            <p>
              Analog clock reading is one of those skills that schools assume kids have, and many
              don&apos;t — especially since most children grew up looking at digital displays. The
              Virginia SOL standards require students to read and interpret time on analog clocks, and
              it shows up on the math test.
            </p>
            <p>
              Learn Clock shows a hand-drawn analog clock face and asks students to identify the time.
              Three difficulty levels: hour and half-hour only, five-minute increments, and exact
              minute. The clock face is drawn with clear, readable hands. Students get immediate
              visual feedback when they answer. It takes about five minutes a day to build real fluency.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">💰 Money Match</h2>
            <p>
              Money math is concrete, practical, and a genuine part of the Virginia SOL standards
              through grade 5. It also connects to a skill kids actually use in the real world, which
              makes it easier to motivate practice.
            </p>
            <p>
              Money Match has three modes. Identify Coins tests recognition of pennies, nickels,
              dimes, and quarters. Count Money presents a collection of coins and asks for the total.
              Make Change presents a purchase and an amount paid, and asks how much change the student
              should receive. Each mode builds on the previous one. A student who completes all three
              regularly has a solid foundation for any money-related question they&apos;ll encounter
              on a standardized test.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">½ Fraction Frenzy</h2>
            <p>
              Fractions are where a lot of students start to lose confidence in math — usually around
              grades 4 and 5 — and that loss of confidence compounds through middle school into
              decimals, percents, ratios, and algebra. Getting fractions solid early matters more than
              almost anything else in the 3–8 math curriculum.
            </p>
            <p>
              Fraction Frenzy works through three levels. Name It builds identification using visual
              models — pie charts and rectangles — so students connect the symbol to something
              concrete. Compare tests whether students can correctly order fractions. Equivalent asks
              students to recognize and generate equivalent fractions. Visual models stay on screen
              throughout, which is how fractions should be taught: connected to a picture, not just
              manipulated as symbols.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">A few minutes a day adds up</h2>
            <p>
              None of these activities requires a long session. Most are designed around 5–10 minutes
              of focused play. The goal isn&apos;t to simulate school — it&apos;s to keep skills
              active so the fall doesn&apos;t feel like starting over.
            </p>
            <p>
              A child who spends 10 minutes on Times Tables, reads one story in the Summer Reading
              Library, and does a round of Fraction Frenzy has done 25–30 minutes of meaningful
              practice. Do that three or four days a week for ten weeks, and the math is compelling:
              roughly 15 hours of targeted practice over the summer, covering exactly the skills that
              show up on Virginia SOL tests.
            </p>
            <p>
              That&apos;s the summer slide reversed. Not because of pressure or drilling, but because
              the activities are short enough to be fun and varied enough to hold interest across the
              whole break.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">How access works</h2>
            <p>
              Summer activities on SolPrep are free — no subscription, no credit card. They&apos;re
              part of the same platform as the SOL practice, and they live in the same dashboard as
              your child&apos;s regular sessions.
            </p>
            <p>
              We&apos;re currently rolling out access to families on a first-come, first-served basis.
              Creating a SolPrep account takes under two minutes. Once you have an account, you can
              request early access from your dashboard, and we&apos;ll unlock the summer activities as
              quickly as we can.
            </p>
            <p>
              If your child already has a SolPrep account, check your dashboard — you may already have
              access.
            </p>
          </section>

          {/* Bottom CTA */}
          <div className="rounded-xl border bg-muted/30 px-5 py-5 space-y-3 not-prose">
            <p className="text-sm font-semibold text-foreground">Get started this summer</p>
            <p className="text-xs text-muted-foreground">
              Free for all families. No subscription. Works on phone, tablet, and desktop.
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
