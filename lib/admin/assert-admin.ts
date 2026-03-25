import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Returns the user id if the current user is an admin.
 * Throws a Response(403) if not authenticated or not admin.
 * Any other error (e.g. DB failure) is re-thrown as-is.
 *
 * Usage in route handlers:
 *   const userIdOrErr = await assertAdmin(supabase).catch(e => e)
 *   if (userIdOrErr instanceof Response) return userIdOrErr
 *   // userIdOrErr is now string (userId)
 */
export async function assertAdmin(supabase: SupabaseClient): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Response(JSON.stringify({ error: 'forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { data: parent } = await supabase
    .from('parents')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!parent?.is_admin) {
    throw new Response(JSON.stringify({ error: 'forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return user.id
}
