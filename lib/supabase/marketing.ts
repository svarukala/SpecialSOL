// lib/supabase/marketing.ts
//
// Read-only helpers for public marketing pages (homepage, per-grade SEO pages).
// These pull live, approved questions straight from the `questions` table via the
// admin client so anonymous visitors can see real content before signing up.

import { createAdminClient } from '@/lib/supabase/server'
import type { ChoiceOption } from '@/lib/practice/question-types'

export interface SampleQuestion {
  id: string
  grade: number
  subject: string
  topic: string
  question_text: string
  choices: ChoiceOption[]
}

/** Question text that depends on an un-shown passage/image — unfit for a standalone card. */
const PASSAGE_DEPENDENT =
  /\b(passage|paragraph|the author|according to|the text|the story|the poem|the article|the selection|the excerpt|read the|the diagram|the picture|shown above|the chart)\b/i

/**
 * Fetch a small set of real, self-contained multiple-choice VDOE released questions
 * for display on marketing pages. Filters out passage/image-dependent items so each
 * card makes sense on its own, then picks a shuffled, deduped-by-topic sample.
 */
export async function getSampleQuestions(
  opts: { grade?: number; subject?: string; limit?: number } = {}
): Promise<SampleQuestion[]> {
  const { grade, subject, limit = 3 } = opts
  const db = createAdminClient()

  let query = db
    .from('questions')
    .select('id, grade, subject, topic, question_text, choices')
    .eq('answer_type', 'multiple_choice')
    .eq('needs_image', false)
    .eq('tier', 'standard')
    .eq('source', 'doe_released')

  if (grade) query = query.eq('grade', grade)
  if (subject) query = query.eq('subject', subject)

  // Pull a generous pool so we can filter + diversify in memory.
  const { data, error } = await query.limit(limit * 25)
  if (error || !data) return []

  const clean = (data as SampleQuestion[]).filter((q) => {
    if (!q.question_text || q.question_text.length > 180) return false
    if (PASSAGE_DEPENDENT.test(q.question_text)) return false
    if (!Array.isArray(q.choices) || q.choices.length < 2) return false
    return q.choices.some((c) => c.is_correct)
  })

  // Shuffle, then prefer one-per-(subject,topic) for variety.
  const shuffled = clean.sort(() => Math.random() - 0.5)
  const seen = new Set<string>()
  const diverse: SampleQuestion[] = []
  for (const q of shuffled) {
    const key = `${q.subject}:${q.topic}`
    if (seen.has(key)) continue
    seen.add(key)
    diverse.push(q)
    if (diverse.length === limit) break
  }
  // Top up from the remaining pool if topic diversity didn't fill the quota.
  if (diverse.length < limit) {
    for (const q of shuffled) {
      if (diverse.includes(q)) continue
      diverse.push(q)
      if (diverse.length === limit) break
    }
  }
  return diverse
}

export interface GradeStats {
  total: number
  bySubject: { subject: string; count: number }[]
}

/** Live question counts for a grade, overall and per subject. */
export async function getGradeStats(grade: number): Promise<GradeStats> {
  const db = createAdminClient()
  const subjects = ['math', 'reading', 'science'] as const

  const [{ count: total }, ...perSubject] = await Promise.all([
    db.from('questions').select('*', { count: 'exact', head: true }).eq('grade', grade),
    ...subjects.map((s) =>
      db.from('questions').select('*', { count: 'exact', head: true }).eq('grade', grade).eq('subject', s)
    ),
  ])

  const bySubject = subjects
    .map((subject, i) => ({ subject, count: perSubject[i].count ?? 0 }))
    .filter((s) => s.count > 0)

  return { total: total ?? 0, bySubject }
}
