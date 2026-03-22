import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getQuestionsForSession, getRecentSessionQuestionIds } from '@/lib/supabase/queries'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const grade = parseInt(searchParams.get('grade') ?? '3')
  const subject = searchParams.get('subject') ?? 'math'
  const childId = searchParams.get('childId') ?? ''
  const mode = searchParams.get('mode') ?? 'practice'
  const count = mode === 'test' ? 20 : 10

  const supabase = await createClient()
  const recentIds = childId ? await getRecentSessionQuestionIds(supabase, childId) : []
  const questions = await getQuestionsForSession(supabase, grade, subject, count, recentIds)

  return NextResponse.json(questions)
}
