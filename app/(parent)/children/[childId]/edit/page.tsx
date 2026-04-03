'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

const AVATARS = ['🌟', '🦁', '🐬', '🦋', '🚀', '🌈', '🎨', '⚡', '🦊', '🐸']

export default function EditChildPage() {
  const params = useParams()
  const childId = params.childId as string
  const [name, setName] = useState('')
  const [grade, setGrade] = useState('3')
  const [avatar, setAvatar] = useState(AVATARS[0])
  const [accommodations, setAccommodations] = useState<AccommodationState>(DEFAULT_ACCOMMODATIONS)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [topicLevels, setTopicLevels] = useState<Array<{
    subject: string
    topic: string
    language_level: string
    promotion_ready: boolean
  }>>([])
  const [levelLoading, setLevelLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase.from('children').select('*').eq('id', childId).single()
      if (data) {
        setName(data.name)
        setGrade(String(data.grade))
        setAvatar(data.avatar)
        setAccommodations({ ...DEFAULT_ACCOMMODATIONS, ...data.accommodations })
      }
      const { data: levels } = await supabase
        .from('child_topic_levels')
        .select('subject, topic, language_level, promotion_ready')
        .eq('child_id', childId)
      setTopicLevels(levels ?? [])
      setLoading(false)
    }
    load()
  }, [childId])

  function subjectDominantLevel(subject: string): 'foundational' | 'simplified' | 'standard' {
    const rows = topicLevels.filter((r) => r.subject === subject)
    if (rows.length === 0) return 'standard'
    const counts = { foundational: 0, simplified: 0, standard: 0 }
    for (const r of rows) counts[r.language_level as keyof typeof counts]++
    if (counts.foundational > rows.length / 2) return 'foundational'
    if (counts.simplified > rows.length / 2) return 'simplified'
    return 'standard'
  }

  function subjectHasPromotionReady(subject: string) {
    return topicLevels.some((r) => r.subject === subject && r.promotion_ready)
  }

  async function refreshTopicLevels() {
    const supabase = createClient()
    const { data } = await supabase
      .from('child_topic_levels')
      .select('subject, topic, language_level, promotion_ready')
      .eq('child_id', childId)
    setTopicLevels(data ?? [])
  }

  async function handleSetLearningLevel(subject: string, tier: 'foundational' | 'simplified' | 'standard') {
    setLevelLoading(true)
    await fetch(`/api/children/${childId}/learning-level`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, tier }),
    })
    await refreshTopicLevels()
    setLevelLoading(false)
  }

  async function handlePromote(subject: string, action: 'confirm' | 'dismiss') {
    setLevelLoading(true)
    await fetch(`/api/children/${childId}/promote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, action }),
    })
    await refreshTopicLevels()
    setLevelLoading(false)
  }

  async function handleDelete() {
    setDeleting(true)
    await fetch(`/api/children/${childId}`, { method: 'DELETE' })
    router.push('/dashboard')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    await supabase.from('children').update({
      name,
      grade: parseInt(grade),
      avatar,
      accommodations,
    }).eq('id', childId)
    router.push('/dashboard')
  }

  if (loading) return <div className="p-6">Loading...</div>

  return (
    <main className="max-w-lg mx-auto p-6">
      <Card>
        <CardHeader><CardTitle>Edit Child Profile</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
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
            <div className="space-y-3">
              <div>
                <Label className="text-base font-semibold">Learning Level</Label>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Controls question difficulty per subject. You can set each independently.
                </p>
              </div>
              {(['math', 'reading'] as const).map((subject) => {
                const currentLevel = subjectDominantLevel(subject)
                const hasPromotion = subjectHasPromotionReady(subject)
                const options: { value: 'foundational' | 'simplified' | 'standard'; label: string; note: string }[] = [
                  { value: 'standard',    label: 'Standard',    note: 'Grade-level questions with full academic language.' },
                  { value: 'simplified',  label: 'Simplified',  note: 'Same topics with clearer, simpler language.' },
                  { value: 'foundational', label: 'Foundational', note: 'Special support tier — you approve level changes.' },
                ]
                return (
                  <div key={subject} className="flex flex-col gap-2 p-3 border rounded-lg">
                    <span className="text-sm font-medium capitalize">{subject}</span>
                    <div className="flex gap-2">
                      {options.map((opt) => {
                        const active = currentLevel === opt.value
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            disabled={levelLoading || active}
                            onClick={() => handleSetLearningLevel(subject, opt.value)}
                            title={opt.note}
                            className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                              active
                                ? 'border-primary bg-primary/5 text-primary cursor-default'
                                : 'border-border hover:border-muted-foreground/40 text-muted-foreground'
                            }`}
                          >
                            {opt.label}
                          </button>
                        )
                      })}
                    </div>
                    {hasPromotion && (
                      <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded p-2">
                        <span className="text-xs text-green-700 font-medium">Ready to move up &rarr;</span>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            disabled={levelLoading}
                            onClick={() => handlePromote(subject, 'confirm')}
                          >
                            Promote
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={levelLoading}
                            onClick={() => handlePromote(subject, 'dismiss')}
                          >
                            Not yet
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t">
            <AlertDialog>
              <AlertDialogTrigger
                disabled={deleting}
                className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:pointer-events-none transition-colors"
              >
                {deleting ? 'Deleting...' : 'Delete Child Profile'}
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {name}&apos;s profile?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently deletes {name}&apos;s profile, all practice sessions, answers, and progress. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, delete everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
