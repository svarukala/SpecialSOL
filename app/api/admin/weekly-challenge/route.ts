import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/lib/admin/assert-admin'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const userIdOrErr = await assertAdmin(supabase).catch(e => e)
  if (userIdOrErr instanceof Response) return userIdOrErr

  const includeReviewed = req.nextUrl.searchParams.get('includeReviewed') === 'true'
  const statuses = includeReviewed ? ['pending', 'approved', 'rejected'] : ['pending']

  const adminDb = createAdminClient()
  const { data, error } = await adminDb
    .from('weekly_puzzles')
    .select('*')
    .in('status', statuses)
    .order('generated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const puzzleIds = data.map(p => p.id)
  const { data: attempts, error: attemptsError } = await adminDb
    .from('weekly_puzzle_attempts')
    .select('puzzle_id, solved_at')
    .in('puzzle_id', puzzleIds)

  if (attemptsError) return NextResponse.json({ error: attemptsError.message }, { status: 500 })

  const stats = new Map<string, { attemptedCount: number; solvedCount: number }>()
  for (const a of attempts) {
    const entry = stats.get(a.puzzle_id) ?? { attemptedCount: 0, solvedCount: 0 }
    entry.attemptedCount += 1
    if (a.solved_at) entry.solvedCount += 1
    stats.set(a.puzzle_id, entry)
  }

  const puzzlesWithStats = data.map(p => ({
    ...p,
    ...(stats.get(p.id) ?? { attemptedCount: 0, solvedCount: 0 }),
  }))

  return NextResponse.json(puzzlesWithStats)
}
