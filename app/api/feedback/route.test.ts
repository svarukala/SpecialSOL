import { describe, it, expect, vi } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'fb-1' }, error: null }),
    }),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'p1' } } }) },
  }),
}))

describe('POST /api/feedback', () => {
  it('creates feedback record and returns 201', async () => {
    const req = new NextRequest('http://localhost/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        submittedByType: 'child',
        submittedById: 'child-1',
        sessionId: 'session-1',
        questionId: 'q-1',
        category: 'child_confused',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })
})
