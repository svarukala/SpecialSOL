import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}))

function makeAdminMocks(rpcResult: { data: unknown; error: unknown }) {
  return {
    userClient: {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { is_admin: true }, error: null }),
      }),
    },
    adminClient: { rpc: vi.fn().mockResolvedValue(rpcResult) },
  }
}

describe('POST /api/admin/pending/[id]/approve', () => {
  it('returns 200 with questionId on success', async () => {
    const { createClient, createAdminClient } = await import('@/lib/supabase/server')
    const { userClient, adminClient } = makeAdminMocks({ data: 'new-q-id', error: null })
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(userClient)
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(adminClient)

    const { POST } = await import('./route')
    const req = new NextRequest('http://localhost/api/admin/pending/pq-1/approve', { method: 'POST' })
    const res = await POST(req, { params: Promise.resolve({ id: 'pq-1' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('questionId', 'new-q-id')
  })

  it('returns 409 when already_published error comes back from RPC', async () => {
    const { createClient, createAdminClient } = await import('@/lib/supabase/server')
    const { userClient, adminClient } = makeAdminMocks({
      data: null,
      error: { message: 'already_published', code: 'P0001', details: null, hint: null },
    })
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(userClient)
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(adminClient)

    const { POST } = await import('./route')
    const req = new NextRequest('http://localhost/api/admin/pending/pq-1/approve', { method: 'POST' })
    const res = await POST(req, { params: Promise.resolve({ id: 'pq-1' }) })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('already_published')
  })
})
