import { SupabaseClient } from '@supabase/supabase-js'

export async function getChildrenForParent(supabase: SupabaseClient, parentId: string) {
  const { data, error } = await supabase
    .from('children')
    .select('*')
    .eq('parent_id', parentId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function getQuestionsForSession(
  supabase: SupabaseClient,
  grade: number,
  subject: string,
  count: number,
  excludeQuestionIds: string[] = []
) {
  const base = supabase.from('questions').select('*').eq('grade', grade).eq('subject', subject)

  // Try with exclusion first; fall back to full pool if too few results
  if (excludeQuestionIds.length > 0) {
    const { data, error } = await base
      .not('id', 'in', `(${excludeQuestionIds.join(',')})`)
      .limit(count * 3)
    if (error) throw error
    if ((data ?? []).length >= Math.min(count, 3)) {
      return (data ?? []).sort(() => Math.random() - 0.5).slice(0, count)
    }
  }

  // Fall back: use full question pool (repeat questions rather than show nothing)
  const { data, error } = await base.limit(count * 3)
  if (error) throw error
  return (data ?? []).sort(() => Math.random() - 0.5).slice(0, count)
}

export async function getRecentSessionQuestionIds(
  supabase: SupabaseClient,
  childId: string,
  sessionCount = 3
): Promise<string[]> {
  const { data: sessions } = await supabase
    .from('practice_sessions')
    .select('id')
    .eq('child_id', childId)
    .eq('status', 'completed')
    .order('started_at', { ascending: false })
    .limit(sessionCount)
  if (!sessions || sessions.length === 0) return []
  const sessionIds = sessions.map((s) => s.id)
  const { data: answers } = await supabase
    .from('session_answers')
    .select('question_id')
    .in('session_id', sessionIds)
  return [...new Set((answers ?? []).map((a) => a.question_id))]
}
