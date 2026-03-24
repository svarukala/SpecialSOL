import { TTSEngine, TTSOptions } from './types'

export class ElevenLabsEngine implements TTSEngine {
  constructor(
    private voiceId: string = '21m00Tcm4TlvDq8ikWAM' // default: Rachel
  ) {}

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'test', provider: 'elevenlabs', voice: this.voiceId }),
      })
      return res.ok
    } catch {
      return false
    }
  }

  async speak(text: string, options: TTSOptions = {}): Promise<void> {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        provider: 'elevenlabs',
        voice: this.voiceId,
        rate: options.rate ?? 1.0,
      }),
    })
    if (!res.ok) throw new Error(`ElevenLabs TTS proxy error: ${res.status}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    await new Promise<void>((resolve, reject) => {
      const audio = new Audio(url)
      audio.onended = () => { URL.revokeObjectURL(url); resolve() }
      audio.onerror = () => reject(new Error('Audio playback failed'))
      audio.play()
    })
  }

  stop(): void {
    // handled by component unmount / page navigation
  }
}
