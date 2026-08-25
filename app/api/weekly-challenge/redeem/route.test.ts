// app/api/weekly-challenge/redeem/route.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'

const CURRENT_WEEK = '2026-08-24'

function makeClient(opts: {
  child: { id: string; grade: number } | null
  puzzle: Record<string, unknown> | null
  attempt: Record<string, unknown> | null
}) {
  const upsertBadgeMock = vi.fn().mockResolvedValue({ error: null })

  const client = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'parent-1' } } }) },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'children') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: opts.child, error: null }),
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
          maybeSingle: vi.fn().mockResolvedValue({ data: opts.attempt, error: null }),
        }
      }
      if (table === 'child_badges') {
        return { upsert: upsertBadgeMock }
      }
      throw new Error(`Unexpected table: ${table}`)
    }),
  }
  return { client, upsertBadgeMock }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(new Date(`${CURRENT_WEEK}T15:00:00Z`))
})

afterEach(() => {
  vi.useRealTimers()
})

const puzzle = {
  id: 'puzzle-1',
  band: 'elementary',
  puzzle_type: 'mystery_code',
  title: 'The Locker Code',
  week_start_date: CURRENT_WEEK,
  solution: { code: '419' },
}

describe('POST /api/weekly-challenge/redeem', () => {
  it('awards the puzzle badge when the code matches and the puzzle was solved', async () => {
    const { client, upsertBadgeMock } = makeClient({
      child: { id: 'child-1', grade: 4 },
      puzzle,
      attempt: { solved_at: '2026-08-24T12:00:00Z' },
    })
    vi.mocked(createClient).mockResolvedValue(client as any)

    const req = new NextRequest('http://localhost/api/weekly-challenge/redeem', {
      method: 'POST',
      body: JSON.stringify({ childId: 'child-1', puzzleId: 'puzzle-1', code: '419' }),
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.badge).toEqual(
      expect.objectContaining({ badgeKey: 'puzzle:puzzle-1', title: 'The Locker Code', emoji: '🗝️' })
    )
    expect(upsertBadgeMock).toHaveBeenCalledWith(
      expect.objectContaining({ child_id: 'child-1', badge_key: 'puzzle:puzzle-1' }),
      expect.objectContaining({ onConflict: 'child_id,badge_key' })
    )
  })

  it('returns 400 when the code is wrong', async () => {
    const { client, upsertBadgeMock } = makeClient({
      child: { id: 'child-1', grade: 4 },
      puzzle,
      attempt: { solved_at: '2026-08-24T12:00:00Z' },
    })
    vi.mocked(createClient).mockResolvedValue(client as any)

    const req = new NextRequest('http://localhost/api/weekly-challenge/redeem', {
      method: 'POST',
      body: JSON.stringify({ childId: 'child-1', puzzleId: 'puzzle-1', code: '000' }),
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe('incorrect_code')
    expect(upsertBadgeMock).not.toHaveBeenCalled()
  })

  it('returns 404 when the child has not solved the puzzle yet', async () => {
    const { client } = makeClient({
      child: { id: 'child-1', grade: 4 },
      puzzle,
      attempt: null,
    })
    vi.mocked(createClient).mockResolvedValue(client as any)

    const req = new NextRequest('http://localhost/api/weekly-challenge/redeem', {
      method: 'POST',
      body: JSON.stringify({ childId: 'child-1', puzzleId: 'puzzle-1', code: '419' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(404)
  })

  it('returns 404 when the puzzle is not approved for the current week', async () => {
    const { client } = makeClient({
      child: { id: 'child-1', grade: 4 },
      puzzle: null,
      attempt: null,
    })
    vi.mocked(createClient).mockResolvedValue(client as any)

    const req = new NextRequest('http://localhost/api/weekly-challenge/redeem', {
      method: 'POST',
      body: JSON.stringify({ childId: 'child-1', puzzleId: 'old-puzzle', code: '419' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(404)
  })

  it('is idempotent when redeeming an already-claimed badge again', async () => {
    const { client, upsertBadgeMock } = makeClient({
      child: { id: 'child-1', grade: 4 },
      puzzle,
      attempt: { solved_at: '2026-08-24T12:00:00Z' },
    })
    vi.mocked(createClient).mockResolvedValue(client as any)

    const req = new NextRequest('http://localhost/api/weekly-challenge/redeem', {
      method: 'POST',
      body: JSON.stringify({ childId: 'child-1', puzzleId: 'puzzle-1', code: '419' }),
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.badge.badgeKey).toBe('puzzle:puzzle-1')
    expect(upsertBadgeMock).toHaveBeenCalled()
  })

  it('returns 500 and does not report success when the badge upsert fails', async () => {
    const { client, upsertBadgeMock } = makeClient({
      child: { id: 'child-1', grade: 4 },
      puzzle,
      attempt: { solved_at: '2026-08-24T12:00:00Z' },
    })
    upsertBadgeMock.mockResolvedValue({ error: { message: 'some db error' } })
    vi.mocked(createClient).mockResolvedValue(client as any)

    const req = new NextRequest('http://localhost/api/weekly-challenge/redeem', {
      method: 'POST',
      body: JSON.stringify({ childId: 'child-1', puzzleId: 'puzzle-1', code: '419' }),
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBeTruthy()
    expect(body.badge).toBeUndefined()
  })
})
