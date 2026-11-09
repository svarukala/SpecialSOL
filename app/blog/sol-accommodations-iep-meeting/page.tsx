import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LandingNav } from '@/components/marketing/landing-nav'
import { LandingFooter } from '@/components/marketing/landing-footer'

export const metadata: Metadata = {
  title: 'How to Talk to Your Child\'s Teacher About SOL Accommodations',
  description:
    'A practical guide for Virginia parents navigating IEP and 504 meetings — what to request, how test-day accommodations differ from classroom ones, and what Virginia allows on SOL tests.',
  keywords: [
    'SOL test accommodations Virginia',
    'IEP meeting tips for parents',
    '504 plan SOL accommodations',
    'Virginia SOL IEP accommodations',
    'how to request test accommodations',
    'IEP 504 meeting preparation',
    'VDOE testing accommodations',
    'extended time SOL Virginia',
  ],
  alternates: { canonical: 'https://solprep.app/blog/sol-accommodations-iep-meeting' },
  openGraph: {
    type: 'article',
    publishedTime: '2026-11-09',
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
      { '@type': 'ListItem', position: 3, name: 'How to Talk to Your Child\'s Teacher About SOL Accommodations', item: 'https://solprep.app/blog/sol-accommodations-iep-meeting' },
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: "How to Talk to Your Child's Teacher About SOL Accommodations",
    datePublished: '2026-11-09',
    author: { '@type': 'Organization', name: 'SolPrep' },
    publisher: { '@type': 'Organization', name: 'SolPrep', url: 'https://solprep.app' },
    url: 'https://solprep.app/blog/sol-accommodations-iep-meeting',
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
          How to Talk to Your Child&apos;s Teacher About SOL Accommodations
        </h1>
        <p className="text-sm text-muted-foreground mb-12">November 9, 2026 · 6 min read</p>

        <div className="space-y-8 text-muted-foreground leading-relaxed text-sm">

          <section className="space-y-3">
            <p>
              If your child has an IEP or 504 plan, you already know how much work goes into getting the right
              support in place. But there&apos;s a gap that catches a lot of families off guard: not every
              accommodation your child uses in the classroom automatically applies on SOL test day. The rules
              are different, the approval process is different, and if you don&apos;t ask the right questions
              before the testing window opens, your child may sit for one of the most important assessments of
              their school year without the support they&apos;re legally entitled to.
            </p>
            <p>
              This guide is for Virginia parents who want to walk into their next IEP or 504 meeting prepared —
              knowing what to ask, what Virginia allows, and what to do if something falls through the cracks.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Classroom accommodations vs. test-day accommodations</h2>
            <p>
              This distinction trips up a lot of parents. Your child&apos;s IEP might specify extended time on
              classroom tests, text-to-speech for reading assignments, and a reduced-distraction environment.
              All of that is documented and in place. But Virginia SOL tests are administered under separate
              guidelines published by the Virginia Department of Education (VDOE), and not every classroom
              accommodation is automatically permitted on a standardized assessment.
            </p>
            <p>
              The VDOE maintains a list of approved testing accommodations in its Testing Accommodations for
              Students with Disabilities manual. An accommodation must appear on this list to be used on the SOL.
              Your child&apos;s IEP team must also document the accommodation specifically for state testing —
              it doesn&apos;t carry over from general classroom notes automatically.
            </p>
            <p>
              The practical implication: when you sit down for an IEP or 504 meeting, ask explicitly, &quot;Which
              of these accommodations are documented for state testing?&quot; If the answer is unclear, ask the
              team to point you to the section of the IEP that covers SOL and standardized assessments.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">What Virginia allows on SOL tests</h2>
            <p>
              The VDOE&apos;s approved testing accommodations fall into several categories. Here are the most
              commonly requested ones for students with IEPs and 504 plans:
            </p>
            <p>
              <strong className="text-foreground">Extended time:</strong> Virginia allows 1.5× and 2× time
              extensions for qualifying students. This is the most frequently granted accommodation and one
              of the most impactful — research consistently shows it benefits students with learning disabilities
              more than it benefits non-disabled students, which is exactly what a valid accommodation should do.
            </p>
            <p>
              <strong className="text-foreground">Read-aloud (text-to-speech):</strong> Available for students
              with documented reading disabilities, visual impairments, or language processing disorders.
              On Virginia SOL tests, read-aloud is typically delivered through the testing platform&apos;s
              built-in TTS feature or by a human reader. Note that reading passages on the Reading SOL may
              have restrictions — confirm with your child&apos;s testing coordinator.
            </p>
            <p>
              <strong className="text-foreground">Breaks as needed:</strong> Students who need scheduled breaks
              to manage anxiety, attention, or physical needs can receive them. The break does not stop the
              testing clock in all configurations, so clarify this detail with the school.
            </p>
            <p>
              <strong className="text-foreground">Separate testing location:</strong> A reduced-distraction
              environment (small group or individual room) is available and commonly granted for students with
              ADHD, anxiety disorders, or sensory sensitivities.
            </p>
            <p>
              <strong className="text-foreground">Enlarged print / magnification:</strong> Available for
              students with low vision. The online testing platform also supports system-level zoom.
            </p>
            <p>
              <strong className="text-foreground">Calculator:</strong> Permitted on certain math SOL tests
              for qualifying students, even on portions where calculators are not available to general
              test-takers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">What to request at an IEP meeting</h2>
            <p>
              IEP meetings can feel like a lot — a room full of educators, a stack of paperwork, and a
              time limit. Coming in with a short, specific list of what you want to discuss helps.
            </p>
            <p>
              Before the meeting, review the current IEP and find the section that covers standardized testing.
              If you don&apos;t see one, make a note to add it. During the meeting, ask the team to walk you
              through each accommodation and confirm whether it is listed for state testing specifically.
              If your child has an accommodation at school that isn&apos;t on the VDOE list, ask whether
              there is a comparable approved accommodation you could request instead.
            </p>
            <p>
              Ask for the specific wording that will appear on the IEP. &quot;Extended time&quot; is not
              precise enough — you want to see &quot;1.5× extended time on all state assessments&quot; or
              &quot;2× time — Reading and Math SOL.&quot; Vague language leaves room for inconsistent
              implementation.
            </p>
            <p>
              Before you leave the meeting, confirm: who is responsible for communicating the testing
              accommodations to the testing coordinator? In many schools, this is the special education
              case manager. Get a name and contact information.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">What to request at a 504 meeting</h2>
            <p>
              504 meetings are often shorter and less formal than IEP meetings, but the same principle applies:
              ask specifically about state testing. A 504 plan covers students who don&apos;t qualify for
              special education services but have a physical or mental impairment that substantially limits
              a major life activity. Learning, reading, and concentrating all qualify.
            </p>
            <p>
              The 504 coordinator at your child&apos;s school is the right person to ask about which
              accommodations are VDOE-approved for SOL testing. Not every accommodation listed in a 504 plan
              has a direct equivalent in the VDOE testing manual, and the coordinator can tell you which ones
              translate and which ones don&apos;t.
            </p>
            <p>
              One thing to know: unlike IEP services, which are federally funded and involve a formal team,
              504 plans are school-implemented. The documentation and follow-through can vary more from school
              to school. Keep a copy of the signed 504 plan and check in with the testing coordinator a few
              weeks before the spring testing window (typically late April through June in Virginia) to confirm
              the accommodations are set up in the testing system.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">What to bring to the meeting</h2>
            <p>
              You don&apos;t need to come in with a lawyer. You do need to come in with your notes.
              A one-page summary works well: your child&apos;s current accommodations, any observations
              you&apos;ve made at home about what helps and what doesn&apos;t, and a short list of questions.
              Some parents find it helpful to bring recent work samples or a note from a tutor or therapist
              if there&apos;s relevant outside documentation.
            </p>
            <p>
              Bring last year&apos;s SOL score report if you have it. The reporting category breakdown —
              which shows how your child performed on each sub-skill — can be a useful anchor for the
              conversation. If your child struggled on reading comprehension questions but performed well on
              vocabulary, that&apos;s specific. If your child ran out of time on the math test, that&apos;s
              a data point for extended time. Numbers give the team something concrete to work with.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">If accommodations aren&apos;t being implemented</h2>
            <p>
              It happens. The IEP says extended time, but the teacher didn&apos;t get the message, or the
              testing system wasn&apos;t set up correctly, or your child was pulled from the separate room
              because of a scheduling conflict. If your child sits for an SOL test without their documented
              accommodations, that is a procedural violation — it&apos;s not a minor administrative issue.
            </p>
            <p>
              Start by contacting the special education coordinator or 504 coordinator in writing (email creates
              a record). Describe what happened, cite the accommodation document, and ask what corrective steps
              will be taken. If the issue isn&apos;t resolved at the school level, you can escalate to the
              division&apos;s director of special education. Virginia&apos;s Department of Education also has
              a complaint process for IDEA violations.
            </p>
            <p>
              Most of the time these situations are mistakes, not deliberate. A direct, documented conversation
              resolves the majority of them without escalation.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Practice at home with the same accommodations</h2>
            <p>
              One of the most effective things you can do before the testing window is make sure your child
              is practicing with the same accommodations they&apos;ll use on test day. Familiarity reduces
              anxiety, and it also ensures the accommodation is actually helping — sometimes a child is listed
              for TTS but has never actually used it during practice, so the first time it speaks during a
              real test is the worst possible moment to discover it&apos;s distracting.
            </p>
            <p>
              SolPrep supports the most common SOL accommodations built in: text-to-speech, extended time
              (no timer), dyslexia font, bionic reading, high contrast, and reduced-distraction mode.
              All are free and can be enabled in your child&apos;s profile settings. The questions are real
              VDOE-released items, so practicing with accommodations on SolPrep is the closest thing to
              a dry run your child can get before the real test.
            </p>
            <p>
              <a href="https://solprep.app/signup" className="text-primary underline">Start practicing free at SolPrep</a> —
              set up your child&apos;s profile, enable their accommodations, and let them build the
              familiarity that makes test day feel routine.
            </p>
          </section>

        </div>
      </main>

      <LandingFooter isLoggedIn={isLoggedIn} />
    </div>
  )
}
