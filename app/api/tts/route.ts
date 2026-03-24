import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/encryption'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { text, provider, voice, rate } = await req.json() as {
    text: string
    provider: 'openai' | 'elevenlabs'
    voice?: string
    rate?: number
  }

  if (!text || !provider) {
    return NextResponse.json({ error: 'Missing text or provider' }, { status: 400 })
  }

  const secret = process.env.ENCRYPTION_SECRET!
  const { data: parent } = await supabase
    .from('parents')
    .select('settings')
    .eq('id', user.id)
    .single()

  const settings = parent?.settings ?? {}

  if (provider === 'openai') {
    const encrypted = settings.openai_api_key_encrypted
    if (!encrypted) return NextResponse.json({ error: 'No OpenAI key saved' }, { status: 400 })
    const apiKey = await decrypt(encrypted, secret)

    const upstream = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: voice ?? 'nova',
        speed: rate ?? 1.0,
      }),
    })

    if (!upstream.ok) {
      const err = await upstream.text()
      return NextResponse.json({ error: `OpenAI error: ${upstream.status} ${err}` }, { status: 502 })
    }

    return new NextResponse(upstream.body, {
      headers: { 'Content-Type': 'audio/mpeg' },
    })
  }

  if (provider === 'elevenlabs') {
    const encrypted = settings.elevenlabs_api_key_encrypted
    if (!encrypted) return NextResponse.json({ error: 'No ElevenLabs key saved' }, { status: 400 })
    const apiKey = await decrypt(encrypted, secret)

    const voiceId = voice ?? '21m00Tcm4TlvDq8ikWAM'
    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: { stability: 0.5, similarity_boost: 0.75, speaking_rate: rate ?? 1.0 },
        }),
      }
    )

    if (!upstream.ok) {
      const err = await upstream.text()
      return NextResponse.json({ error: `ElevenLabs error: ${upstream.status} ${err}` }, { status: 502 })
    }

    return new NextResponse(upstream.body, {
      headers: { 'Content-Type': 'audio/mpeg' },
    })
  }

  return NextResponse.json({ error: 'Unknown provider' }, { status: 400 })
}
