import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LandingNav } from '@/components/marketing/landing-nav'
import { LandingFooter } from '@/components/marketing/landing-footer'

export const metadata: Metadata = {
  title: 'Blog — SolPrep',
  description: 'Engineering write-ups, product updates, and lessons learned building SolPrep — free Virginia SOL practice for every learner.',
  alternates: { canonical: 'https://solprep.app/blog' },
}

const POSTS = [
  {
    slug: 'your-childs-privacy-on-solprep',
    category: 'Privacy & Trust',
    title: "Your Child's Privacy on SolPrep — What We Collect, What We Don't, and Why",
    excerpt: "A plain-language explanation of how SolPrep handles your family's data — no ads, no data selling, COPPA-compliant child profiles, bcrypt-hashed passwords, and self-service account deletion.",
    date: 'April 27, 2026',
    readTime: '6 min read',
  },
  {
    slug: 'virginia-sol-test-parent-guide',
    category: 'Education',
    title: 'What Is the Virginia SOL Test? A Parent\'s Complete Guide (Grades 3–8)',
    excerpt: 'Everything Virginia parents need to know about SOL tests — which grades take them, what subjects are covered, how scoring works, what a passing score means, and what happens if your child doesn\'t pass.',
    date: 'April 11, 2026',
    readTime: '9 min read',
  },
  {
    slug: 'accommodations-for-special-needs-students',
    category: 'Education',
    title: 'Accommodations for Special Needs Students — What the Research Says, and What We Built',
    excerpt: 'What IEP and 504 accommodations look like in practice, the science behind dyslexia fonts, bionic reading, high contrast, and text-to-speech — and how SolPrep implements each one for Virginia SOL prep.',
    date: 'April 10, 2026',
    readTime: '10 min read',
  },
  {
    slug: 'how-we-built-solprep-with-ai',
    category: 'Engineering',
    title: 'How We Used AI to Build SolPrep — From PDF to Practice Questions',
    excerpt: 'A deep dive into extracting VDOE test questions from PDFs, generating adaptive content with Claude, using LLM-as-judge for quality filtering, and generating SVG math diagrams.',
    date: 'April 5, 2026',
    readTime: '8 min read',
  },
]

export default async function BlogPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isLoggedIn = !!user

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav isLoggedIn={isLoggedIn} />

      <main className="max-w-2xl mx-auto px-4 py-16 sm:py-24">
        <div className="text-sm font-semibold text-primary uppercase tracking-wide mb-4">Blog</div>
        <h1 className="text-3xl sm:text-4xl font-bold leading-tight tracking-tight mb-2">
          From the team
        </h1>
        <p className="text-sm text-muted-foreground mb-12">
          Engineering write-ups, product updates, and lessons learned.
        </p>

        <div className="space-y-8">
          {POSTS.map(post => (
            <article key={post.slug} className="group border-b pb-8 last:border-0 last:pb-0">
              <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">
                {post.category}
              </div>
              <h2 className="text-lg font-semibold leading-snug mb-2 group-hover:text-primary transition-colors">
                <Link href={`/blog/${post.slug}`}>{post.title}</Link>
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                {post.excerpt}
              </p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{post.date}</span>
                <span>·</span>
                <span>{post.readTime}</span>
              </div>
            </article>
          ))}
        </div>
      </main>

      <LandingFooter isLoggedIn={isLoggedIn} />
    </div>
  )
}
