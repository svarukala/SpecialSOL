'use client'

import { useState, useTransition } from 'react'
import type { TemplateType } from '@/lib/email/templates'

const TEMPLATES: TemplateType[] = [
  'no_children',
  'no_sessions',
  'never_completed',
  'single_session',
  'inactive_14d',
  'inactive_30d',
  'paused_session',
]

export function TestEmailButton() {
  const [template, setTemplate] = useState<TemplateType>('no_children')
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<string | null>(null)

  function handleTest() {
    startTransition(async () => {
      setResult(null)
      const res = await fetch('/api/admin/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template }),
      })
      const data = await res.json()
      setResult(data.ok ? `Sent to ${data.sentTo}` : `Error: ${data.error}`)
    })
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={template}
        onChange={e => setTemplate(e.target.value as TemplateType)}
        className="text-xs border rounded px-2 py-1.5 bg-background text-foreground"
      >
        {TEMPLATES.map(t => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      <button
        onClick={handleTest}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 border border-border text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-muted disabled:opacity-50 transition-colors"
      >
        {isPending ? 'Sending…' : '📧 Send test to me'}
      </button>
      {result && (
        <span className={`text-xs ${result.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
          {result}
        </span>
      )}
    </div>
  )
}
