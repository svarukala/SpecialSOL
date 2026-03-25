// lib/supabase/queries.test.ts
import { describe, it, expect, vi } from 'vitest'
import { getQuestionsForSession, getChildTopicLevels, bumpTopicLevelIfEarned, getAllChildTopicLevels, getRecentMilestones } from './queries'
import type { Milestone } from './queries'

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

describe('bumpTopicLevelIfEarned', () => {
  function makeSelectThenUpsert(existingRows: Record<string, unknown>[]) {
    const selectChain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    }
    selectChain.then = (resolve: (v: unknown) => void) =>
      Promise.resolve({ data: existingRows, error: null }).then(resolve)

    const upsertChain = {
      upsert: vi.fn().mockResolvedValue({ error: null }),
    }

    let callCount = 0
    const mockSb = {
      from: vi.fn().mockImplementation(() => {
        callCount++
        return callCount === 1 ? selectChain : upsertChain
      }),
    } as any
    return { mockSb, upsertChain }
  }

  it('promotes topic to standard after 2 sessions at 80%+ accuracy', async () => {
    const { mockSb, upsertChain } = makeSelectThenUpsert([
      { topic: 'fractions', language_level: 'simplified', sessions_at_level: 1 },
    ])
    await bumpTopicLevelIfEarned(mockSb, 'child-1', 'math', {
      fractions: { correct: 9, total: 10 }, // 90% accuracy
    })
    expect(upsertChain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ language_level: 'standard', sessions_at_level: 0 }),
      expect.any(Object)
    )
  })

  it('demotes topic to simplified when accuracy drops below 50% at standard', async () => {
    const { mockSb, upsertChain } = makeSelectThenUpsert([
      { topic: 'fractions', language_level: 'standard', sessions_at_level: 0 },
    ])
    await bumpTopicLevelIfEarned(mockSb, 'child-1', 'math', {
      fractions: { correct: 3, total: 10 }, // 30% accuracy
    })
    expect(upsertChain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ language_level: 'simplified', sessions_at_level: 0 }),
      expect.any(Object)
    )
  })

  it('increments sessions_at_level when accuracy >= 80% but not yet at threshold', async () => {
    const { mockSb, upsertChain } = makeSelectThenUpsert([
      { topic: 'fractions', language_level: 'simplified', sessions_at_level: 0 },
    ])
    await bumpTopicLevelIfEarned(mockSb, 'child-1', 'math', {
      fractions: { correct: 9, total: 10 }, // 90%, but only 1st session
    })
    expect(upsertChain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ language_level: 'simplified', sessions_at_level: 1 }),
      expect.any(Object)
    )
  })

  it('does nothing when accuracy is between 50% and 80%', async () => {
    const { mockSb, upsertChain } = makeSelectThenUpsert([
      { topic: 'fractions', language_level: 'simplified', sessions_at_level: 0 },
    ])
    await bumpTopicLevelIfEarned(mockSb, 'child-1', 'math', {
      fractions: { correct: 6, total: 10 }, // 60% — no change
    })
    expect(upsertChain.upsert).not.toHaveBeenCalled()
  })

  it('skips topics with total === 0', async () => {
    const { mockSb, upsertChain } = makeSelectThenUpsert([])
    await bumpTopicLevelIfEarned(mockSb, 'child-1', 'math', {
      fractions: { correct: 0, total: 0 },
    })
    expect(upsertChain.upsert).not.toHaveBeenCalled()
  })

  it('promotion upsert includes previous_level and changed_at', async () => {
    const { mockSb, upsertChain } = makeSelectThenUpsert([
      { topic: 'fractions', language_level: 'simplified', sessions_at_level: 1 },
    ])
    await bumpTopicLevelIfEarned(mockSb, 'child-1', 'math', {
      fractions: { correct: 9, total: 10 },
    })
    expect(upsertChain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        language_level: 'standard',
        previous_level: 'simplified',
        changed_at: expect.any(String),
      }),
      expect.any(Object)
    )
  })

  it('demotion upsert includes previous_level and changed_at', async () => {
    const { mockSb, upsertChain } = makeSelectThenUpsert([
      { topic: 'fractions', language_level: 'standard', sessions_at_level: 0 },
    ])
    await bumpTopicLevelIfEarned(mockSb, 'child-1', 'math', {
      fractions: { correct: 3, total: 10 },
    })
    expect(upsertChain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        language_level: 'simplified',
        previous_level: 'standard',
        changed_at: expect.any(String),
      }),
      expect.any(Object)
    )
  })

  it('increment upsert does NOT include previous_level or changed_at', async () => {
    const { mockSb, upsertChain } = makeSelectThenUpsert([
      { topic: 'fractions', language_level: 'simplified', sessions_at_level: 0 },
    ])
    await bumpTopicLevelIfEarned(mockSb, 'child-1', 'math', {
      fractions: { correct: 9, total: 10 },
    })
    const payload = upsertChain.upsert.mock.calls[0][0]
    expect(payload).not.toHaveProperty('previous_level')
    expect(payload).not.toHaveProperty('changed_at')
  })
})

