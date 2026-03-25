import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}))

function makeAdminMocks(pendingStatus = 'pending') {
  const updateResult = { eq: vi.fn().mockReturnThis(), select: vi.fn().mockResolvedValue({ data: [{ id: 'pq-1' }], error: null }) }
  return {
    userClient: {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { is_admin: true }, error: null }),
      }),
    },
    adminClient: {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'questions_pending') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'pq-1', status: pendingStatus }, error: null }),
            update: vi.fn().mockReturnValue(updateResult),
          }
        }
        return {}
      }),
    },
  }
}

describe('PATCH /api/admin/pending/[id]', () => {
  beforeEach(async () => {
    const { createClient, createAdminClient } = await import('@/lib/supabase/server')
    const { userClient, adminClient } = makeAdminMocks()
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(userClient)
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(adminClient)
  })

  it('updates a pending question and returns 200', async () => {
    const { PATCH } = await import('./route')
    const req = new NextRequest('http://localhost/api/admin/pending/pq-1', {
      method: 'PATCH',
      body: JSON.stringify({ question_text: 'Updated text' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'pq-1' }) })
    expect(res.status).toBe(200)
  })

  it('returns 409 when row is already approved', async () => {
    const { createAdminClient } = await import('@/lib/supabase/server')
    const { adminClient } = makeAdminMocks('approved')
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(adminClient)
    const { PATCH } = await import('./route')
    const req = new NextRequest('http://localhost/api/admin/pending/pq-1', {
      method: 'PATCH',
      body: JSON.stringify({ question_text: 'Updated text' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'pq-1' }) })
    expect(res.status).toBe(409)
  })
})
