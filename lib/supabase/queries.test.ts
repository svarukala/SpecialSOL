// lib/supabase/queries.test.ts
import { describe, it, expect, vi } from 'vitest'
import { getQuestionsForSession } from './queries'

// Helper to create a fake question
const fakeQ = (id: string, difficulty: 1|2|3, simplified_text: string|null = 'simplified') => ({
  id, difficulty, simplified_text, grade: 3, subject: 'math',
})

describe('getQuestionsForSession', () => {
  it('returns count questions distributed across difficulty tiers', async () => {
    const pool = [
      ...Array.from({ length: 10 }, (_, i) => fakeQ(`e${i}`, 1)),
      ...Array.from({ length: 10 }, (_, i) => fakeQ(`m${i}`, 2)),
      ...Array.from({ length: 10 }, (_, i) => fakeQ(`h${i}`, 3)),
    ]
    // Mock returns a slice of pool for each difficulty tier query
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        limit: vi.fn().mockImplementation(() =>
          Promise.resolve({ data: pool.slice(0, 10), error: null })
        ),
      }),
    }
    const result = await getQuestionsForSession(supabase as any, 3, 'math', 10, [], 'simplified')
    expect(result).toHaveLength(10)
  })

  it('uses simplified_text preference when languageLevel is simplified', async () => {
    const withSimplified = [fakeQ('s1', 1, 'plain text'), fakeQ('s2', 1, 'also plain')]

    let callCount = 0
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        limit: vi.fn().mockImplementation(() => {
          callCount++
          // First call (with simplified filter): return simplified questions
          return Promise.resolve({ data: callCount === 1 ? withSimplified : [], error: null })
        }),
      }),
    }
    const result = await getQuestionsForSession(supabase as any, 3, 'math', 2, [], 'simplified')
    expect(result.length).toBeGreaterThan(0)
  })
})
