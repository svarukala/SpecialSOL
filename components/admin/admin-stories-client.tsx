'use client'

import { useState, useTransition } from 'react'

interface Story {
  id: string
  title: string
  grade: number
  topic: string
  word_count: number
  is_published: boolean
  created_at: string
}

interface AdminStoriesClientProps {
  stories: Story[]
  onTogglePublished: (storyId: string, isPublished: boolean) => Promise<void>
}

export function AdminStoriesClient({ stories: initialStories, onTogglePublished }: AdminStoriesClientProps) {
  const [stories, setStories] = useState<Story[]>(initialStories)
  const [isPending, startTransition] = useTransition()
  const [generateGrade, setGenerateGrade] = useState(3)
  const [generateTopic, setGenerateTopic] = useState('')
  const [generateTitle, setGenerateTitle] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  function handleToggle(storyId: string, current: boolean) {
    const next = !current
    setStories((prev) => prev.map((s) => s.id === storyId ? { ...s, is_published: next } : s))
    startTransition(async () => {
      try {
        await onTogglePublished(storyId, next)
      } catch {
        setStories((prev) => prev.map((s) => s.id === storyId ? { ...s, is_published: current } : s))
      }
    })
  }

  async function handleGenerate() {
    if (!generateTopic.trim()) return
    setGenerating(true)
    setGenerateError(null)
    try {
      const res = await fetch('/api/admin/stories/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grade: generateGrade,
          topic: generateTopic.trim(),
          title: generateTitle.trim() || undefined,
        }),
      })
      const body = await res.json() as { story?: Story; error?: string }
      if (!res.ok) {
        setGenerateError(body.error ?? 'Generation failed')
        return
      }
      if (body.story) {
        setStories((prev) => [body.story!, ...prev])
        setGenerateTopic('')
        setGenerateTitle('')
      }
    } catch (e) {
      setGenerateError((e as Error).message)
    } finally {
      setGenerating(false)
    }
  }

  const unpublished = stories.filter((s) => !s.is_published)
  const published = stories.filter((s) => s.is_published)

  return (
    <div className="space-y-8">
      <div className="p-4 bg-muted/40 border rounded-xl space-y-3">
        <h2 className="font-semibold text-sm">Generate Story with AI</h2>
        <div className="flex gap-3 items-end flex-wrap">
          <div>
            <label className="text-xs font-medium block mb-1">Grade</label>
            <select
              value={generateGrade}
              onChange={(e) => setGenerateGrade(Number(e.target.value))}
              className="border rounded px-2 py-1 text-sm bg-background"
            >
              {[3, 4, 5, 6, 7, 8].map((g) => (
                <option key={g} value={g}>Grade {g}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">Topic</label>
            <input
              type="text"
              value={generateTopic}
              onChange={(e) => setGenerateTopic(e.target.value)}
              placeholder="e.g. animals, science, Virginia history"
              className="border rounded px-2 py-1 text-sm bg-background w-52"
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">Title (optional)</label>
            <input
              type="text"
              value={generateTitle}
              onChange={(e) => setGenerateTitle(e.target.value)}
              placeholder="Leave blank to auto-generate"
              className="border rounded px-2 py-1 text-sm bg-background w-52"
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating || !generateTopic.trim()}
            className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm font-medium disabled:opacity-50"
          >
            {generating ? 'Generating…' : '⚡ Generate Story'}
          </button>
        </div>
        {generateError && (
          <p className="text-xs text-destructive">{generateError}</p>
        )}
      </div>

      {unpublished.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            Unpublished
            <span className="bg-amber-500 text-white text-xs rounded-full px-2 py-0.5">{unpublished.length}</span>
          </h2>
          <StoryTable stories={unpublished} onToggle={handleToggle} isPending={isPending} />
        </div>
      )}

      <div className="space-y-3">
        <h2 className="font-semibold text-sm">Published ({published.length})</h2>
        {published.length === 0 ? (
          <p className="text-sm text-muted-foreground">No published stories yet.</p>
        ) : (
          <StoryTable stories={published} onToggle={handleToggle} isPending={isPending} />
        )}
      </div>
    </div>
  )
}

function StoryTable({
  stories,
  onToggle,
  isPending,
}: {
  stories: Story[]
  onToggle: (id: string, current: boolean) => void
  isPending: boolean
}) {
  return (
    <div className="border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-4 py-2 font-medium">Title</th>
            <th className="text-left px-4 py-2 font-medium">Grade</th>
            <th className="text-left px-4 py-2 font-medium">Topic</th>
            <th className="text-left px-4 py-2 font-medium">Words</th>
            <th className="text-left px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {stories.map((story) => (
            <tr key={story.id} className="border-t hover:bg-muted/30 transition-colors">
              <td className="px-4 py-2.5 font-medium">{story.title}</td>
              <td className="px-4 py-2.5 text-muted-foreground">Grade {story.grade}</td>
              <td className="px-4 py-2.5 text-muted-foreground capitalize">{story.topic}</td>
              <td className="px-4 py-2.5 text-muted-foreground">{story.word_count}</td>
              <td className="px-4 py-2.5">
                <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                  story.is_published
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {story.is_published ? 'Published' : 'Draft'}
                </span>
              </td>
              <td className="px-4 py-2.5 text-right">
                <button
                  onClick={() => onToggle(story.id, story.is_published)}
                  disabled={isPending}
                  className="text-xs border rounded px-2 py-1 hover:bg-muted transition-colors disabled:opacity-50"
                >
                  {story.is_published ? 'Unpublish' : 'Publish'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
