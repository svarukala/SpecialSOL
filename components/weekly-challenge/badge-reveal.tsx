'use client'

import { useEffect } from 'react'
import type { BadgeAward } from '@/lib/weekly-challenge/badges'

interface Props {
  badge: BadgeAward
  onDismiss: () => void
}

async function fireBadgeConfetti() {
  const confetti = (await import('canvas-confetti')).default
  confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } })
}

export function BadgeReveal({ badge, onDismiss }: Props) {
  useEffect(() => {
    fireBadgeConfetti()
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-background rounded-2xl border p-8 max-w-xs w-full text-center space-y-3 shadow-xl">
        <div className="text-6xl">{badge.emoji}</div>
        <p className="text-lg font-bold">Badge earned!</p>
        <p className="text-sm text-muted-foreground">{badge.title}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="mt-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold"
        >
          Nice!
        </button>
      </div>
    </div>
  )
}
