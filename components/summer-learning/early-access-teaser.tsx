'use client'
import Link from 'next/link'
import { useState } from 'react'

const FEATURES = [
  { icon: '🐝', title: 'Spelling Bee', desc: 'Hear a word, spell it correctly.', href: '/spelling-bee' },
  { icon: '✖️', title: 'Times Tables', desc: 'Master multiplication with speed drills.', href: '/times-tables' },
  { icon: '📚', title: 'Summer Reading', desc: 'Explore age-appropriate stories.', href: '/summer-reading' },
  { icon: '🎯', title: 'Question Quest', desc: 'Master What, Where, Who, When, Why, How.', href: '/question-quest' },
]

export function EarlyAccessTeaser({
  hasAccess,
  hasRequested,
}: {
  hasAccess: boolean
  hasRequested: boolean
}) {
  const [requested, setRequested] = useState(hasRequested)
  const [loading, setLoading] = useState(false)

  async function requestAccess() {
    setLoading(true)
    await fetch('/api/early-access/request', { method: 'POST' })
    setRequested(true)
    setLoading(false)
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">☀️</span>
        <h2 className="font-semibold text-primary">Summer Learning</h2>
        {!hasAccess && (
          <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Early Access</span>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        {hasAccess
          ? 'Keep skills sharp with fun activities — no SOL prep required!'
          : 'Fun new features launching after SOL season — spelling, math, and reading.'}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {FEATURES.map(({ icon, title, desc, href }) =>
          hasAccess ? (
            <Link
              key={title}
              href={href}
              className="rounded-lg bg-background border border-border/60 px-4 py-3 space-y-1 hover:border-primary/40 hover:bg-primary/5 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <span>{icon}</span>
                <span className="font-medium text-sm">{title}</span>
              </div>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </Link>
          ) : (
            <div key={title} className="rounded-lg bg-background border border-border/60 px-4 py-3 space-y-1 opacity-70">
              <div className="flex items-center gap-1.5">
                <span>{icon}</span>
                <span className="font-medium text-sm">{title}</span>
              </div>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          )
        )}
      </div>
      {!hasAccess && (
        <div className="pt-1">
          {requested ? (
            <p className="text-sm text-primary font-medium">
              ✓ You&apos;re on the list — we&apos;ll email you when access is ready.
            </p>
          ) : (
            <button
              onClick={requestAccess}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 h-8 text-sm font-medium transition-colors hover:bg-primary/80 disabled:opacity-60"
            >
              {loading ? 'Requesting…' : 'Request Early Access'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
