'use server'
import { createClient } from '@/lib/supabase/server'
import { encrypt } from '@/lib/encryption'
import { revalidatePath } from 'next/cache'

export async function saveParentSettings(formData: {
  provider: 'web_speech' | 'openai' | 'elevenlabs'
  openaiKey?: string
  elevenLabsKey?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const secret = process.env.ENCRYPTION_SECRET!
  const { data: existing } = await supabase
    .from('parents')
    .select('settings')
    .eq('id', user.id)
    .single()
  const current = existing?.settings ?? {}

  const updatedSettings = {
    ...current,
    tts_provider: formData.provider,
    ...(formData.openaiKey
      ? { openai_api_key_encrypted: await encrypt(formData.openaiKey, secret) }
      : {}),
    ...(formData.elevenLabsKey
      ? { elevenlabs_api_key_encrypted: await encrypt(formData.elevenLabsKey, secret) }
      : {}),
  }

  const { error } = await supabase
    .from('parents')
    .update({ settings: updatedSettings })
    .eq('id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/settings')
}
