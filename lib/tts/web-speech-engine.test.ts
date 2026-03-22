import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WebSpeechEngine } from './web-speech-engine'

const mockSpeak = vi.fn()
const mockCancel = vi.fn()

global.speechSynthesis = {
  speak: mockSpeak,
  cancel: mockCancel,
  getVoices: vi.fn().mockReturnValue([{ lang: 'en-US', name: 'Test Voice' }]),
  speaking: false,
  pending: false,
  paused: false,
} as unknown as SpeechSynthesis

global.SpeechSynthesisUtterance = vi.fn().mockImplementation((text) => ({
  text,
  rate: 1,
  lang: '',
  onend: null,
  onerror: null,
})) as unknown as typeof SpeechSynthesisUtterance

describe('WebSpeechEngine', () => {
  let engine: WebSpeechEngine

  beforeEach(() => {
    engine = new WebSpeechEngine()
    vi.clearAllMocks()
  })

  it('isAvailable returns true when speechSynthesis exists', async () => {
    expect(await engine.isAvailable()).toBe(true)
  })

  it('speak calls speechSynthesis.speak', async () => {
    const speakPromise = engine.speak('Hello world')
    const utterance = (global.SpeechSynthesisUtterance as unknown as ReturnType<typeof vi.fn>).mock.results[0].value
    utterance.onend?.()
    await speakPromise
    expect(mockSpeak).toHaveBeenCalled()
  })

  it('stop calls speechSynthesis.cancel', () => {
    engine.stop()
    expect(mockCancel).toHaveBeenCalled()
  })
})
