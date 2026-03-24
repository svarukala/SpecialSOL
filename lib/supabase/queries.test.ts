// lib/supabase/queries.test.ts
import { describe, it, expect, vi } from 'vitest'
import { getQuestionsForSession, getChildTopicLevels } from './queries'

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

describe('getChildTopicLevels', () => {
  it('returns a map of topic → language_level', async () => {
    const rows = [
      { topic: 'fractions', language_level: 'standard' },
      { topic: 'multiplication', language_level: 'simplified' },
    ]
    const mockChain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    }
    // Make the chain thenable so `await chain` resolves with data
    mockChain.then = (resolve: (v: unknown) => void) =>
      Promise.resolve({ data: rows, error: null }).then(resolve)
    const sb = { from: vi.fn().mockReturnValue(mockChain) } as any

    const result = await getChildTopicLevels(sb, 'child-1', 'math')
    expect(result).toEqual({ fractions: 'standard', multiplication: 'simplified' })
  })

  it('returns empty object when no records exist', async () => {
    const mockChain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    }
    mockChain.then = (resolve: (v: unknown) => void) =>
      Promise.resolve({ data: [], error: null }).then(resolve)
    const sb = { from: vi.fn().mockReturnValue(mockChain) } as any

    const result = await getChildTopicLevels(sb, 'child-1', 'math')
    expect(result).toEqual({})
  })
})
