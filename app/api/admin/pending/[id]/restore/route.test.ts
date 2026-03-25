import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}))

function makeAdminMocks(currentStatus: string) {
  const updateChain = { eq: vi.fn().mockResolvedValue({ error: null }) }
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
      from: vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { status: currentStatus }, error: null }),
        update: vi.fn().mockReturnValue(updateChain),
      })),
    },
  }
}

describe('POST /api/admin/pending/[id]/restore', () => {
  it('returns 200 when restoring a rejected question', async () => {
    const { createClient, createAdminClient } = await import('@/lib/supabase/server')
    const { userClient, adminClient } = makeAdminMocks('rejected')
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(userClient)
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(adminClient)
    const { POST } = await import('./route')
    const req = new NextRequest('http://localhost/api/admin/pending/pq-1/restore', { method: 'POST' })
    const res = await POST(req, { params: Promise.resolve({ id: 'pq-1' }) })
    expect(res.status).toBe(200)
  })

  it('returns 409 when the question is not rejected', async () => {
    const { createClient, createAdminClient } = await import('@/lib/supabase/server')
    const { userClient, adminClient } = makeAdminMocks('pending')
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(userClient)
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(adminClient)
    const { POST } = await import('./route')
    const req = new NextRequest('http://localhost/api/admin/pending/pq-1/restore', { method: 'POST' })
    const res = await POST(req, { params: Promise.resolve({ id: 'pq-1' }) })
    expect(res.status).toBe(409)
  })
})
