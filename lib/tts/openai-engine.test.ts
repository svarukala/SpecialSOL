import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OpenAIEngine } from './openai-engine'

global.fetch = vi.fn()
global.Audio = vi.fn().mockImplementation(() => ({
  src: '',
  play: vi.fn().mockResolvedValue(undefined),
  onended: null,
  onerror: null,
})) as unknown as typeof Audio

describe('OpenAIEngine', () => {
  beforeEach(() => vi.clearAllMocks())

  it('isAvailable returns false on 401', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 401 } as Response)
    const engine = new OpenAIEngine('bad-key')
    expect(await engine.isAvailable()).toBe(false)
  })

  it('isAvailable returns true on successful ping', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true } as Response)
    const engine = new OpenAIEngine('sk-valid')
    expect(await engine.isAvailable()).toBe(true)
  })
})
