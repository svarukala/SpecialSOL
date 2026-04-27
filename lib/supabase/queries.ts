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
  languageLevel: 'foundational' | 'simplified' | 'standard' = 'simplified',
  source: 'all' | 'doe_released' | 'ai_generated' = 'all'
) {
  const easyTarget   = Math.round(count * 0.4)
  const mediumTarget = Math.round(count * 0.4)
  const hardTarget   = count - easyTarget - mediumTarget
  const tierFilter   = languageLevel === 'foundational' ? 'foundational' : 'standard'

  async function fetchTier(difficulty: number, target: number): Promise<Record<string, unknown>[]> {
    const buildQuery = (withSimplifiedFilter: boolean) => {
      let q = supabase
        .from('questions')
        .select('*')
        .eq('grade', grade)
        .eq('subject', subject)
        .eq('difficulty', difficulty)
        .eq('tier', tierFilter)
        .eq('needs_image', false)
      if (source !== 'all') {
        q = q.eq('source', source)
      }
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

    // Fallback: no simplified_text filter (tier filter still applied via buildQuery)
    const { data, error } = await buildQuery(false)
    if (error) throw error
    return (data ?? []).sort(() => Math.random() - 0.5).slice(0, target)
  }

  const easy   = await fetchTier(1, easyTarget)
  let   medium = await fetchTier(2, mediumTarget)
  const hard   = await fetchTier(3, hardTarget)

  // Fill any deficit by pulling more medium questions
  const deficit = count - (easy.length + medium.length + hard.length)
  if (deficit > 0) {
    const extra = await fetchTier(2, mediumTarget + deficit)
    medium = extra
  }

  const combined = [...easy, ...medium, ...hard].sort(() => Math.random() - 0.5)

  // If we still have fewer questions than needed (pool exhausted by recency exclusions
  // or thin grade/subject), retry without exclusions so the session is always full.
  if (combined.length < count) {
    const seenIds = new Set(combined.map((q) => (q as { id: string }).id))
    let fallback = supabase
      .from('questions').select('*')
      .eq('grade', grade)
      .eq('subject', subject)
      .eq('tier', tierFilter)
      .eq('needs_image', false)
    if (source !== 'all') {
      fallback = fallback.eq('source', source)
    }
    const { data, error } = await fallback.limit((count - combined.length) * 4)
    if (error) throw error
    // Append from fallback, skipping any already in combined
    const extras = (data ?? [])
      .filter((q: Record<string, unknown>) => !seenIds.has(q.id as string))
      .sort(() => Math.random() - 0.5)
      .slice(0, count - combined.length)
    return [...combined, ...extras].slice(0, count)
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
): Promise<Record<string, 'foundational' | 'simplified' | 'standard'>> {
  const { data } = await supabase
    .from('child_topic_levels')
    .select('topic, language_level')
    .eq('child_id', childId)
    .eq('subject', subject)
  if (!data || data.length === 0) return {}
  return Object.fromEntries(
    data.map((row: { topic: string; language_level: string }) => [row.topic, row.language_level])
  ) as Record<string, 'foundational' | 'simplified' | 'standard'>
}

export async function getAllChildTopicLevels(
  supabase: SupabaseClient,
  childId: string
): Promise<Record<string, 'foundational' | 'simplified' | 'standard'>> {
  const { data } = await supabase
    .from('child_topic_levels')
    .select('topic, language_level')
    .eq('child_id', childId)
  if (!data) return {}
  return Object.fromEntries(
    data.map((r: { topic: string; language_level: string }) => [
      r.topic,
      r.language_level as 'foundational' | 'simplified' | 'standard',
    ])
  )
}

export type Milestone = {
  subject: string
  topic: string
  fromLevel: 'foundational' | 'simplified' | 'standard'
  toLevel: 'foundational' | 'simplified' | 'standard'
  changedAt: string
  direction: 'promoted' | 'demoted'
}

export async function getRecentMilestones(
  supabase: SupabaseClient,
  childId: string
): Promise<Milestone[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from('child_topic_levels')
    .select('subject, topic, language_level, previous_level, changed_at')
    .eq('child_id', childId)
    .not('previous_level', 'is', null)
    .gte('changed_at', thirtyDaysAgo)
    .order('changed_at', { ascending: false })
    .limit(10)
  if (!data) return []
  return data.map((r: {
    subject: string; topic: string
    language_level: string; previous_level: string; changed_at: string
  }) => {
    const to = r.language_level as 'foundational' | 'simplified' | 'standard'
    const from = r.previous_level as 'foundational' | 'simplified' | 'standard'
    const levelOrder = { foundational: 0, simplified: 1, standard: 2 }
    return {
      subject: r.subject,
      topic: r.topic,
      fromLevel: from,
      toLevel: to,
      changedAt: r.changed_at,
      direction: levelOrder[to] > levelOrder[from] ? 'promoted' : 'demoted',
    }
  })
}

export async function getMasteredTopics(supabase: SupabaseClient, childId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from('child_topic_levels')
    .select('topic')
    .eq('child_id', childId)
    .not('mastered_at', 'is', null)
  if (!data) return new Set()
  return new Set(data.map((r: { topic: string }) => r.topic))
}

export async function bumpTopicLevelIfEarned(
  supabase: SupabaseClient,
  childId: string,
  subject: string,
  topicAccuracy: Record<string, { correct: number; total: number }>
): Promise<{ newlyMastered: string[] }> {
  const fetchChain = supabase
    .from('child_topic_levels')
    .select('topic, language_level, sessions_at_level, promotion_ready, mastered_at')
    .eq('child_id', childId)
    .eq('subject', subject)
  const { data: existing } = await fetchChain

  type Level = 'foundational' | 'simplified' | 'standard'
  const levelMap: Record<string, { language_level: Level; sessions_at_level: number; promotion_ready: boolean; mastered_at: string | null }> =
    Object.fromEntries(
      (existing ?? []).map((r: { topic: string; language_level: string; sessions_at_level: number; promotion_ready: boolean; mastered_at: string | null }) => [
        r.topic,
        {
          language_level: r.language_level as Level,
          sessions_at_level: r.sessions_at_level,
          promotion_ready: r.promotion_ready ?? false,
          mastered_at: r.mastered_at ?? null,
        },
      ])
    )

  const newlyMastered: string[] = []

  for (const [topic, { correct, total }] of Object.entries(topicAccuracy)) {
    if (total === 0) continue
    const accuracy = correct / total
    const current = levelMap[topic] ?? { language_level: 'simplified' as Level, sessions_at_level: 0, promotion_ready: false, mastered_at: null }
    const now = new Date().toISOString()

    // Foundational tier: parent-controlled entry and exit — never auto-promote or auto-demote
    if (current.language_level === 'foundational') {
      if (accuracy >= 0.8) {
        const newSessionsAtLevel = current.sessions_at_level + 1
        if (newSessionsAtLevel >= 3) {
          await supabase.from('child_topic_levels').upsert(
            { child_id: childId, subject, topic, language_level: 'foundational', sessions_at_level: newSessionsAtLevel, promotion_ready: true, updated_at: now },
            { onConflict: 'child_id,subject,topic' }
          )
        } else {
          await supabase.from('child_topic_levels').upsert(
            { child_id: childId, subject, topic, language_level: 'foundational', sessions_at_level: newSessionsAtLevel, promotion_ready: false, updated_at: now },
            { onConflict: 'child_id,subject,topic' }
          )
        }
      }
      continue
    }

    if (accuracy >= 0.8) {
      const newSessionsAtLevel = current.sessions_at_level + 1
      if (newSessionsAtLevel >= 2 && current.language_level === 'simplified') {
        // Promote simplified → standard
        await supabase.from('child_topic_levels').upsert(
          { child_id: childId, subject, topic, language_level: 'standard', sessions_at_level: 0, updated_at: now, previous_level: 'simplified', changed_at: now },
          { onConflict: 'child_id,subject,topic' }
        )
      } else if (current.language_level === 'simplified') {
        await supabase.from('child_topic_levels').upsert(
          { child_id: childId, subject, topic, language_level: 'simplified', sessions_at_level: newSessionsAtLevel, updated_at: now },
          { onConflict: 'child_id,subject,topic' }
        )
      } else if (current.language_level === 'standard') {
        // Award mastery badge after 2+ strong sessions at standard level
        const masteredNow = newSessionsAtLevel >= 2 && !current.mastered_at ? now : current.mastered_at
        if (newSessionsAtLevel >= 2 && !current.mastered_at) newlyMastered.push(topic)
        await supabase.from('child_topic_levels').upsert(
          { child_id: childId, subject, topic, language_level: 'standard', sessions_at_level: newSessionsAtLevel, mastered_at: masteredNow, updated_at: now },
          { onConflict: 'child_id,subject,topic' }
        )
      }
    } else if (accuracy < 0.5 && current.language_level === 'standard') {
      // Demote standard → simplified and reset mastery
      await supabase.from('child_topic_levels').upsert(
        { child_id: childId, subject, topic, language_level: 'simplified', sessions_at_level: 0, mastered_at: null, updated_at: now, previous_level: 'standard', changed_at: now },
        { onConflict: 'child_id,subject,topic' }
      )
    }
  }

  return { newlyMastered }
}