describe('getAllChildTopicLevels', () => {
  function makeChain(rows: Record<string, unknown>[]) {
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    }
    chain.then = (resolve: (v: unknown) => void) =>
      Promise.resolve({ data: rows, error: null }).then(resolve)
    return { from: vi.fn().mockReturnValue(chain) } as any
  }

  it('returns flat topic→level map from all subjects', async () => {
    const sb = makeChain([
      { topic: 'fractions', language_level: 'standard' },
      { topic: 'poetry', language_level: 'simplified' },
    ])
    const result = await getAllChildTopicLevels(sb, 'child-1')
    expect(result).toEqual({ fractions: 'standard', poetry: 'simplified' })
  })

  it('returns empty object when no rows exist', async () => {
    const sb = makeChain([])
    const result = await getAllChildTopicLevels(sb, 'child-1')
    expect(result).toEqual({})
  })

  it('returns empty object on DB error', async () => {
    const chain: any = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() }
    chain.then = (resolve: (v: unknown) => void) =>
      Promise.resolve({ data: null, error: { message: 'db error' } }).then(resolve)
    const sb = { from: vi.fn().mockReturnValue(chain) } as any
    const result = await getAllChildTopicLevels(sb, 'child-1')
    expect(result).toEqual({})
  })
})

describe('getRecentMilestones', () => {
  const now = new Date().toISOString()

  function makeChain(rows: Record<string, unknown>[] | null, error: unknown = null) {
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    }
    chain.then = (resolve: (v: unknown) => void) =>
      Promise.resolve({ data: rows, error }).then(resolve)
    return { from: vi.fn().mockReturnValue(chain) } as any
  }

  it('returns empty array when no milestones in window', async () => {
    const sb = makeChain([])
    const result = await getRecentMilestones(sb, 'child-1')
    expect(result).toEqual([])
  })

  it('maps DB rows to Milestone objects with correct fields', async () => {
    const sb = makeChain([
      { subject: 'math', topic: 'fractions', language_level: 'standard', previous_level: 'simplified', changed_at: now },
      { subject: 'math', topic: 'division', language_level: 'simplified', previous_level: 'standard', changed_at: now },
    ])
    const result = await getRecentMilestones(sb, 'child-1')
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      subject: 'math', topic: 'fractions',
      fromLevel: 'simplified', toLevel: 'standard',
      changedAt: now, direction: 'promoted',
    })
    expect(result[1]).toEqual({
      subject: 'math', topic: 'division',
      fromLevel: 'standard', toLevel: 'simplified',
      changedAt: now, direction: 'demoted',
    })
  })

  it('returns empty array on DB error', async () => {
    const sb = makeChain(null, { message: 'db error' })
    const result = await getRecentMilestones(sb, 'child-1')
    expect(result).toEqual([])
  })
})
