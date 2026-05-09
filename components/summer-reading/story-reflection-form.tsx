'use client'

import { useState } from 'react'

interface StoryReflectionFormProps {
  storyId: string
  childId: string
  initialReflection?: string
}

export function StoryReflectionForm({ storyId, childId, initialReflection }: StoryReflectionFormProps) {
  const [reflection, setReflection] = useState(initialReflection ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const res = await fetch(`/api/stories/${storyId}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId, reflection }),
      })
      if (!res.ok) {
        const body = await res.json() as { error?: string }
        setError(body.error ?? 'Failed to save')
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <textarea
        value={reflection}
        onChange={(e) => setReflection(e.target.value.slice(0, 500))}
        placeholder="What did you think about this story? What did you learn?"
        rows={4}
        className="w-full border rounded-lg px-3 py-2 text-sm bg-background resize-y focus:outline-none focus:ring-2 focus:ring-primary/50"
      />
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs text-muted-foreground">{reflection.length}/500</span>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-xs text-green-600 font-medium">Saved!</span>
          )}
          {error && (
            <span className="text-xs text-destructive">{error}</span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-4 h-8 text-sm font-medium transition-colors hover:bg-primary/80 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Reflection'}
          </button>
        </div>
      </div>
    </div>
  )
}
