'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function DeleteAccountForm() {
  const router = useRouter()
  const [confirmation, setConfirmation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setLoading(true)
    setError(null)

    const res = await fetch('/api/account/delete', { method: 'DELETE' })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Something went wrong. Please try again or email admin@t20squares.com.')
      setLoading(false)
      return
    }

    // Auth session is gone — redirect to home
    router.push('/?deleted=1')
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 space-y-3 text-sm">
        <p className="font-medium text-destructive">This will permanently delete:</p>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>Your account and login credentials</li>
          <li>All child profiles and their settings</li>
          <li>All practice session history and progress data</li>
        </ul>
        <p className="text-muted-foreground">This action cannot be undone.</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">
          Type <span className="font-mono font-bold">DELETE</span> to confirm
        </label>
        <Input
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          placeholder="DELETE"
          className="max-w-xs font-mono"
          disabled={loading}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <Button
        variant="destructive"
        disabled={confirmation !== 'DELETE' || loading}
        onClick={handleDelete}
      >
        {loading ? 'Deleting account…' : 'Permanently delete my account'}
      </Button>
    </div>
  )
}
