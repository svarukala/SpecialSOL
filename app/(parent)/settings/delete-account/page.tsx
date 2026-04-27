import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { DeleteAccountForm } from './delete-form'

export default async function DeleteAccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <main className="max-w-lg mx-auto p-6 space-y-6">
      <div>
        <Link href="/settings" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Settings
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Delete Account</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Signed in as <span className="font-medium">{user.email}</span>
        </p>
      </div>

      <DeleteAccountForm />
    </main>
  )
}
