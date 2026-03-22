'use client'
import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Provider = 'web_speech' | 'openai' | 'elevenlabs'

interface Props {
  currentProvider: Provider
  hasOpenAIKey: boolean
  hasElevenLabsKey: boolean
  onSave: (data: { provider: Provider; openaiKey?: string; elevenLabsKey?: string }) => Promise<void>
}

export function ApiKeySection({ currentProvider, hasOpenAIKey, hasElevenLabsKey, onSave }: Props) {
  const [provider, setProvider] = useState<Provider>(currentProvider)
  const [openaiKey, setOpenaiKey] = useState('')
  const [elevenLabsKey, setElevenLabsKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave({ provider, openaiKey: openaiKey || undefined, elevenLabsKey: elevenLabsKey || undefined })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label>TTS Provider</Label>
        <Select value={provider} onValueChange={(v) => setProvider(v as Provider)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="web_speech">Web Speech (Free — built-in browser voices)</SelectItem>
            <SelectItem value="openai">OpenAI TTS {!hasOpenAIKey ? '(add key below)' : ''}</SelectItem>
            <SelectItem value="elevenlabs">ElevenLabs {!hasElevenLabsKey ? '(add key below)' : ''}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="openai-key">OpenAI API Key {hasOpenAIKey && '(saved ✓)'}</Label>
        <Input
          id="openai-key"
          type="password"
          placeholder={hasOpenAIKey ? '••••••••' : 'sk-...'}
          value={openaiKey}
          onChange={(e) => setOpenaiKey(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="el-key">ElevenLabs API Key {hasElevenLabsKey && '(saved ✓)'}</Label>
        <Input
          id="el-key"
          type="password"
          placeholder={hasElevenLabsKey ? '••••••••' : 'your key'}
          value={elevenLabsKey}
          onChange={(e) => setElevenLabsKey(e.target.value)}
        />
      </div>
      <Button onClick={handleSave} disabled={saving}>
        {saved ? 'Saved ✓' : saving ? 'Saving...' : 'Save Settings'}
      </Button>
    </div>
  )
}
