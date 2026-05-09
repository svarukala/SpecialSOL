'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function toggleStoryPublished(storyId: string, isPublished: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: parent } = await supabase
    .from('parents')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!parent?.is_admin) throw new Error('Forbidden')

  const { error } = await supabase
    .from('stories')
    .update({ is_published: isPublished })
    .eq('id', storyId)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/stories')
}
