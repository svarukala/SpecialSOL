import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ElevenLabsEngine } from './elevenlabs-engine'

global.fetch = vi.fn()
global.Audio = vi.fn().mockImplementation(() => ({
  src: '', play: vi.fn().mockResolvedValue(undefined), onended: null, onerror: null,
})) as unknown as typeof Audio

describe('ElevenLabsEngine', () => {
  beforeEach(() => vi.clearAllMocks())

  it('isAvailable returns false on 401', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 401 } as Response)
    const engine = new ElevenLabsEngine('bad-key')
    expect(await engine.isAvailable()).toBe(false)
  })

  it('isAvailable returns true on 200', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true } as Response)
    const engine = new ElevenLabsEngine('xi-valid')
    expect(await engine.isAvailable()).toBe(true)
  })
})
