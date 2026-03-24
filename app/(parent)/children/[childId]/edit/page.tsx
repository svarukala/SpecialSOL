'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AccommodationSettingsForm } from '@/components/accommodations/accommodation-settings-form'
import { DEFAULT_ACCOMMODATIONS } from '@/lib/accommodations/defaults'
import { AccommodationState } from '@/lib/accommodations/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const AVATARS = ['🌟', '🦁', '🐬', '🦋', '🚀', '🌈', '🎨', '⚡', '🦊', '🐸']

export default function EditChildPage() {
  const params = useParams()
  const childId = params.childId as string
  const [name, setName] = useState('')
  const [grade, setGrade] = useState('3')
  const [avatar, setAvatar] = useState(AVATARS[0])
  const [accommodations, setAccommodations] = useState<AccommodationState>(DEFAULT_ACCOMMODATIONS)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
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
      setLoading(false)
    }
    load()
  }, [childId])

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
                  <SelectItem value="3">Grade 3</SelectItem>
                  <SelectItem value="4">Grade 4</SelectItem>
                  <SelectItem value="5">Grade 5</SelectItem>
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
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
