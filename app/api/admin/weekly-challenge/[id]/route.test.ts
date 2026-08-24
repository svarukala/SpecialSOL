import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}))

function makeAdminMocks(status = 'pending') {
  const updateResult = { eq: vi.fn().mockReturnThis(), select: vi.fn().mockResolvedValue({ data: [{ id: 'wp-1', week_start_date: '2026-09-07' }], error: null }) }
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
        if (table === 'weekly_puzzles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'wp-1', status }, error: null }),
            update: vi.fn().mockReturnValue(updateResult),
          }
        }
        return {}
      }),
    },
  }
}

describe('PATCH /api/admin/weekly-challenge/[id]', () => {
  beforeEach(async () => {
    const { createClient, createAdminClient } = await import('@/lib/supabase/server')
    const { userClient, adminClient } = makeAdminMocks()
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(userClient)
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(adminClient)
  })

  it('updates week_start_date on a pending puzzle and returns 200', async () => {
    const { PATCH } = await import('./route')
    const req = new NextRequest('http://localhost/api/admin/weekly-challenge/wp-1', {
      method: 'PATCH',
      body: JSON.stringify({ week_start_date: '2026-09-07' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'wp-1' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.week_start_date).toBe('2026-09-07')
  })

  it('returns 409 when the puzzle is already approved', async () => {
    const { createAdminClient } = await import('@/lib/supabase/server')
    const { adminClient } = makeAdminMocks('approved')
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(adminClient)
    const { PATCH } = await import('./route')
    const req = new NextRequest('http://localhost/api/admin/weekly-challenge/wp-1', {
      method: 'PATCH',
      body: JSON.stringify({ week_start_date: '2026-09-07' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'wp-1' }) })
    expect(res.status).toBe(409)
  })
})
