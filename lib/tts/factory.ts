import { TTSEngine } from './types'
import { WebSpeechEngine } from './web-speech-engine'

type TTSProvider = 'web_speech' | 'openai' | 'elevenlabs'

interface EngineConfig {
  provider: TTSProvider
  voice?: string
}

export async function createTTSEngine(config: EngineConfig): Promise<TTSEngine> {
  const fallback = new WebSpeechEngine()

  if (config.provider === 'web_speech') {
    return fallback
  }

  try {
    let engine: TTSEngine
    if (config.provider === 'openai') {
      const { OpenAIEngine } = await import('./openai-engine')
      engine = new OpenAIEngine(config.voice)
    } else {
      const { ElevenLabsEngine } = await import('./elevenlabs-engine')
      engine = new ElevenLabsEngine(config.voice)
    }
    const available = await engine.isAvailable()
    if (!available) {
      console.warn(`[TTS] ${config.provider} unavailable, falling back to WebSpeech`)
      return fallback
    }
    return engine
  } catch {
    return fallback
  }
}
