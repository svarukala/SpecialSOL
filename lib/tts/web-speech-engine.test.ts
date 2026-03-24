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

const MockUtterance = vi.fn(function (this: Record<string, unknown>, text: string) {
  this.text = text
  this.rate = 1
  this.lang = ''
  this.onend = null
  this.onerror = null
})
global.SpeechSynthesisUtterance = MockUtterance as unknown as typeof SpeechSynthesisUtterance

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
    const utterance = MockUtterance.mock.instances[0] as Record<string, unknown>
    utterance.onend?.()
    await speakPromise
    expect(mockSpeak).toHaveBeenCalled()
  })

  it('stop calls speechSynthesis.cancel', () => {
    engine.stop()
    expect(mockCancel).toHaveBeenCalled()
  })
})
