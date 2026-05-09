'use client'

import { useState, useRef } from 'react'
import { createTTSEngine } from '@/lib/tts/factory'
import type { TTSEngine } from '@/lib/tts/types'

interface StoryReaderClientProps {
  storyText: string
  ttsProvider: 'web_speech' | 'openai' | 'elevenlabs'
  ttsApiKey?: string
}

export function StoryReaderClient({ storyText, ttsProvider, ttsApiKey }: StoryReaderClientProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const engineRef = useRef<TTSEngine | null>(null)

  async function handlePlay() {
    setError(null)
    setIsPlaying(true)
    try {
      if (!engineRef.current) {
        engineRef.current = await createTTSEngine({
          provider: ttsProvider,
          voice: ttsApiKey ? undefined : undefined,
        })
      }
      await engineRef.current.speak(storyText, { rate: 0.9 })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setIsPlaying(false)
    }
  }

  function handlePause() {
    engineRef.current?.stop()
    setIsPlaying(false)
  }

  return (
    <div className="flex items-center gap-3">
      {isPlaying ? (
        <button
          onClick={handlePause}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 h-9 text-sm font-medium transition-colors hover:bg-muted"
        >
          <span>⏸</span>
          <span>Pause</span>
        </button>
      ) : (
        <button
          onClick={handlePlay}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 h-9 text-sm font-medium transition-colors hover:bg-muted"
        >
          <span>🔊</span>
          <span>Read Aloud</span>
        </button>
      )}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}
