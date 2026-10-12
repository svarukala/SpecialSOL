import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LandingNav } from '@/components/marketing/landing-nav'
import { LandingFooter } from '@/components/marketing/landing-footer'

export const metadata: Metadata = {
  title: 'What Is a 504 Plan and How Is It Different From an IEP? — SolPrep',
  description:
    'A plain-language guide for Virginia parents: what a 504 plan covers, how it differs from an IEP, how to request one, and which accommodations apply to SOL tests.',
  keywords: [
    '504 plan Virginia',
    'IEP vs 504 plan',
    '504 plan accommodations SOL test',
    'IEP accommodations Virginia SOL',
    'how to request 504 plan Virginia',
    'VDOE testing accommodations',
    'special education Virginia',
    'disability accommodations SOL test',
  ],
  alternates: { canonical: 'https://solprep.app/blog/what-is-a-504-plan' },
  openGraph: {
    type: 'article',
    publishedTime: '2026-10-12',
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
      { '@type': 'ListItem', position: 3, name: 'What Is a 504 Plan and How Is It Different From an IEP?', item: 'https://solprep.app/blog/what-is-a-504-plan' },
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'What Is a 504 Plan and How Is It Different From an IEP?',
    datePublished: '2026-10-12',
    author: { '@type': 'Organization', name: 'SolPrep' },
    publisher: { '@type': 'Organization', name: 'SolPrep', url: 'https://solprep.app' },
    url: 'https://solprep.app/blog/what-is-a-504-plan',
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
          What Is a 504 Plan and How Is It Different From an IEP?
        </h1>
        <p className="text-sm text-muted-foreground mb-12">October 12, 2026 · 5 min read</p>

        <div className="space-y-8 text-muted-foreground leading-relaxed text-sm">

          <section className="space-y-3">
            <p>
              If your child has been struggling in school and someone has mentioned a &quot;504&quot; or an &quot;IEP,&quot;
              you&apos;ve likely found yourself wading through a lot of education jargon without a clear explanation
              of what either one actually means or why it matters for your family. Both plans exist to support students
              with disabilities. Both can include accommodations that apply to Virginia SOL tests. But they are rooted
              in different laws, cover different situations, and getting one works very differently from getting the other.
            </p>
            <p>
              This guide is a plain-language overview — not a legal document. If you&apos;re navigating a specific
              situation for your child, you&apos;ll want to follow up with your school&apos;s special education coordinator
              or a parent advocate. But if you just need to understand what these terms mean and what questions to ask,
              this is the right place to start.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">The two laws behind these plans</h2>
            <p>
              An IEP — Individualized Education Program — is created under the Individuals with Disabilities Education
              Act (IDEA), a federal law that guarantees students with qualifying disabilities the right to a free,
              appropriate public education, including specialized instruction designed around their individual needs.
            </p>
            <p>
              A 504 plan comes from a different law entirely: Section 504 of the Rehabilitation Act of 1973.
              Section 504 is a civil rights law, not an education law. It prohibits discrimination against people with
              disabilities in any program receiving federal funding — which includes every Virginia public school.
              A 504 plan doesn&apos;t guarantee specialized instruction; it ensures equal access.
            </p>
            <p>
              This distinction — specialized instruction vs. equal access — is the most important difference between
              the two. It determines which students qualify for which plan and what the school is actually required to provide.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">What an IEP covers</h2>
            <p>
              To qualify for an IEP, a student must have a qualifying disability under one of the IDEA categories
              (specific learning disability, autism spectrum disorder, speech or language impairment, emotional
              disability, intellectual disability, other health impairment, and others) <em>and</em> that disability
              must require specialized instruction to be addressed. Both conditions have to be true.
            </p>
            <p>
              An IEP is a comprehensive legal document that specifies the specialized services the school will provide:
              small-group reading instruction, occupational therapy, speech therapy, resource room support, and so on.
              It also documents accommodations — changes to how learning is delivered — and sets measurable annual goals
              for the student. IEPs are reviewed at least once a year, and parents must consent to the plan before
              it takes effect.
            </p>
            <p>
              ADHD, dyslexia, and anxiety can all qualify a student for an IEP — but only if the school&apos;s
              evaluation team determines that specialized instruction is necessary. A student with mild ADHD who can
              access the curriculum with accommodations alone may not qualify for an IEP under this standard,
              even if the diagnosis is real and well-documented.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">What a 504 plan covers</h2>
            <p>
              A 504 plan is for students who have a physical or mental impairment that substantially limits a major
              life activity — including learning, reading, concentrating, or communicating — but who don&apos;t require
              specialized instruction to access their education. The eligibility bar is different from IDEA&apos;s:
              broader in some ways (more diagnoses qualify), narrower in others (no specialized instruction is provided).
            </p>
            <p>
              A 504 plan typically documents accommodations only. Extended time on tests and assignments, preferential
              seating near the front of the room, directions given in written form, reduced homework volume, breaks
              as needed, fidget tools, and text-to-speech are all common 504 accommodations. The school is not required
              to provide additional instruction — just to remove barriers so the student can access the same curriculum
              as everyone else.
            </p>
            <p>
              Unlike an IEP, a 504 plan is not a federal document with a prescribed format. Virginia schools typically
              create a written plan, but the law doesn&apos;t specify what it must look like. This means 504 plans
              can vary quite a bit from school to school — which is one reason it&apos;s important to ask for
              everything in writing and to review the plan carefully.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">How to request one in Virginia</h2>
            <p>
              Either a parent or the school can initiate a request for either type of plan. You do not need a
              private diagnosis to request an evaluation — the school is required to evaluate if there is reason
              to believe a disability may be affecting your child&apos;s education.
            </p>
            <p>
              For an IEP: put your request for a special education evaluation in writing and deliver it to your
              school principal or the school&apos;s special education coordinator. In Virginia, the school has
              65 business days from receiving your written request to complete the evaluation and hold an
              eligibility meeting — unless you agree in writing to an extension.
            </p>
            <p>
              For a 504: contact the school counselor, principal, or 504 coordinator directly. The process is
              less formal and the timeline is shorter, though Virginia schools are still required to evaluate
              in a timely manner. Document your request in writing and follow up if you don&apos;t hear back
              within two weeks.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Which accommodations apply to SOL tests</h2>
            <p>
              Virginia allows both IEP and 504 accommodations on SOL tests — but only accommodations that are
              specifically approved by the Virginia Department of Education (VDOE) and that are documented in
              the student&apos;s current plan.
            </p>
            <p>
              VDOE-approved SOL testing accommodations include: extended time (1.5× or 2×), text-to-speech
              (read aloud), calculator use, breaks as needed, enlarged print, a reduced-distraction testing room,
              and having directions read aloud. These are the accommodations that appear most frequently
              in IEPs and 504 plans for students with learning disabilities, ADHD, and anxiety.
            </p>
            <p>
              There is a critical rule that many parents don&apos;t know: an accommodation must be regularly used
              in classroom assessments to be allowed on the SOL. If text-to-speech is listed in your child&apos;s
              plan but they&apos;ve never actually used it during class tests, VDOE may not allow it on the SOL.
              Make sure any accommodation that will be needed on test day is actually being used — and documented
              as used — in the classroom throughout the year.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">What to ask for at the eligibility or review meeting</h2>
            <p>
              Whether you&apos;re attending your child&apos;s first IEP or 504 meeting or a routine annual review,
              there are a few questions worth asking specifically about SOL test day.
            </p>
            <p>
              Ask whether each accommodation in the plan is VDOE-approved for SOL testing. Ask whether it is
              being used regularly in classroom assessments — and if not, ask the team to start using it now
              so it&apos;s documented before spring testing. Ask whether there are accommodations your child
              uses at home or informally that should be added to the plan.
            </p>
            <p>
              If your child uses text-to-speech at home while doing homework, that&apos;s worth flagging.
              If they regularly take longer than the allotted time on assignments, extended time should be
              documented. The accommodation has to be in the plan and in use before the school can apply it
              on test day — there is no emergency add the week before the SOL.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Practice at home with the same accommodations</h2>
            <p>
              One of the most practical things families can do is make sure test prep at home mirrors what
              a child&apos;s actual SOL experience will look like. A child who uses text-to-speech at school
              but practices at home without it isn&apos;t building familiarity with their real test conditions.
              When the accommodation feels automatic and familiar, it reduces cognitive load on test day instead
              of adding it.
            </p>
            <p>
              SolPrep includes every major VDOE-approved accommodation as a simple toggle: text-to-speech,
              dyslexia-friendly font (OpenDyslexic), bionic reading, high contrast, extended time (no timer),
              step-by-step hints, and reduced distractions. Parents set accommodations once per child profile,
              and they apply automatically to every practice session. The platform uses real VDOE released test
              questions for grades 3–8 and is completely free.
            </p>
            <p>
              If you&apos;re still figuring out which accommodations your child needs, SolPrep is a good place
              to try them out at low stakes — before the school meeting, before the test. Turn on text-to-speech
              for one session and see if it helps. Enable the dyslexia font and watch how your child reacts.
              You&apos;ll come to the IEP or 504 meeting with real information about what your child actually benefits from.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Start practicing with the accommodations your child needs</h2>
            <p>
              Whether your child has an IEP, a 504 plan, or you&apos;re still figuring things out, they deserve
              to practice for the Virginia SOL the way they&apos;ll actually take it — with the same supports
              that help them learn. SolPrep is free, requires no credit card, and is built specifically for
              Virginia students who learn differently.
            </p>
            <p>
              <Link href="https://solprep.app/signup" className="text-primary underline">
                Start practicing free at SolPrep
              </Link>{' '}
              — set up a child profile, enable their accommodations, and let them work through real VDOE
              questions at their own pace.
            </p>
          </section>

        </div>
      </main>

      <LandingFooter isLoggedIn={isLoggedIn} />
    </div>
  )
}
