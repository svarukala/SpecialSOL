import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/curriculum/sol-curriculum', () => ({
  getTopicsForGradeSubject: vi.fn().mockReturnValue([
    { name: 'fractions', solStandard: '3.2', description: 'desc' },
    { name: 'geometry', solStandard: '3.12', description: 'desc' },
  ]),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { getTopicsForGradeSubject } from '@/lib/curriculum/sol-curriculum'

function makeClient(childData: unknown, upsertError: unknown = null) {
  const upsertMock = vi.fn().mockResolvedValue({ error: upsertError })
  const client = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'parent-1' } } }) },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'children') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: childData, error: null }),
        }
      }
      return { upsert: upsertMock }
    }),
  }
  return { client, upsertMock }
}

beforeEach(() => vi.clearAllMocks())

describe('POST /api/children/[id]/learning-level', () => {
  it('bulk-upserts all topics for the subject to foundational', async () => {
    const { client, upsertMock } = makeClient({ id: 'child-1', grade: 3 })
    vi.mocked(createClient).mockResolvedValue(client as any)

    const req = new NextRequest('http://localhost/api/children/child-1/learning-level', {
      method: 'POST',
      body: JSON.stringify({ subject: 'math', tier: 'foundational' }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'child-1' }) })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.updated).toBe(2) // 2 topics in mock

    expect(upsertMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ topic: 'fractions', language_level: 'foundational', sessions_at_level: 0, promotion_ready: false }),
        expect.objectContaining({ topic: 'geometry', language_level: 'foundational', sessions_at_level: 0, promotion_ready: false }),
      ]),
      expect.any(Object)
    )
  })

  it('returns 404 when child does not belong to parent', async () => {
    const { client } = makeClient(null)
    vi.mocked(createClient).mockResolvedValue(client as any)

    const req = new NextRequest('http://localhost/api/children/other-child/learning-level', {
      method: 'POST',
      body: JSON.stringify({ subject: 'math', tier: 'foundational' }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'other-child' }) })
    expect(res.status).toBe(404)
  })

  it('returns 400 for unknown subject', async () => {
    const { client } = makeClient({ id: 'child-1', grade: 3 })
    vi.mocked(createClient).mockResolvedValue(client as any)
    vi.mocked(getTopicsForGradeSubject).mockReturnValue([])

    const req = new NextRequest('http://localhost/api/children/child-1/learning-level', {
      method: 'POST',
      body: JSON.stringify({ subject: 'science', tier: 'foundational' }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'child-1' }) })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'unknown_subject' })
  })
})
