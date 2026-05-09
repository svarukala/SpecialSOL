'use client'
import { useState } from 'react'

const LANGUAGE_EMOJI: Record<string, string> = {
  Latin: '🏛',
  Greek: '🏺',
  'Old English': '🏰',
  French: '🥐',
  'Old French': '🥐',
  Spanish: '🌮',
  German: '🍺',
  Arabic: '🌙',
  Italian: '🍕',
  Norse: '⚔️',
  Sanskrit: '📿',
}

interface Props {
  originLanguage: string
  etymologyNote?: string | null
}

export function EtymologyBadge({ originLanguage, etymologyNote }: Props) {
  const [expanded, setExpanded] = useState(false)
  const emoji = LANGUAGE_EMOJI[originLanguage] ?? '🌍'

  return (
    <div className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
      >
        <span>{emoji}</span>
        <span>{originLanguage}</span>
        {etymologyNote && (
          <span className="ml-0.5 text-muted-foreground/60">{expanded ? '▲' : '▼'}</span>
        )}
      </button>
      {expanded && etymologyNote && (
        <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2 max-w-xs">
          {etymologyNote}
        </p>
      )}
    </div>
  )
}
