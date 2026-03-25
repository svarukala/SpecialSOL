import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockQuestion = {
  grade: 3, subject: 'math', topic: 'fractions', subtopic: 'identifying fractions',
  sol_standard: '3.2', difficulty: 1,
  question_text: 'What fraction?', simplified_text: 'What fraction?',
  answer_type: 'multiple_choice',
  choices: [
    { id: 'a', text: '1/4', is_correct: true },
    { id: 'b', text: '1/3', is_correct: false },
    { id: 'c', text: '2/4', is_correct: false },
    { id: 'd', text: '3/4', is_correct: false },
  ],
  hint_1: 'H1', hint_2: 'H2', hint_3: 'H3',
  calculator_allowed: false, source: 'ai_generated',
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}))
vi.mock('@/lib/generation/generate-topic', () => ({
  generateTopic: vi.fn().mockResolvedValue([mockQuestion]),
}))

describe('POST /api/admin/generate', () => {
  beforeEach(async () => {
    const { createClient, createAdminClient } = await import('@/lib/supabase/server')
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { is_admin: true }, error: null }),
      }),
    })
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: [{ id: 'pq-1' }], error: null }),
      }),
    })
  })

  it('returns 200 with count and ids on success', async () => {
    const { POST } = await import('./route')
    const req = new NextRequest('http://localhost/api/admin/generate', {
      method: 'POST',
      body: JSON.stringify({ grade: 3, subject: 'math', topic: 'fractions' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('count', 1)
    expect(body).toHaveProperty('ids')
  })

  it('returns 400 for an unknown topic name', async () => {
    const { POST } = await import('./route')
    const req = new NextRequest('http://localhost/api/admin/generate', {
      method: 'POST',
      body: JSON.stringify({ grade: 3, subject: 'math', topic: 'not a real topic' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('unknown_topic')
  })
})
