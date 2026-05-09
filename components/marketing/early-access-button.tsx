'use client'
import Link from 'next/link'
import { useState } from 'react'

type AccessState = 'anonymous' | 'none' | 'requested' | 'approved'

export function EarlyAccessButton({ state }: { state: AccessState }) {
  const [status, setStatus] = useState(state)
  const [loading, setLoading] = useState(false)

  async function requestAccess() {
    setLoading(true)
    await fetch('/api/early-access/request', { method: 'POST' })
    setStatus('requested')
    setLoading(false)
  }

  if (status === 'approved') {
    return (
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 h-10 text-sm font-semibold hover:bg-primary/80 transition-colors"
      >
        Go to Summer Learning →
      </Link>
    )
  }

  if (status === 'requested') {
    return (
      <p className="text-sm text-primary font-medium">
        ✓ You&apos;re on the list — we&apos;ll email you when access is ready.
      </p>
    )
  }

  if (status === 'none') {
    return (
      <button
        onClick={requestAccess}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 h-10 text-sm font-semibold hover:bg-primary/80 transition-colors disabled:opacity-60"
      >
        {loading ? 'Requesting…' : 'Request Early Access'}
      </button>
    )
  }

  // anonymous
  return (
    <Link
      href="/signup"
      className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 h-10 text-sm font-semibold hover:bg-primary/80 transition-colors"
    >
      Sign up for early access
    </Link>
  )
}
