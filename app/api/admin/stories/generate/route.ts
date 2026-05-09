import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/lib/admin/assert-admin'
import { decrypt } from '@/lib/encryption'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const userIdOrErr = await assertAdmin(supabase).catch((e: unknown) => e)
  if (userIdOrErr instanceof Response) return userIdOrErr
  const userId = userIdOrErr as string

  const { grade, topic, title } = await req.json() as {
    grade: number
    topic: string
    title?: string
  }

  if (!grade || !topic) {
    return NextResponse.json({ error: 'grade and topic are required' }, { status: 400 })
  }

  const { data: parent } = await supabase
    .from('parents')
    .select('settings')
    .eq('id', userId)
    .single()

  const settings = parent?.settings as Record<string, string> | null
  let openaiKey: string | undefined

  if (settings?.openai_api_key_encrypted) {
    try {
      openaiKey = await decrypt(settings.openai_api_key_encrypted, process.env.ENCRYPTION_SECRET!)
    } catch {
      // Fall through to env var fallback
    }
  }
  if (!openaiKey) {
    openaiKey = process.env.OPENAI_API_KEY
  }
  if (!openaiKey) {
    return NextResponse.json({ error: 'No OpenAI API key configured' }, { status: 500 })
  }

  const storyTitle = title ?? `A ${topic} story for Grade ${grade}`
  const prompt = `Write an engaging, age-appropriate story for Grade ${grade} students about the topic: "${topic}".
Title: "${storyTitle}"
Length: approximately 250 words (between 220 and 280 words).
The story should:
- Use vocabulary and concepts appropriate for Grade ${grade} students
- Have a clear beginning, middle, and end
- Be genuinely interesting and informative
- Avoid violence, adult themes, or inappropriate content
- Be about real-world topics such as nature, history, science, adventure, culture, or animals

Return ONLY the story text with no title, no introduction, and no explanation. Just the story paragraphs.`

  let content: string
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 600,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const err = await response.json() as { error?: { message?: string } }
      return NextResponse.json({ error: err.error?.message ?? 'OpenAI request failed' }, { status: 500 })
    }

    const data = await response.json() as { choices: Array<{ message: { content: string } }> }
    content = data.choices[0]?.message?.content?.trim() ?? ''
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }

  if (!content) {
    return NextResponse.json({ error: 'Empty response from OpenAI' }, { status: 500 })
  }

  const wordCount = content.split(/\s+/).filter(Boolean).length

  const adminDb = createAdminClient()
  const { data: story, error } = await adminDb
    .from('stories')
    .insert({ title: storyTitle, grade, topic, content, word_count: wordCount, is_published: false })
    .select('id, title, grade, topic, content, word_count')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ story })
}
