'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <button
      onClick={handleSignOut}
      className="inline-flex items-center justify-center gap-1 rounded-lg px-2 sm:px-2.5 h-8 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground"
    >
      <span>🚪</span>
      <span className="hidden sm:inline">Sign Out</span>
    </button>
  )
}
