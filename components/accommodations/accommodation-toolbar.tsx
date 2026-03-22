'use client'
import { useAccommodations } from '@/lib/accommodations/context'
import { TTSButton } from './tts-button'
import { TTSEngine } from '@/lib/tts/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface Props {
  engine: TTSEngine
  questionText: string
  progress: { current: number; total: number }
}

export function AccommodationToolbar({ engine, questionText, progress }: Props) {
  const { state, update } = useAccommodations()
  const percent = Math.round((progress.current / progress.total) * 100)

  return (
    <div className={`flex items-center gap-2 flex-wrap py-2 ${state.reduce_distractions ? 'justify-end' : 'justify-between'}`}>
      <div className="flex items-center gap-2">
        <TTSButton text={questionText} engine={engine} />
        {!state.reduce_distractions && (
          <>
            <Button
              variant={state.high_contrast ? 'default' : 'outline'}
              size="sm"
              onClick={() => update({ high_contrast: !state.high_contrast })}
              aria-label="Toggle high contrast"
            >
              🌓
            </Button>
            <Button
              variant={state.dyslexia_font ? 'default' : 'outline'}
              size="sm"
              onClick={() => update({ dyslexia_font: !state.dyslexia_font })}
              aria-label="Toggle dyslexia font"
            >
              Aa
            </Button>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={state.large_text === 0}
                onClick={() => update({ large_text: (state.large_text - 1) as 0 | 1 | 2 })}
                aria-label="Decrease text size"
              >
                A-
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={state.large_text === 2}
                onClick={() => update({ large_text: (state.large_text + 1) as 0 | 1 | 2 })}
                aria-label="Increase text size"
              >
                A+
              </Button>
            </div>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline">{progress.current} / {progress.total}</Badge>
        <Progress value={percent} className="w-20 h-2" />
      </div>
    </div>
  )
}
