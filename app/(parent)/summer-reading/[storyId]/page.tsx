import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { decrypt } from '@/lib/encryption'
import { StoryReaderClient } from '@/components/summer-reading/story-reader-client'
import { StoryReflectionForm } from '@/components/summer-reading/story-reflection-form'

export default async function StoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ storyId: string }>
  searchParams: Promise<{ childId?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { storyId } = await params
  const { childId: childIdParam } = await searchParams

  const { data: story } = await supabase
    .from('stories')
    .select('id, title, grade, topic, content, word_count')
    .eq('id', storyId)
    .eq('is_published', true)
    .single()

  if (!story) notFound()

  const { data: children } = await supabase
    .from('children')
    .select('id, name')
    .eq('parent_id', user.id)
    .order('created_at')

  const activeChild = children?.find((c) => c.id === childIdParam) ?? children?.[0]

  const [{ data: existingRead }, { data: parent }] = await Promise.all([
    activeChild
      ? supabase
          .from('story_reads')
          .select('reflection')
          .eq('child_id', activeChild.id)
          .eq('story_id', storyId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('parents')
      .select('settings')
      .eq('id', user.id)
      .single(),
  ])

  const settings = parent?.settings as Record<string, string> | null

  let ttsApiKey: string | undefined
  if (settings?.openai_api_key_encrypted) {
    try {
      ttsApiKey = await decrypt(settings.openai_api_key_encrypted, process.env.ENCRYPTION_SECRET!)
    } catch {
      // Key decryption failed — proceed without BYOK
    }
  }

  const topicLabels: Record<string, string> = {
    animals: '🐾 Animals',
    nature: '🌿 Nature',
    science: '🔬 Science',
    adventure: '⛺ Adventure',
    'Virginia history': '🏛️ Virginia History',
    culture: '🌍 Culture',
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div className="space-y-2">
        <Link
          href={`/summer-reading${activeChild ? `?childId=${activeChild.id}` : ''}`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Library
        </Link>
        <h1 className="text-3xl font-bold leading-tight">{story.title}</h1>
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-3 py-1 font-medium">
            Grade {story.grade}
          </span>
          <span className="text-xs bg-muted text-muted-foreground rounded-full px-3 py-1 capitalize">
            {topicLabels[story.topic] ?? story.topic}
          </span>
          <span className="text-xs text-muted-foreground py-1">
            {story.word_count} words
          </span>
        </div>
      </div>

      <StoryReaderClient
        storyText={story.content}
        ttsProvider={(settings?.tts_provider as 'web_speech' | 'openai' | 'elevenlabs') ?? 'web_speech'}
        ttsApiKey={ttsApiKey}
      />

      <article className="prose prose-lg max-w-none">
        <div className="text-lg leading-relaxed space-y-4">
          {story.content.split('\n\n').map((paragraph: string, i: number) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </article>

      {activeChild && (
        <section className="border rounded-xl p-6 space-y-3 bg-muted/30">
          <h2 className="font-semibold">Reflection</h2>
          <p className="text-sm text-muted-foreground">
            What did you think about this story? Share {activeChild.name}&apos;s thoughts.
          </p>
          <StoryReflectionForm
            storyId={storyId}
            childId={activeChild.id}
            initialReflection={existingRead?.reflection ?? undefined}
          />
        </section>
      )}
    </main>
  )
}
