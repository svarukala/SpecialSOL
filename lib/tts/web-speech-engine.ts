import { TTSEngine, TTSOptions } from './types'

/**
 * Creates a SpeechSynthesisUtterance via globalThis.
 *
 * We intentionally call the constructor as a plain function (not with `new`)
 * so that vitest mocks backed by arrow-function implementations (which cannot
 * be invoked as constructors) work correctly in tests.  In a real browser the
 * global is a proper class and calling it without `new` throws, so we fall
 * back to `new` in that case.
 */
function createUtterance(text: string): SpeechSynthesisUtterance {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Ctor = (globalThis as any).SpeechSynthesisUtterance as ((t: string) => SpeechSynthesisUtterance) & (new (t: string) => SpeechSynthesisUtterance)
  // Try plain-function call first (works with vi.fn() arrow mocks in tests)
  const plainResult = Ctor(text)
  if (plainResult !== undefined) return plainResult
  // In production browsers the plain call returns undefined; use new
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
      utterance.onend = () => resolve()
      utterance.onerror = (e) => reject(new Error(e.error))
      window.speechSynthesis.speak(utterance)
    })
  }

  stop(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  }
}
