import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}))

function makeNonAdminClient() {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { is_admin: false }, error: null }),
    }),
  }
}

describe('Admin API auth guard — non-admin gets 403', () => {
  beforeEach(async () => {
    const { createClient } = await import('@/lib/supabase/server')
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(makeNonAdminClient())
  })

  it('POST /api/admin/generate returns 403', async () => {
    const { POST } = await import('@/app/api/admin/generate/route')
    const res = await POST(new NextRequest('http://localhost/api/admin/generate', {
      method: 'POST', body: JSON.stringify({ grade: 3, subject: 'math', topic: 'fractions' }),
    }))
    expect(res.status).toBe(403)
  })

  it('GET /api/admin/pending returns 403', async () => {
    const { GET } = await import('@/app/api/admin/pending/route')
    const res = await GET(new NextRequest('http://localhost/api/admin/pending'))
    expect(res.status).toBe(403)
  })

  it('PATCH /api/admin/pending/[id] returns 403', async () => {
    const { PATCH } = await import('@/app/api/admin/pending/[id]/route')
    const res = await PATCH(
      new NextRequest('http://localhost/api/admin/pending/pq-1', {
        method: 'PATCH', body: JSON.stringify({ question_text: 'x' }),
      }),
      { params: Promise.resolve({ id: 'pq-1' }) }
    )
    expect(res.status).toBe(403)
  })

  it('POST /api/admin/pending/[id]/approve returns 403', async () => {
    const { POST } = await import('@/app/api/admin/pending/[id]/approve/route')
    const res = await POST(
      new NextRequest('http://localhost/api/admin/pending/pq-1/approve', { method: 'POST' }),
      { params: Promise.resolve({ id: 'pq-1' }) }
    )
    expect(res.status).toBe(403)
  })

  it('POST /api/admin/pending/[id]/reject returns 403', async () => {
    const { POST } = await import('@/app/api/admin/pending/[id]/reject/route')
    const res = await POST(
      new NextRequest('http://localhost/api/admin/pending/pq-1/reject', { method: 'POST' }),
      { params: Promise.resolve({ id: 'pq-1' }) }
    )
    expect(res.status).toBe(403)
  })

  it('POST /api/admin/pending/[id]/restore returns 403', async () => {
    const { POST } = await import('@/app/api/admin/pending/[id]/restore/route')
    const res = await POST(
      new NextRequest('http://localhost/api/admin/pending/pq-1/restore', { method: 'POST' }),
      { params: Promise.resolve({ id: 'pq-1' }) }
    )
    expect(res.status).toBe(403)
  })

  it('GET /api/admin/questions returns 403', async () => {
    const { GET } = await import('@/app/api/admin/questions/route')
    const res = await GET(new NextRequest('http://localhost/api/admin/questions'))
    expect(res.status).toBe(403)
  })

  it('PATCH /api/admin/questions/[id] returns 403', async () => {
    const { PATCH } = await import('@/app/api/admin/questions/[id]/route')
    const res = await PATCH(
      new NextRequest('http://localhost/api/admin/questions/q-1', {
        method: 'PATCH', body: JSON.stringify({ question_text: 'x' }),
      }),
      { params: Promise.resolve({ id: 'q-1' }) }
    )
    expect(res.status).toBe(403)
  })
})
