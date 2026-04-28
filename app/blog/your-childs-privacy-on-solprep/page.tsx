import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LandingNav } from '@/components/marketing/landing-nav'
import { LandingFooter } from '@/components/marketing/landing-footer'

export const metadata: Metadata = {
  title: 'Your Child\'s Privacy on SolPrep — What We Collect, What We Don\'t, and Why',
  description:
    'A plain-language explanation of how SolPrep handles your family\'s data — no ads, no data selling, COPPA-compliant child profiles, bcrypt-hashed passwords, and self-service account deletion.',
  keywords: [
    'SolPrep privacy',
    'child privacy education app',
    'COPPA compliant education',
    'safe learning app for kids',
    'no ads education app',
    'Virginia SOL app privacy',
    'parent data privacy',
    'kids app no data mining',
  ],
  alternates: { canonical: 'https://solprep.app/blog/your-childs-privacy-on-solprep' },
  openGraph: {
    type: 'article',
    publishedTime: '2026-04-27',
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

        <div className="mt-6 mb-2 text-sm font-semibold text-primary uppercase tracking-wide">Privacy &amp; Trust</div>
        <h1 className="text-3xl sm:text-4xl font-bold leading-tight tracking-tight mb-4">
          Your Child&apos;s Privacy on SolPrep — What We Collect, What We Don&apos;t, and Why
        </h1>
        <p className="text-sm text-muted-foreground mb-12">April 27, 2026 · 6 min read</p>

        <div className="space-y-8 text-muted-foreground leading-relaxed text-sm">

          <section className="space-y-3">
            <p>
              When a parent in a community group asked about privacy before sharing SolPrep, we thought: that&apos;s
              exactly the right question to ask. You should scrutinize every app your child uses. This post is our
              answer — specific, plain-language, no marketing spin.
            </p>
            <p>
              The short version: SolPrep collects the minimum information needed to work, never sells or mines it,
              and you can delete everything yourself at any time with one click.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Your child never creates an account</h2>
            <p>
              This is the most important design decision we made. <strong className="text-foreground">Children do not
              sign up, log in, or enter any personal information on SolPrep.</strong> Only parents create accounts.
              Parents then add child profiles, which contain exactly two things: a first name (or a nickname — we
              strongly suggest using one) and a grade level.
            </p>
            <p>
              No email address. No phone number. No date of birth. No school name. No photo. A child profile on
              SolPrep is as anonymous as you choose to make it — you can call your child &quot;Star&quot; and grade 4
              and we&apos;ll never know the difference.
            </p>
            <p>
              This design follows <strong className="text-foreground">COPPA</strong> (the Children&apos;s Online Privacy
              Protection Act), the U.S. federal law that governs how apps may collect data from children under 13.
              We follow its principles for all children on the platform, not just those under 13.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">What the parent account stores</h2>
            <p>
              When you sign up, we store your email address. That&apos;s it. We don&apos;t ask for your name, address, phone
              number, or any payment information (SolPrep is free, forever).
            </p>
            <p>
              During practice sessions we record which questions your child answered, whether each answer was
              correct, and how long it took. This is the data that drives the progress charts on your dashboard —
              it exists only to help you see how your child is doing.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">We do not sell, share, or mine your data</h2>
            <p>
              SolPrep has no advertisers and no business model that involves your data. We are not a venture-backed
              company optimizing for engagement metrics. SolPrep was built by a Virginia parent, for Virginia
              parents. The only revenue model that may ever exist here is an optional donation (the &quot;Buy me a
              coffee&quot; button in the footer).
            </p>
            <p>
              Your child&apos;s practice history is never aggregated into any profile sold to third parties.
              It is never used to serve ads anywhere on the internet. It never leaves our database
              except when your dashboard fetches it to display to you.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">How passwords are protected</h2>
            <p>
              SolPrep never stores passwords. Authentication is handled entirely by{' '}
              <strong className="text-foreground">Supabase</strong>, a SOC 2 Type II certified platform, using{' '}
              <strong className="text-foreground">bcrypt</strong> — the industry-standard algorithm for password
              hashing. Bcrypt is deliberately slow to compute, making brute-force attacks impractical, and it
              stores a salted hash — not the password itself.
            </p>
            <p>
              In practical terms: even we cannot see your password. If you forget it, the only option is a reset
              email — because there is nothing to look up. If our database were ever compromised (it hasn&apos;t been),
              an attacker would get bcrypt hashes that are computationally infeasible to reverse.
            </p>
            <p>
              If you sign in with Google, no password is stored at all — authentication happens entirely on
              Google&apos;s servers via OAuth 2.0.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Where your data lives</h2>
            <p>
              All data is stored in Supabase, hosted on AWS infrastructure in the United States. Data is encrypted
              at rest (AES-256) and in transit (TLS 1.2+). Supabase is SOC 2 Type II certified, meaning an
              independent auditor has verified their security controls. The SolPrep website itself is hosted on
              Vercel, which also holds SOC 2 Type II certification.
            </p>
            <p>
              We use <strong className="text-foreground">Google Analytics</strong> to understand aggregate
              usage — things like &quot;how many people visit the homepage&quot; or &quot;which grade is most popular.&quot;
              This data is anonymized and never linked to individual accounts. You can opt out via Google&apos;s
              Analytics opt-out browser extension.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">You can delete everything, yourself, right now</h2>
            <p>
              We recently added self-service account deletion. Go to{' '}
              <Link href="/settings/delete-account" className="text-primary underline">
                Settings → Delete Account
              </Link>
              , type DELETE to confirm, and every record associated with your account — parent profile, all child
              profiles, all session history, all progress data — is permanently removed from our database within
              seconds. No email required, no waiting period, no dark patterns.
            </p>
            <p>
              Prefer to request deletion by email? See our{' '}
              <Link href="/privacy" className="text-primary underline">Privacy Policy</Link> for contact details.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Independent verification: A+ security rating</h2>
            <p>
              We ran SolPrep through{' '}
              <strong className="text-foreground">Mozilla Observatory</strong>, an independent security scanner
              used by security professionals to audit website HTTP headers, content policies, and transport
              security. SolPrep scored <strong className="text-foreground">A+</strong> — the highest possible
              grade. The scan checks for things like whether the site can be embedded in a phishing frame
              (it can&apos;t), whether scripts can be injected by attackers (blocked by a strict Content Security
              Policy), and whether the connection is always encrypted (yes, enforced with a 2-year HSTS header).
            </p>
            <p>
              You can run the scan yourself at{' '}
              <a
                href="https://observatory.mozilla.org/analyze/solprep.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                observatory.mozilla.org/analyze/solprep.app
              </a>
              .
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">The honest summary</h2>
            <div className="border rounded-lg p-4 space-y-2 text-foreground bg-muted/30 text-sm">
              <p>✅ Children never create accounts — only parents do</p>
              <p>✅ Child profiles contain only a nickname and grade — no contact info</p>
              <p>✅ Passwords are bcrypt-hashed and never stored in readable form</p>
              <p>✅ No ads, no data selling, no third-party profiling</p>
              <p>✅ Data hosted on SOC 2 Type II certified infrastructure</p>
              <p>✅ Full self-service deletion, no hoops to jump through</p>
              <p>✅ COPPA principles followed for all children on the platform</p>
              <p>✅ A+ rating on Mozilla Observatory independent security scan</p>
            </div>
          </section>

          <section className="space-y-3">
            <p>
              If you have a question this post doesn&apos;t answer, visit our{' '}
              <Link href="/privacy" className="text-primary underline">Privacy Policy</Link> for the full details
              and contact information. We&apos;re a small team and we respond personally.
            </p>
          </section>

        </div>
      </main>

      <LandingFooter isLoggedIn={isLoggedIn} />
    </div>
  )
}
