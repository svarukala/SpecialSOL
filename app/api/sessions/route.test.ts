import { describe, it, expect, vi } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'parent-1' } } }) },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'session-1', child_id: 'child-1' }, error: null }),
    }),
  }),
}))

describe('POST /api/sessions', () => {
  it('returns 201 with sessionId', async () => {
    const req = new NextRequest('http://localhost/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ childId: 'child-1', subject: 'math', mode: 'practice', questionIds: ['q1', 'q2'] }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body).toHaveProperty('sessionId')
  })
})
