import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/queries', () => ({
  getQuestionsForSession: vi.fn().mockResolvedValue([]),
  getRecentSessionQuestionIds: vi.fn().mockResolvedValue([]),
  getChildTopicLevels: vi.fn().mockResolvedValue({}),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  }),
}))

import { getChildTopicLevels, getQuestionsForSession } from '@/lib/supabase/queries'

beforeEach(() => vi.clearAllMocks())

describe('GET /api/questions — dominant language level derivation', () => {
  it('derives foundational when majority topics are foundational', async () => {
    vi.mocked(getChildTopicLevels).mockResolvedValue({
      fractions: 'foundational',
      multiplication: 'foundational',
      geometry: 'simplified',
    })
    const req = new NextRequest('http://localhost/api/questions?grade=3&subject=math&childId=child-1')
    await GET(req)
    expect(getQuestionsForSession).toHaveBeenCalledWith(
      expect.anything(), 3, 'math', expect.any(Number), expect.any(Array), 'foundational'
    )
  })

  it('derives standard when majority topics are standard', async () => {
    vi.mocked(getChildTopicLevels).mockResolvedValue({
      fractions: 'standard',
      multiplication: 'standard',
      geometry: 'simplified',
    })
    const req = new NextRequest('http://localhost/api/questions?grade=3&subject=math&childId=child-1')
    await GET(req)
    expect(getQuestionsForSession).toHaveBeenCalledWith(
      expect.anything(), 3, 'math', expect.any(Number), expect.any(Array), 'standard'
    )
  })

  it('defaults to simplified when no topics exist', async () => {
    vi.mocked(getChildTopicLevels).mockResolvedValue({})
    const req = new NextRequest('http://localhost/api/questions?grade=3&subject=math&childId=child-1')
    await GET(req)
    expect(getQuestionsForSession).toHaveBeenCalledWith(
      expect.anything(), 3, 'math', expect.any(Number), expect.any(Array), 'simplified'
    )
  })
})
