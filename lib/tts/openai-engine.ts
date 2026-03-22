import { TTSEngine, TTSOptions } from './types'

export class OpenAIEngine implements TTSEngine {
  constructor(
    private apiKey: string,
    private voice: string = 'nova'
  ) {}

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      })
      return res.ok
    } catch {
      return false
    }
  }

  async speak(text: string, options: TTSOptions = {}): Promise<void> {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: this.voice,
        speed: options.rate ?? 1.0,
      }),
    })
    if (!res.ok) throw new Error(`OpenAI TTS error: ${res.status}`)
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
    // Audio element lifecycle handled by component unmount
  }
}
