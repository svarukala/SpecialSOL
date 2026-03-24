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
  excludeQuestionIds: string[] = [],
  languageLevel: 'simplified' | 'standard' = 'simplified'
) {
  const easyTarget   = Math.round(count * 0.4)
  const mediumTarget = Math.round(count * 0.4)
  const hardTarget   = count - easyTarget - mediumTarget

  async function fetchTier(difficulty: number, target: number): Promise<Record<string, unknown>[]> {
    const buildQuery = (withSimplifiedFilter: boolean) => {
      let q = supabase
        .from('questions')
        .select('*')
        .eq('grade', grade)
        .eq('subject', subject)
        .eq('difficulty', difficulty)
      if (excludeQuestionIds.length > 0) {
        q = q.not('id', 'in', `(${excludeQuestionIds.join(',')})`)
      }
      if (withSimplifiedFilter) {
        q = q.not('simplified_text', 'is', null)
      }
      return q.limit(target * 3)
    }

    // When serving simplified, prefer questions that have simplified_text populated
    if (languageLevel === 'simplified') {
      const { data } = await buildQuery(true)
      if ((data ?? []).length >= target) {
        return (data ?? []).sort(() => Math.random() - 0.5).slice(0, target)
      }
    }

    // Fallback: no simplified_text filter
    const { data, error } = await buildQuery(false)
    if (error) throw error
    return (data ?? []).sort(() => Math.random() - 0.5).slice(0, target)
  }

  const easy   = await fetchTier(1, easyTarget)
  let   medium = await fetchTier(2, mediumTarget)
  const hard   = await fetchTier(3, hardTarget)

  // Fill deficit from medium tier if hard tier is short
  const deficit = count - (easy.length + medium.length + hard.length)
  if (deficit > 0) {
    const extra = await fetchTier(2, mediumTarget + deficit)
    medium = extra
  }

  const combined = [...easy, ...medium, ...hard].sort(() => Math.random() - 0.5)

  // Final safety: if completely empty (very small question pool), fall back to unrestricted
  if (combined.length === 0) {
    const { data, error } = await supabase
      .from('questions').select('*').eq('grade', grade).eq('subject', subject).limit(count * 3)
    if (error) throw error
    return (data ?? []).sort(() => Math.random() - 0.5).slice(0, count)
  }

  return combined.slice(0, count)
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

export async function getChildTopicLevels(
  supabase: SupabaseClient,
  childId: string,
  subject: string
): Promise<Record<string, 'simplified' | 'standard'>> {
  const { data } = await supabase
    .from('child_topic_levels')
    .select('topic, language_level')
    .eq('child_id', childId)
    .eq('subject', subject)
  if (!data || data.length === 0) return {}
  return Object.fromEntries(
    data.map((row: { topic: string; language_level: string }) => [row.topic, row.language_level])
  ) as Record<string, 'simplified' | 'standard'>
}
