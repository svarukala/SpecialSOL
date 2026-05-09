import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { GradeFilterTabs } from '@/components/summer-reading/grade-filter-tabs'

export const metadata = { title: 'Summer Reading Library' }

interface Story {
  id: string
  title: string
  grade: number
  topic: string
  word_count: number
}

interface StoryRead {
  story_id: string
}

export default async function SummerReadingPage({
  searchParams,
}: {
  searchParams: Promise<{ childId?: string; grade?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { childId: childIdParam, grade: gradeParam } = await searchParams

  const { data: children } = await supabase
    .from('children')
    .select('id, name')
    .eq('parent_id', user.id)
    .order('created_at')

  if (!children || children.length === 0) {
    return (
      <main className="max-w-3xl mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-bold">Summer Reading Library</h1>
        <p className="text-muted-foreground">Add a child to get started with the reading library.</p>
        <Link
          href="/children/new"
          className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-4 h-9 text-sm font-medium transition-colors hover:bg-primary/80"
        >
          Add a Child
        </Link>
      </main>
    )
  }

  const activeChild = children.find((c) => c.id === childIdParam) ?? children[0]
  const selectedGrade = gradeParam ? parseInt(gradeParam, 10) : null

  let storiesQuery = supabase
    .from('stories')
    .select('id, title, grade, topic, word_count')
    .eq('is_published', true)
    .order('grade', { ascending: true })
    .order('title', { ascending: true })

  if (selectedGrade) {
    storiesQuery = storiesQuery.eq('grade', selectedGrade)
  }

  const [{ data: stories }, { data: reads }] = await Promise.all([
    storiesQuery,
    supabase
      .from('story_reads')
      .select('story_id')
      .eq('child_id', activeChild.id),
  ])

  const readStoryIds = new Set((reads ?? []).map((r: StoryRead) => r.story_id))

  const grades = [3, 4, 5, 6, 7, 8]

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Summer Reading Library</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {readStoryIds.size} {readStoryIds.size === 1 ? 'story' : 'stories'} read by {activeChild.name}
          </p>
        </div>
        {children.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {children.map((child) => (
              <Link
                key={child.id}
                href={`/summer-reading?childId=${child.id}${selectedGrade ? `&grade=${selectedGrade}` : ''}`}
                className={`inline-flex items-center rounded-lg px-3 h-8 text-sm font-medium border transition-colors ${
                  child.id === activeChild.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-muted border-border'
                }`}
              >
                {child.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      <GradeFilterTabs
        grades={grades}
        selectedGrade={selectedGrade}
        childId={activeChild.id}
      />

      {(!stories || stories.length === 0) ? (
        <p className="text-sm text-muted-foreground text-center py-12">
          No stories available{selectedGrade ? ` for Grade ${selectedGrade}` : ''} yet.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(stories as Story[]).map((story) => {
            const isRead = readStoryIds.has(story.id)
            return (
              <div
                key={story.id}
                className="border rounded-xl p-4 bg-background flex flex-col gap-3 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold text-sm leading-snug">{story.title}</h2>
                  {isRead && (
                    <span className="shrink-0 text-xs bg-green-100 text-green-700 border border-green-200 rounded-full px-2 py-0.5 font-medium">
                      ✓ Read
                    </span>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <span className="text-xs bg-blue-100 text-blue-700 rounded px-2 py-0.5 capitalize">
                    Grade {story.grade}
                  </span>
                  <span className="text-xs bg-muted text-muted-foreground rounded px-2 py-0.5 capitalize">
                    {story.topic}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {story.word_count} words
                  </span>
                </div>
                <Link
                  href={`/summer-reading/${story.id}?childId=${activeChild.id}`}
                  className="mt-auto inline-flex items-center justify-center rounded-lg border border-border bg-background px-3 h-8 text-sm font-medium transition-colors hover:bg-muted"
                >
                  {isRead ? 'Read Again' : 'Read'}
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
