import { LoginForm } from '@/components/auth/login-form'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      {error === 'oauth' && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-destructive/10 border border-destructive/30 text-destructive text-sm px-4 py-2 rounded-lg">
          Google sign-in failed. Please try again or use email.
        </div>
      )}
      <LoginForm />
    </main>
  )
}
