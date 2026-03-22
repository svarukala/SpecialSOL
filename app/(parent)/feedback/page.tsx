import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ParentFeedbackForm } from '@/components/feedback/parent-feedback-form'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

export default async function FeedbackPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: feedbackList } = await supabase
    .from('feedback')
    .select('*')
    .eq('submitted_by_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const STATUS_COLORS: Record<string, string> = {
    new: 'bg-blue-500/10 text-blue-700',
    reviewed: 'bg-yellow-500/10 text-yellow-700',
    resolved: 'bg-green-500/10 text-green-700',
  }

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">Feedback</h1>
      <ParentFeedbackForm parentId={user.id} />
      {feedbackList && feedbackList.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">Your previous feedback</h2>
          {feedbackList.map((fb) => (
            <Card key={fb.id}>
              <CardContent className="p-4 flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium capitalize">{fb.category.replace(/_/g, ' ')}</p>
                  {fb.message && <p className="text-sm text-muted-foreground mt-1">{fb.message}</p>}
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(fb.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge className={STATUS_COLORS[fb.status] ?? ''}>{fb.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </main>
  )
}
