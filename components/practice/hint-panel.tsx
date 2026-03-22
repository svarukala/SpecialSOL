'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Lightbulb } from 'lucide-react'

interface Props {
  hints: (string | null)[]
  onHintUsed: (count: number) => void
  enabled: boolean
}

export function HintPanel({ hints, onHintUsed, enabled }: Props) {
  const [revealed, setRevealed] = useState(0)
  const availableHints = hints.filter(Boolean) as string[]

  if (!enabled || availableHints.length === 0) return null

  function revealNextHint() {
    const next = revealed + 1
    setRevealed(next)
    onHintUsed(next)
  }

  return (
    <div className="space-y-2">
      {availableHints.slice(0, revealed).map((hint, i) => (
        <div key={i} className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-sm">
          <Lightbulb className="inline h-4 w-4 mr-1 text-yellow-600" />
          {hint}
        </div>
      ))}
      {revealed < availableHints.length ? (
        <Button variant="outline" size="sm" onClick={revealNextHint}>
          <Lightbulb className="h-4 w-4 mr-1" />
          {revealed === 0 ? 'Show a Hint' : 'Show Next Hint'}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">Ask a grown-up for help! 🙋</p>
      )}
    </div>
  )
}
