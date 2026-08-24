import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}))

const mockPending = { id: 'wp-1', status: 'pending', band: 'elementary', generated_at: new Date().toISOString() }
const mockApproved = { id: 'wp-2', status: 'approved', band: 'middle', generated_at: new Date().toISOString() }

function makeAdminMocks(rows: unknown[]) {
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
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: rows, error: null }),
      }),
    },
  }
}

describe('GET /api/admin/weekly-challenge', () => {
  beforeEach(async () => {
    const { createClient, createAdminClient } = await import('@/lib/supabase/server')
    const { userClient, adminClient } = makeAdminMocks([mockPending])
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(userClient)
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(adminClient)
  })

  it('returns 200 with an array of pending puzzles by default', async () => {
    const { GET } = await import('./route')
    const res = await GET(new NextRequest('http://localhost/api/admin/weekly-challenge'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  it('includes approved/rejected when includeReviewed=true', async () => {
    const { createAdminClient } = await import('@/lib/supabase/server')
    const { adminClient } = makeAdminMocks([mockPending, mockApproved])
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(adminClient)
    const { GET } = await import('./route')
    const res = await GET(new NextRequest('http://localhost/api/admin/weekly-challenge?includeReviewed=true'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(2)
  })
})
