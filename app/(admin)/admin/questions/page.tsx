import { createAdminClient } from '@/lib/supabase/server'
import { PublishedQuestionsClient } from '@/components/admin/published-questions-client'

export default async function QuestionsPage() {
  const adminDb = createAdminClient()
  const { data: questions, count } = await adminDb
    .from('questions')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(0, 19)

  return (
    <PublishedQuestionsClient
      initialQuestions={questions ?? []}
      initialTotal={count ?? 0}
    />
  )
}
