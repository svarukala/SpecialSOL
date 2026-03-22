'use client'
import { useState } from 'react'
import { useAccommodations } from '@/lib/accommodations/context'
import { TTSEngine } from '@/lib/tts/types'
import { Button } from '@/components/ui/button'
import { Volume2, VolumeX } from 'lucide-react'

interface Props {
  text: string
  engine: TTSEngine
}

export function TTSButton({ text, engine }: Props) {
  const { state } = useAccommodations()
  const [speaking, setSpeaking] = useState(false)

  if (!state.tts_enabled) return null

  async function handleClick() {
    if (speaking) {
      engine.stop()
      setSpeaking(false)
      return
    }
    setSpeaking(true)
    try {
      await engine.speak(text, { rate: state.tts_speed })
    } finally {
      setSpeaking(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      aria-label={speaking ? 'Stop reading' : 'Read aloud'}
    >
      {speaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      <span className="ml-1">{speaking ? 'Stop' : 'Read Aloud'}</span>
    </Button>
  )
}
