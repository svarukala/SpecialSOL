import { TTSEngine, TTSOptions } from './types'

export class OpenAIEngine implements TTSEngine {
  constructor(
    private voice: string = 'nova'
  ) {}

  async isAvailable(): Promise<boolean> {
    // Availability is checked at factory time by calling the proxy
    // with a short test phrase — if the route returns audio, it works.
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'test', provider: 'openai', voice: this.voice }),
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
        provider: 'openai',
        voice: this.voice,
        rate: options.rate ?? 1.0,
      }),
    })
    if (!res.ok) throw new Error(`OpenAI TTS proxy error: ${res.status}`)
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
