import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'

function makeClient(opts: {
  child: { id: string; grade: number } | null
  puzzle: Record<string, unknown> | null
  existingAttempt: Record<string, unknown> | null
  parentStreak: Record<string, unknown>
}) {
  const upsertAttemptMock = vi.fn().mockResolvedValue({ error: null })
  const updateChildMock = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })

  const client = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'parent-1' } } }) },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'children') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: opts.child, error: null }),
          update: updateChildMock,
        }
      }
      if (table === 'weekly_puzzles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: opts.puzzle, error: null }),
        }
      }
      if (table === 'weekly_puzzle_attempts') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: opts.existingAttempt, error: null }),
          upsert: upsertAttemptMock,
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    }),
  }
  return { client, upsertAttemptMock, updateChildMock }
}

beforeEach(() => vi.clearAllMocks())

describe('POST /api/weekly-challenge/attempt', () => {
  it('solves a mystery_code puzzle on the first correct attempt and updates the streak', async () => {
    const puzzle = {
      id: 'puzzle-1',
      band: 'elementary',
      puzzle_type: 'mystery_code',
      week_start_date: '2026-08-24',
      content: {
        codeLabel: '2-digit code',
        questions: [
          { prompt: '2+2?', choices: ['3', '4'], correctIndex: 1, revealsDigit: '7' },
          { prompt: '5+5?', choices: ['10', '9'], correctIndex: 0, revealsDigit: '3' },
        ],
      },
      solution: { code: '73' },
    }
    const { client, upsertAttemptMock, updateChildMock } = makeClient({
      child: { id: 'child-1', grade: 4 },
      puzzle,
      existingAttempt: null,
      parentStreak: {},
    })
    vi.mocked(createClient).mockResolvedValue(client as any)

    const req = new NextRequest('http://localhost/api/weekly-challenge/attempt', {
      method: 'POST',
      body: JSON.stringify({ childId: 'child-1', puzzleId: 'puzzle-1', mysteryAnswerIndexes: [1, 0] }),
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.solved).toBe(true)
    expect(body.revealedCode).toBe('73')
    expect(upsertAttemptMock).toHaveBeenCalledWith(
      expect.objectContaining({ child_id: 'child-1', puzzle_id: 'puzzle-1', attempt_count: 1 }),
      expect.objectContaining({ onConflict: 'child_id,puzzle_id' })
    )
    expect(updateChildMock).toHaveBeenCalledWith(
      expect.objectContaining({
        current_streak_elementary: 1,
        best_streak_elementary: 1,
        last_solved_week_elementary: '2026-08-24',
      })
    )
  })

  it('returns 404 when the child does not belong to the caller', async () => {
    const { client } = makeClient({ child: null, puzzle: null, existingAttempt: null, parentStreak: {} })
    vi.mocked(createClient).mockResolvedValue(client as any)

    const req = new NextRequest('http://localhost/api/weekly-challenge/attempt', {
      method: 'POST',
      body: JSON.stringify({ childId: 'child-1', puzzleId: 'puzzle-1', mysteryAnswerIndexes: [0] }),
    })
    const res = await POST(req)
    expect(res.status).toBe(404)
  })

  it('does not re-update the streak on a repeat solve of an already-solved puzzle', async () => {
    const puzzle = {
      id: 'puzzle-1',
      band: 'elementary',
      puzzle_type: 'mystery_code',
      content: { codeLabel: '1-digit code', questions: [{ prompt: '1+1?', choices: ['2'], correctIndex: 0, revealsDigit: '9' }] },
      solution: { code: '9' },
    }
    const { client, upsertAttemptMock, updateChildMock } = makeClient({
      child: { id: 'child-1', grade: 4 },
      puzzle,
      existingAttempt: { solved_at: '2026-08-24T12:00:00Z', attempt_count: 1 },
      parentStreak: {},
    })
    vi.mocked(createClient).mockResolvedValue(client as any)

    const req = new NextRequest('http://localhost/api/weekly-challenge/attempt', {
      method: 'POST',
      body: JSON.stringify({ childId: 'child-1', puzzleId: 'puzzle-1', mysteryAnswerIndexes: [0] }),
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.solved).toBe(true)
    expect(upsertAttemptMock).toHaveBeenCalledWith(
      expect.objectContaining({ attempt_count: 2 }),
      expect.anything()
    )
    expect(updateChildMock).not.toHaveBeenCalled()
  })
})
