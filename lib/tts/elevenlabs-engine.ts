import { TTSEngine, TTSOptions } from './types'

export class ElevenLabsEngine implements TTSEngine {
  constructor(
    private apiKey: string,
    private voiceId: string = '21m00Tcm4TlvDq8ikWAM' // default: Rachel
  ) {}

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch('https://api.elevenlabs.io/v1/user', {
        headers: { 'xi-api-key': this.apiKey },
      })
      return res.ok
    } catch {
      return false
    }
  }

  async speak(text: string, options: TTSOptions = {}): Promise<void> {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: { stability: 0.5, similarity_boost: 0.75, speaking_rate: options.rate ?? 1.0 },
        }),
      }
    )
    if (!res.ok) throw new Error(`ElevenLabs TTS error: ${res.status}`)
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
