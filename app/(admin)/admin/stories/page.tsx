import { createAdminClient } from '@/lib/supabase/server'
import { toggleStoryPublished } from './actions'
import { AdminStoriesClient } from '@/components/admin/admin-stories-client'

export const metadata = { title: 'Admin — Stories' }

interface Story {
  id: string
  title: string
  grade: number
  topic: string
  word_count: number
  is_published: boolean
  created_at: string
}

export default async function AdminStoriesPage() {
  const admin = createAdminClient()
  const { data: stories } = await admin
    .from('stories')
    .select('id, title, grade, topic, word_count, is_published, created_at')
    .order('created_at', { ascending: false })

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold">Stories</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage published stories and generate new ones with AI.
        </p>
      </div>

      <AdminStoriesClient
        stories={(stories ?? []) as Story[]}
        onTogglePublished={toggleStoryPublished}
      />
    </main>
  )
}
