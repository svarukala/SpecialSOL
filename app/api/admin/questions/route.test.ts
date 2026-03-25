import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}))

function makeAdminMocks(rows: unknown[]) {
  const client = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }) },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: rows, count: rows.length, error: null }),
      single: vi.fn().mockResolvedValue({ data: { is_admin: true }, error: null }),
    }),
  }
  return client
}

describe('GET /api/admin/questions', () => {
  beforeEach(async () => {
    const { createClient, createAdminClient } = await import('@/lib/supabase/server')
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeAdminMocks([])
    )
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAdminMocks([{ id: 'q-1', question_text: 'Test Q?' }])
    )
  })

  it('returns questions and total', async () => {
    const { GET } = await import('./route')
    const res = await GET(new NextRequest('http://localhost/api/admin/questions?grade=3'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('questions')
    expect(body).toHaveProperty('total')
  })

  it('returns empty questions array with count', async () => {
    const { GET } = await import('./route')
    const res = await GET(new NextRequest('http://localhost/api/admin/questions'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.questions)).toBe(true)
    expect(typeof body.total).toBe('number')
  })
})
