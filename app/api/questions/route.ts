import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getQuestionsForSession, getRecentSessionQuestionIds, getChildTopicLevels } from '@/lib/supabase/queries'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const grade = parseInt(searchParams.get('grade') ?? '3')
  const subject = searchParams.get('subject') ?? 'math'
  const childId = searchParams.get('childId') ?? ''
  const mode = searchParams.get('mode') ?? 'practice'
  const count = mode === 'test' ? 20 : 10

  const supabase = await createClient()
  const recentIds = childId ? await getRecentSessionQuestionIds(supabase, childId) : []

  // Derive the child's current dominant language level
  let languageLevel: 'simplified' | 'standard' = 'simplified'
  if (childId) {
    const topicLevels = await getChildTopicLevels(supabase, childId, subject)
    const levels = Object.values(topicLevels)
    const standardCount = levels.filter((l) => l === 'standard').length
    // Majority at standard → serve standard; ties and new children default to simplified
    if (levels.length > 0 && standardCount > levels.length / 2) {
      languageLevel = 'standard'
    }
  }

  const questions = await getQuestionsForSession(supabase, grade, subject, count, recentIds, languageLevel)

  return NextResponse.json(questions)
}
