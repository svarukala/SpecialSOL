import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PracticeSession } from './practice-session'

export default async function PracticePage({ params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: child } = await supabase
    .from('children')
    .select('*')
    .eq('id', childId)
    .eq('parent_id', user.id)
    .single()
  if (!child) redirect('/dashboard')

  // Get available subjects from questions table for this grade
  const { data: subjectRows } = await supabase
    .from('questions')
    .select('subject')
    .eq('grade', child.grade)
  const availableSubjects = [...new Set((subjectRows ?? []).map((q: { subject: string }) => q.subject))]

  // Get parent TTS settings (server-side only, never expose encrypted keys to client)
  const { data: parent } = await supabase
    .from('parents')
    .select('settings')
    .eq('id', user.id)
    .single()

  // Pass only non-sensitive settings to the client component
  const safeSettings = {
    tts_provider: parent?.settings?.tts_provider ?? 'web_speech',
    tts_voice: parent?.settings?.tts_voice,
    // NOTE: API keys stay server-side; TTS engine for premium providers uses a server route (future enhancement)
  }

  return (
    <PracticeSession
      child={child}
      availableSubjects={availableSubjects}
      parentSettings={safeSettings}
      dashboardHref={`/dashboard?childId=${childId}`}
    />
  )
}
