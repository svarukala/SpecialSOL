import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ParentFeedbackForm } from '@/components/feedback/parent-feedback-form'
import { ChildFeedbackCard } from '@/components/feedback/child-feedback-card'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

const PARENT_STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-500/10 text-blue-700',
  reviewed: 'bg-yellow-500/10 text-yellow-700',
  resolved: 'bg-green-500/10 text-green-700',
}

export default async function FeedbackPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // --- Child session feedback ---
  const { data: children } = await supabase
    .from('children')
    .select('id, name')
    .eq('parent_id', user.id)

  const childIds = (children ?? []).map((c) => c.id)
  const childMap = Object.fromEntries((children ?? []).map((c) => [c.id, c.name]))

  const { data: rawChildFeedback } = childIds.length > 0
    ? await supabase
        .from('feedback')
        .select('*, questions(question_text, subject), practice_sessions(subject, mode)')
        .in('submitted_by_id', childIds)
        .order('created_at', { ascending: false })
        .limit(50)
    : { data: [] }

  // Generate short-lived signed URLs for voice notes using service role
  // (anon key cannot sign URLs on a private bucket without per-row storage policies)
  const adminClient = createAdminClient()
  const childFeedback = await Promise.all(
    (rawChildFeedback ?? []).map(async (fb) => {
      if (!fb.voice_note_url) return { ...fb, signedVoiceUrl: null }
      const { data } = await adminClient.storage
        .from('feedback-voice-notes')
        .createSignedUrl(fb.voice_note_url, 3600)
      return { ...fb, signedVoiceUrl: data?.signedUrl ?? null }
    })
  )

  // --- Parent's own app feedback ---
  const { data: parentFeedback } = await supabase
    .from('feedback')
    .select('*')
    .eq('submitted_by_id', user.id)
    .eq('submitted_by_type', 'parent')
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-10">
      <h1 className="text-2xl font-bold">Feedback</h1>

      {/* ── Child session feedback ── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">From your child&apos;s sessions</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Questions your child flagged using the 😕 button during practice.
          </p>
        </div>

        {childFeedback.length === 0 ? (
          <p className="text-sm text-muted-foreground border rounded-lg p-4">
            Nothing flagged yet. When your child taps 😕 during a session it will show up here.
          </p>
        ) : (
          <div className="space-y-3">
            {childFeedback.map((fb) => (
              <ChildFeedbackCard
                key={fb.id}
                childName={childMap[fb.submitted_by_id] ?? 'Child'}
                category={fb.category}
                questionText={fb.questions?.question_text ?? null}
                subject={fb.questions?.subject ?? fb.practice_sessions?.subject ?? null}
                createdAt={fb.created_at}
                status={fb.status}
                signedVoiceUrl={fb.signedVoiceUrl}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Parent feedback to the team ── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Send us feedback about the app</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Report bugs, wrong questions, or share suggestions.
          </p>
        </div>

        <ParentFeedbackForm parentId={user.id} />

        {parentFeedback && parentFeedback.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Your previous feedback</h3>
            {parentFeedback.map((fb) => (
              <Card key={fb.id}>
                <CardContent className="p-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium capitalize">{fb.category.replace(/_/g, ' ')}</p>
                    {fb.message && (
                      <p className="text-sm text-muted-foreground mt-1">{fb.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(fb.created_at).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </p>
                  </div>
                  <Badge className={PARENT_STATUS_COLORS[fb.status] ?? ''}>{fb.status}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
