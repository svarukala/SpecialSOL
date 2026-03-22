import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ApiKeySection } from './api-key-section'
import { saveParentSettings } from './actions'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: parent } = await supabase
    .from('parents')
    .select('settings')
    .eq('id', user.id)
    .single()
  const settings = parent?.settings ?? {}

  return (
    <main className="max-w-lg mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>
      <section className="space-y-2">
        <h2 className="font-semibold text-lg">Text-to-Speech</h2>
        <ApiKeySection
          currentProvider={settings.tts_provider ?? 'web_speech'}
          hasOpenAIKey={!!settings.openai_api_key_encrypted}
          hasElevenLabsKey={!!settings.elevenlabs_api_key_encrypted}
          onSave={saveParentSettings}
        />
      </section>
    </main>
  )
}
