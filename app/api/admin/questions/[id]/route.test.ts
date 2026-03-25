import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}))

function makeAdminMocks() {
  const updateResult = { eq: vi.fn().mockReturnThis(), select: vi.fn().mockResolvedValue({ data: [{ id: 'q-1', question_text: 'Updated Q?' }], error: null }) }
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
        update: vi.fn().mockReturnValue(updateResult),
      }),
    },
  }
}

describe('PATCH /api/admin/questions/[id]', () => {
  beforeEach(async () => {
    const { createClient, createAdminClient } = await import('@/lib/supabase/server')
    const { userClient, adminClient } = makeAdminMocks()
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(userClient)
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(adminClient)
  })

  it('updates a published question and returns it', async () => {
    const { PATCH } = await import('./route')
    const req = new NextRequest('http://localhost/api/admin/questions/q-1', {
      method: 'PATCH',
      body: JSON.stringify({ question_text: 'Updated Q?' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'q-1' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.question_text).toBe('Updated Q?')
  })

  it('only updates allowed fields', async () => {
    const { PATCH } = await import('./route')
    const req = new NextRequest('http://localhost/api/admin/questions/q-1', {
      method: 'PATCH',
      body: JSON.stringify({ question_text: 'Updated', admin_only_field: 'should-be-ignored' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'q-1' }) })
    expect(res.status).toBe(200)
  })
})
