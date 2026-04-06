import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { fileName } = await req.json()
  // Scope path to the authenticated user so storage RLS can also enforce ownership
  const path = `voice-notes/${user.id}/${Date.now()}-${fileName}`

  const { data, error } = await supabase.storage
    .from('feedback-voice-notes')
    .createSignedUploadUrl(path, { upsert: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ signedUrl: data.signedUrl, path })
}
