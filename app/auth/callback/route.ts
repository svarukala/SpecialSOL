import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Handles the OAuth redirect from Supabase after Google sign-in.
// Supabase exchanges the ?code= param for a session, then we redirect to /dashboard.
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const isNewUser = data.user?.created_at === data.user?.updated_at ||
        (data.user?.created_at && Date.now() - new Date(data.user.created_at).getTime() < 10_000)
      const dest = next === '/dashboard' && isNewUser ? '/dashboard?welcome=1' : `${origin}${next}`
      return NextResponse.redirect(dest.startsWith('http') ? dest : `${origin}${dest}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`)
}
