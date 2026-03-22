import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { fileName } = await req.json()
  const path = `voice-notes/${Date.now()}-${fileName}`

  const { data, error } = await supabase.storage
    .from('feedback-voice-notes')
    .createSignedUploadUrl(path, { upsert: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ signedUrl: data.signedUrl, path })
}
