import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}))

const mockPending = { id: 'pq-1', status: 'pending', generated_at: new Date().toISOString() }
const mockRejected = { id: 'pq-2', status: 'rejected', generated_at: new Date().toISOString() }

function makeAdminMocks(rows: unknown[]) {
  const client = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }) },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: rows, error: null }),
      single: vi.fn().mockResolvedValue({ data: { is_admin: true }, error: null }),
    }),
  }
  return client
}

describe('GET /api/admin/pending', () => {
  beforeEach(async () => {
    const { createClient, createAdminClient } = await import('@/lib/supabase/server')
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(makeAdminMocks([mockPending]))
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(makeAdminMocks([mockPending]))
  })

  it('returns 200 with an array', async () => {
    const { GET } = await import('./route')
    const res = await GET(new NextRequest('http://localhost/api/admin/pending'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  it('includes rejected when includeRejected=true', async () => {
    const { createAdminClient } = await import('@/lib/supabase/server')
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAdminMocks([mockPending, mockRejected])
    )
    const { GET } = await import('./route')
    const res = await GET(new NextRequest('http://localhost/api/admin/pending?includeRejected=true'))
    expect(res.status).toBe(200)
  })
})
