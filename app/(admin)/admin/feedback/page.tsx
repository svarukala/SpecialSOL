import { createAdminClient } from '@/lib/supabase/server'
import { FeedbackTable } from '@/components/admin/feedback-table'

export const metadata = { title: 'Admin — Feedback' }

const CATEGORY_LABELS: Record<string, string> = {
  bug: 'Bug / Technical issue',
  question_error: 'Question error',
  suggestion: 'Suggestion',
  praise: 'Something I love',
  other: 'Other',
  child_confused: 'Child confused',
  child_read_again: 'Child read again',
}

export default async function AdminFeedbackPage() {
  const admin = createAdminClient()

  const { data: feedback } = await admin
    .from('feedback')
    .select('id, submitted_by_type, submitted_by_id, category, message, status, created_at, session_id, question_id')
    .order('created_at', { ascending: false })

  // Get parent emails for display
  const parentIds = [...new Set((feedback ?? []).filter(f => f.submitted_by_type === 'parent').map(f => f.submitted_by_id))]
  const { data: parents } = parentIds.length
    ? await admin.from('parents').select('id, email').in('id', parentIds)
    : { data: [] }
  const parentEmailMap = new Map((parents ?? []).map(p => [p.id, p.email]))

  const rows = (feedback ?? []).map(f => ({
    ...f,
    categoryLabel: CATEGORY_LABELS[f.category] ?? f.category,
    submitterEmail: f.submitted_by_type === 'parent' ? (parentEmailMap.get(f.submitted_by_id) ?? f.submitted_by_id) : 'child',
  }))

  const newCount = rows.filter(r => r.status === 'new').length

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold">Feedback</h1>
        <span className="text-muted-foreground text-sm">({rows.length} total)</span>
        {newCount > 0 && (
          <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-medium">
            {newCount} new
          </span>
        )}
      </div>
      <FeedbackTable rows={rows} />
    </main>
  )
}
