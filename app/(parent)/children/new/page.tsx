'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AccommodationSettingsForm } from '@/components/accommodations/accommodation-settings-form'
import { DEFAULT_ACCOMMODATIONS } from '@/lib/accommodations/defaults'
import { AccommodationState } from '@/lib/accommodations/types'
import { SUPPORTED_GRADES } from '@/lib/curriculum/sol-curriculum'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const AVATARS = ['🌟', '🦁', '🐬', '🦋', '🚀', '🌈', '🎨', '⚡', '🦊', '🐸']

type LearningLevel = 'foundational' | 'simplified' | 'standard'

const LEVEL_OPTIONS: {
  value: LearningLevel
  label: string
  description: string
  note: string
}[] = [
  {
    value: 'standard',
    label: 'Standard',
    description: 'Grade-level questions with full academic language.',
    note: 'Best for children meeting or exceeding grade expectations. The app will adjust automatically if they struggle.',
  },
  {
    value: 'simplified',
    label: 'Simplified',
    description: 'Same grade-level topics, but questions use clearer, simpler language and vocabulary.',
    note: "Great for children who understand concepts but benefit from plainer wording. The app promotes to Standard automatically once they're ready.",
  },
  {
    value: 'foundational',
    label: 'Foundational',
    description: 'A special support tier with foundational questions and the simplest language.',
    note: "Best for children significantly below grade level or with learning differences. You'll be asked to approve any level changes — the app never auto-promotes from this tier.",
  },
]

export default function NewChildPage() {
  const [name, setName] = useState('')
  const [grade, setGrade] = useState('3')
  const [avatar, setAvatar] = useState(AVATARS[0])
  const [learningLevel, setLearningLevel] = useState<LearningLevel>('standard')
  const [accommodations, setAccommodations] = useState<AccommodationState>(DEFAULT_ACCOMMODATIONS)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Ensure parent row exists — defensive upsert in case the auth trigger didn't fire
    await supabase.from('parents').upsert(
      { id: user.id, email: user.email ?? '' },
      { onConflict: 'id' }
    )

    const { data: newChild, error: insertError } = await supabase
      .from('children')
      .insert({ parent_id: user.id, name, grade: parseInt(grade), avatar, accommodations })
      .select('id')
      .single()

    if (insertError || !newChild) {
      setError(insertError?.message ?? 'Failed to create child profile')
      setSaving(false)
      return
    }

    // Set learning level for both subjects (only needed when not standard — standard is the default)
    if (learningLevel !== 'standard') {
      await Promise.all(['math', 'reading'].map((subject) =>
        fetch(`/api/children/${newChild.id}/learning-level`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subject, tier: learningLevel }),
        })
      ))
    }

    router.push('/dashboard')
  }

  return (
    <main className="max-w-lg mx-auto p-6">
      <Card>
        <CardHeader><CardTitle>Add a Child</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Child's first name" />
            </div>
            <div className="space-y-1">
              <Label>Grade</Label>
              <Select value={grade} onValueChange={(v) => v && setGrade(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SUPPORTED_GRADES.map(g => (
                    <SelectItem key={g} value={String(g)}>Grade {g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-base font-semibold">Starting Level</Label>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Sets the question difficulty for both Math and Reading. You can change this per subject anytime.
                </p>
              </div>
              <div className="space-y-2">
                {LEVEL_OPTIONS.map((option) => {
                  const selected = learningLevel === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setLearningLevel(option.value)}
                      className={`w-full text-left rounded-lg border-2 p-3 transition-colors ${
                        selected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-medium text-sm">{option.label}</span>
                        {selected && (
                          <span className="text-xs font-semibold text-primary">Selected</span>
                        )}
                      </div>
                      <p className="text-sm text-foreground/80">{option.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">{option.note}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Avatar</Label>
              <div className="flex flex-wrap gap-2">
                {AVATARS.map((emoji) => (
                  <button key={emoji} type="button" onClick={() => setAvatar(emoji)}
                    className={`text-2xl p-2 rounded-lg border-2 ${avatar === emoji ? 'border-primary' : 'border-transparent'}`}>
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-semibold">Accommodations</Label>
              <AccommodationSettingsForm value={accommodations} onChange={setAccommodations} />
            </div>

            {error && (
              <p className="text-sm text-destructive border border-destructive/30 rounded-md px-3 py-2">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? 'Saving...' : 'Save Child Profile'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
