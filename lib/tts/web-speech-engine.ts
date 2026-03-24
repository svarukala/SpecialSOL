import { TTSEngine, TTSOptions } from './types'

function createUtterance(text: string): SpeechSynthesisUtterance {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Ctor = (globalThis as any).SpeechSynthesisUtterance as new (t: string) => SpeechSynthesisUtterance
  return new Ctor(text)
}

export class WebSpeechEngine implements TTSEngine {
  async isAvailable(): Promise<boolean> {
    return typeof window !== 'undefined' && 'speechSynthesis' in window
  }

  speak(text: string, options: TTSOptions = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      // Call via factory helper to support test mocks that use arrow functions
      const utterance = createUtterance(text)
      utterance.rate = options.rate ?? 1.0
      utterance.lang = options.lang ?? 'en-US'
      utterance.onboundary = (e) => {
        if (e.name === 'word') options.onBoundary?.(e.charIndex, e.charLength)
      }
      utterance.onend = () => resolve()
      utterance.onerror = (e) => {
        if (e.error === 'interrupted' || e.error === 'canceled') return resolve()
        reject(new Error(e.error))
      }
      window.speechSynthesis.speak(utterance)
    })
  }

  stop(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  }
}
