import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { LandingNav } from '@/components/marketing/landing-nav'
import { LandingFooter } from '@/components/marketing/landing-footer'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for SolPrep — the rules and conditions for using our free Virginia SOL practice platform.',
  alternates: { canonical: 'https://solprep.app/terms' },
  robots: { index: true, follow: true },
}

const LAST_UPDATED = 'April 5, 2026'

export default async function TermsPage() {
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
          Terms of Service
        </h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: {LAST_UPDATED}</p>

        <div className="space-y-8 text-muted-foreground leading-relaxed text-sm">

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">1. Acceptance of terms</h2>
            <p>
              By creating an account or using SolPrep (&quot;the Service&quot;), you agree to these Terms of Service. If you do not agree, do not use the Service.
            </p>
            <p>
              You must be at least 18 years old to create an account. By registering, you confirm that you are a parent or legal guardian acting on behalf of any child profiles you create.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">2. Description of service</h2>
            <p>
              SolPrep is a free, web-based educational platform that provides Virginia Standards of Learning (SOL) practice questions for students in grades 3–8. The Service includes:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Practice questions drawn from official VDOE released tests and AI-generated content aligned to current VA SOL standards</li>
              <li>Adaptive learning tiers (Foundational, Simplified, Standard)</li>
              <li>Accessibility accommodations including text-to-speech, dyslexia-friendly font, high contrast, and more</li>
              <li>Parent dashboard to track child progress</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">3. Accounts and responsibility</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. Notify us immediately if you suspect unauthorized access.
            </p>
            <p>
              You are responsible for the accuracy of information you provide (such as your child&apos;s grade level) and for using the Service appropriately. You may not share your account with others or create accounts on behalf of people other than your own children.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">4. Acceptable use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Use the Service for any unlawful purpose</li>
              <li>Attempt to access, scrape, or copy questions or content in bulk</li>
              <li>Attempt to reverse engineer, interfere with, or disrupt the Service</li>
              <li>Impersonate another person or entity</li>
              <li>Upload or transmit harmful, offensive, or misleading content</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">5. Intellectual property</h2>
            <p>
              Practice questions sourced from Virginia DOE released tests are public domain materials produced by the Commonwealth of Virginia. AI-generated questions and all original content, design, and code on SolPrep are owned by SolPrep.
            </p>
            <p>
              You may not reproduce, distribute, or create derivative works from SolPrep content without our written permission.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">6. Free service; no warranty</h2>
            <p>
              SolPrep is provided free of charge, &quot;as is&quot; and &quot;as available,&quot; without warranty of any kind. We do not guarantee that the Service will be uninterrupted, error-free, or that the content is always complete or up to date with current SOL standards.
            </p>
            <p>
              SolPrep is a supplemental study tool. It is not affiliated with, endorsed by, or a substitute for official Virginia Department of Education resources or school instruction.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">7. Limitation of liability</h2>
            <p>
              To the fullest extent permitted by law, SolPrep and its creators shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of, or inability to use, the Service — including but not limited to academic outcomes, data loss, or service interruptions.
            </p>
            <p>
              Our total liability to you for any claim arising from these Terms or the Service shall not exceed the amount you paid us in the past 12 months (which, since the Service is free, is $0).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">8. Termination</h2>
            <p>
              You may delete your account at any time. We reserve the right to suspend or terminate access for any user who violates these Terms or whose use damages the Service or other users.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">9. Changes to these terms</h2>
            <p>
              We may update these Terms from time to time. We will post the updated Terms on this page with a new &quot;Last updated&quot; date. Continued use of the Service after changes constitutes your acceptance of the revised Terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">10. Governing law</h2>
            <p>
              These Terms are governed by the laws of the Commonwealth of Virginia, United States, without regard to conflict of law principles.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">11. No affiliation with SOLPrep.com</h2>
            <p>
              SolPrep (solprep.app) is an independent service and is not affiliated with, endorsed by, or connected to SOLPrep.com or any other website, product, or organization using a similar name. Any resemblance in name is coincidental. We make no claim to the SOLPrep.com domain, brand, or any content found there.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">12. Contact</h2>
            <p>
              Questions about these Terms? Email us at{' '}
              <a href="mailto:admin@t20squares.com" className="text-primary underline">admin@t20squares.com</a>.
            </p>
          </section>

        </div>
      </main>

      <LandingFooter isLoggedIn={isLoggedIn} />
    </div>
  )
}
