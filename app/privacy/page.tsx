import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { LandingNav } from '@/components/marketing/landing-nav'
import { LandingFooter } from '@/components/marketing/landing-footer'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for SolPrep — how we collect, use, and protect your information.',
  alternates: { canonical: 'https://solprep.app/privacy' },
  robots: { index: true, follow: true },
}

const LAST_UPDATED = 'April 5, 2026'

export default async function PrivacyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isLoggedIn = !!user

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav isLoggedIn={isLoggedIn} />

      <main className="max-w-2xl mx-auto px-4 py-16 sm:py-24">
        <div className="text-sm font-semibold text-primary uppercase tracking-wide mb-4">
          Legal
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold leading-tight tracking-tight mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: {LAST_UPDATED}</p>

        <div className="space-y-8 text-muted-foreground leading-relaxed text-sm">

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">1. Overview</h2>
            <p>
              SolPrep (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is a free educational tool built to help Virginia families prepare for Standards of Learning (SOL) assessments. We are committed to protecting your privacy and your child&apos;s privacy.
            </p>
            <p>
              This policy explains what information we collect, how we use it, and what choices you have. We do not sell your data, display advertisements, or share your information with third parties for marketing purposes.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">2. Who creates accounts</h2>
            <p>
              Accounts are created by parents or legal guardians (&quot;parents&quot;). Children do not create accounts directly. Parents add child profiles to their account and control all settings. By creating an account, you represent that you are at least 18 years old.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">3. Information we collect</h2>
            <h3 className="text-sm font-semibold text-foreground/80 mt-4">Account information</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Email address (used to create and identify your account)</li>
              <li>If you sign in with Google: your name and profile picture provided by Google</li>
            </ul>
            <h3 className="text-sm font-semibold text-foreground/80 mt-4">Child profile information</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Child&apos;s first name (or a nickname — you are not required to use a real name)</li>
              <li>Grade level</li>
              <li>Learning tier and accommodation settings you configure</li>
            </ul>
            <h3 className="text-sm font-semibold text-foreground/80 mt-4">Practice session data</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Answers submitted, whether they were correct, and time spent per question</li>
              <li>Hints used and accessibility features active during a session</li>
              <li>Session scores and topic-level progress</li>
            </ul>
            <h3 className="text-sm font-semibold text-foreground/80 mt-4">Usage data</h3>
            <p>
              We use Google Analytics to understand aggregate usage patterns (e.g., which pages are visited, general geographic region). This data is anonymized and not linked to individual accounts. You can opt out via your browser&apos;s privacy controls or a Google Analytics opt-out browser add-on.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">4. How we use your information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To provide and improve the SolPrep service</li>
              <li>To personalize practice sessions based on your child&apos;s grade, level, and progress</li>
              <li>To send account-related emails (e.g., email confirmation, password reset)</li>
              <li>To understand how the service is used so we can make it better</li>
            </ul>
            <p>We do not use your data to serve advertisements. We do not sell or rent your data to anyone.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">5. Data storage and security</h2>
            <p>
              Your data is stored securely using <strong className="text-foreground">Supabase</strong>, a managed database platform. Data is encrypted at rest and in transit. We use industry-standard security practices, but no method of transmission over the internet is 100% secure.
            </p>
            <p>
              We retain your data for as long as your account is active. You may request deletion of your account and all associated data at any time by emailing us (see contact section below).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">6. Children&apos;s privacy (COPPA)</h2>
            <p>
              SolPrep is designed for use by parents on behalf of their children. We do not knowingly collect personal information directly from children under 13. Child profiles contain only a name/nickname and grade — no email address, phone number, or other contact information.
            </p>
            <p>
              If you believe we have inadvertently collected personal information from a child without parental consent, please contact us and we will delete it promptly.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">7. Third-party services</h2>
            <p>We use the following third-party services:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-foreground">Supabase</strong> — database and authentication hosting</li>
              <li><strong className="text-foreground">Vercel</strong> — website hosting and deployment</li>
              <li><strong className="text-foreground">Google Analytics</strong> — aggregate usage analytics</li>
              <li><strong className="text-foreground">Google OAuth</strong> — optional sign-in method (if you choose &quot;Sign in with Google&quot;)</li>
            </ul>
            <p>Each of these services has its own privacy policy governing their use of data.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">8. Your rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Access the personal information we hold about you</li>
              <li>Correct inaccurate information</li>
              <li>Request deletion of your account and all associated data</li>
              <li>Withdraw consent at any time by deleting your account</li>
            </ul>
            <p>To exercise any of these rights, contact us at the email below.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">9. Changes to this policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will post the updated policy on this page with a new &quot;Last updated&quot; date. Continued use of SolPrep after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">10. Contact us</h2>
            <p>
              If you have questions about this Privacy Policy or want to request data deletion, please email us at{' '}
              <a href="mailto:admin@t20squares.com" className="text-primary underline">admin@t20squares.com</a>.
            </p>
          </section>

        </div>
      </main>

      <LandingFooter isLoggedIn={isLoggedIn} />
    </div>
  )
}
