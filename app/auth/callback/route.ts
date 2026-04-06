import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Handles the OAuth redirect from Supabase after Google sign-in.
// Supabase exchanges the ?code= param for a session, then we redirect to /dashboard.
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  // Only allow relative paths to prevent open redirect attacks
  const rawNext = searchParams.get('next') ?? '/dashboard'
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const isNewUser = data.user?.created_at === data.user?.updated_at ||
        (data.user?.created_at && Date.now() - new Date(data.user.created_at).getTime() < 10_000)
      const dest = next === '/dashboard' && isNewUser ? '/dashboard?welcome=1' : next
      return NextResponse.redirect(`${origin}${dest}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`)
}
