// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSingle = vi.fn().mockResolvedValue({ data: { settings: {} }, error: null })
const mockUpdateEq = vi.fn().mockResolvedValue({ error: null })
const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq })
const mockSelectEq = vi.fn().mockReturnValue({ single: mockSingle })
const mockSelect = vi.fn().mockReturnValue({ eq: mockSelectEq })

const mockFrom = vi.fn().mockReturnValue({
  select: mockSelect,
  update: mockUpdate,
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'p1' } } }) },
    from: mockFrom,
  }),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

process.env.ENCRYPTION_SECRET = 'a'.repeat(64)

describe('saveParentSettings', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('saves provider without crashing when no API key provided', async () => {
    const { saveParentSettings } = await import('./actions')
    await expect(saveParentSettings({ provider: 'web_speech' })).resolves.not.toThrow()
  })

  it('encrypts API key before saving', async () => {
    const { saveParentSettings } = await import('./actions')
    await expect(saveParentSettings({ provider: 'openai', openaiKey: 'sk-test' })).resolves.not.toThrow()
  })
})
