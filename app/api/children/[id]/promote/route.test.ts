import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'

function makeClient(childData: unknown, topicLevelRows: unknown[]) {
  const upsertMock = vi.fn().mockResolvedValue({ error: null })
  const topicChain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    upsert: upsertMock,
  }
  topicChain.then = (resolve: (v: unknown) => void) =>
    Promise.resolve({ data: topicLevelRows, error: null }).then(resolve)

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
      return topicChain
    }),
  }
  return { client, upsertMock }
}

beforeEach(() => vi.clearAllMocks())

describe('POST /api/children/[id]/promote', () => {
  it('advances language_level foundational→simplified on confirm', async () => {
    const { client, upsertMock } = makeClient(
      { id: 'child-1' },
      [{ topic: 'fractions', language_level: 'foundational' }, { topic: 'geometry', language_level: 'foundational' }]
    )
    vi.mocked(createClient).mockResolvedValue(client as any)

    const req = new NextRequest('http://localhost/api/children/child-1/promote', {
      method: 'POST',
      body: JSON.stringify({ subject: 'math', action: 'confirm' }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'child-1' }) })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ affected: 2 })
    expect(upsertMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          language_level: 'simplified',
          promotion_ready: false,
          sessions_at_level: 0,
          previous_level: 'foundational',
          changed_at: expect.any(String),
        }),
      ]),
      expect.objectContaining({ onConflict: 'child_id,subject,topic' })
    )
  })

  it('clears promotion_ready and resets sessions without changing level on dismiss', async () => {
    const { client, upsertMock } = makeClient(
      { id: 'child-1' },
      [{ topic: 'fractions', language_level: 'foundational' }]
    )
    vi.mocked(createClient).mockResolvedValue(client as any)

    const req = new NextRequest('http://localhost/api/children/child-1/promote', {
      method: 'POST',
      body: JSON.stringify({ subject: 'math', action: 'dismiss' }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'child-1' }) })

    expect(res.status).toBe(200)
    expect(upsertMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ language_level: 'foundational', promotion_ready: false, sessions_at_level: 0 }),
      ]),
      expect.objectContaining({ onConflict: 'child_id,subject,topic' })
    )
  })

  it('returns 409 when no promotion-ready rows exist', async () => {
    const { client } = makeClient({ id: 'child-1' }, [])
    vi.mocked(createClient).mockResolvedValue(client as any)

    const req = new NextRequest('http://localhost/api/children/child-1/promote', {
      method: 'POST',
      body: JSON.stringify({ subject: 'math', action: 'confirm' }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'child-1' }) })
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: 'not_ready' })
  })

  it('returns 404 when child does not belong to parent', async () => {
    const { client } = makeClient(null, [])
    vi.mocked(createClient).mockResolvedValue(client as any)

    const req = new NextRequest('http://localhost/api/children/child-1/promote', {
      method: 'POST',
      body: JSON.stringify({ subject: 'math', action: 'confirm' }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'child-1' }) })
    expect(res.status).toBe(404)
  })
})
