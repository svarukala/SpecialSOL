import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}))

function makeAdminMocks(opts: {
  existing: { status: string; week_start_date: string | null } | null
  updateResult: { error: unknown }
}) {
  const updateChain = { eq: vi.fn().mockResolvedValue(opts.updateResult) }
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
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: opts.existing, error: null }),
        update: vi.fn().mockReturnValue(updateChain),
      }),
    },
  }
}

describe('POST /api/admin/weekly-challenge/[id]/approve', () => {
  it('returns 200 on success when week_start_date is set', async () => {
    const { createClient, createAdminClient } = await import('@/lib/supabase/server')
    const { userClient, adminClient } = makeAdminMocks({
      existing: { status: 'pending', week_start_date: '2026-09-07' },
      updateResult: { error: null },
    })
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(userClient)
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(adminClient)

    const { POST } = await import('./route')
    const req = new NextRequest('http://localhost/api/admin/weekly-challenge/wp-1/approve', { method: 'POST' })
    const res = await POST(req, { params: Promise.resolve({ id: 'wp-1' }) })
    expect(res.status).toBe(200)
  })

  it('returns 400 when week_start_date is not set', async () => {
    const { createClient, createAdminClient } = await import('@/lib/supabase/server')
    const { userClient, adminClient } = makeAdminMocks({
      existing: { status: 'pending', week_start_date: null },
      updateResult: { error: null },
    })
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(userClient)
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(adminClient)

    const { POST } = await import('./route')
    const req = new NextRequest('http://localhost/api/admin/weekly-challenge/wp-1/approve', { method: 'POST' })
    const res = await POST(req, { params: Promise.resolve({ id: 'wp-1' }) })
    expect(res.status).toBe(400)
  })

  it('returns 409 when the band/week combination is already taken', async () => {
    const { createClient, createAdminClient } = await import('@/lib/supabase/server')
    const { userClient, adminClient } = makeAdminMocks({
      existing: { status: 'pending', week_start_date: '2026-09-07' },
      updateResult: { error: { message: 'duplicate key value violates unique constraint "idx_weekly_puzzles_band_week"' } },
    })
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(userClient)
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(adminClient)

    const { POST } = await import('./route')
    const req = new NextRequest('http://localhost/api/admin/weekly-challenge/wp-1/approve', { method: 'POST' })
    const res = await POST(req, { params: Promise.resolve({ id: 'wp-1' }) })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('week_already_scheduled')
  })
})
