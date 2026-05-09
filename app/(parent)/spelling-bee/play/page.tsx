import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { decrypt } from '@/lib/encryption'
import { SpellingBeeGameClient } from '@/components/spelling-bee/spelling-bee-game-client'

export default async function SpellingBeePlayPage({
  searchParams,
}: {
  searchParams: Promise<{ grade?: string; childId?: string }>
}) {
  const { grade: gradeParam, childId } = await searchParams
  const grade = parseInt(gradeParam ?? '3', 10)

  if (!childId || isNaN(grade) || grade < 3 || grade > 8) {
    redirect('/spelling-bee')
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: child } = await supabase
    .from('children')
    .select('id')
    .eq('id', childId)
    .eq('parent_id', user.id)
    .single()
  if (!child) redirect('/spelling-bee')

  const { data: wordsRows, error: wordsError } = await supabase
    .from('spelling_words')
    .select('id, word, definition, example_sentence, origin_language, etymology_note')
    .eq('grade', grade)
    .eq('is_active', true)

  if (wordsError || !wordsRows || wordsRows.length === 0) {
    redirect('/spelling-bee')
  }

  const shuffled = [...wordsRows].sort(() => Math.random() - 0.5)
  const selected = shuffled.slice(0, 10)

  const { data: sessionRow, error: sessionError } = await supabase
    .from('spelling_sessions')
    .insert({ child_id: childId, grade })
    .select('id')
    .single()

  if (sessionError || !sessionRow) {
    redirect('/spelling-bee')
  }

  const { data: parent } = await supabase
    .from('parents')
    .select('settings')
    .eq('id', user.id)
    .single()

  const settings = parent?.settings ?? {}
  const secret = process.env.ENCRYPTION_SECRET!
  const provider = (settings.tts_provider as string | undefined) ?? 'web_speech'

  let ttsApiKey: string | undefined
  if (provider === 'openai' && settings.openai_api_key_encrypted) {
    ttsApiKey = await decrypt(settings.openai_api_key_encrypted as string, secret)
  } else if (provider === 'elevenlabs' && settings.elevenlabs_api_key_encrypted) {
    ttsApiKey = await decrypt(settings.elevenlabs_api_key_encrypted as string, secret)
  }

  const words = selected.map((w) => ({
    id: w.id,
    word: w.word,
    definition: w.definition,
    exampleSentence: w.example_sentence,
    originLanguage: w.origin_language,
    etymologyNote: w.etymology_note as string | null,
  }))

  return (
    <main className="max-w-lg mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="text-xl font-bold flex items-center gap-2">🐝 Spelling Bee</h1>
          <p className="text-xs text-muted-foreground">Grade {grade} · 10 words</p>
        </div>
        <a
          href="/spelling-bee"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back
        </a>
      </div>

      <SpellingBeeGameClient
        sessionId={sessionRow.id}
        words={words}
        childId={childId}
        parentSettings={{ ttsProvider: provider, ttsApiKey }}
      />
    </main>
  )
}
