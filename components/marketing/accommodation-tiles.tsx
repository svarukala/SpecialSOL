'use client'
import { useState } from 'react'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'

const ACCOMMODATIONS = [
  {
    icon: '🔊',
    label: 'Read Aloud (TTS)',
    tip: 'Questions are read aloud so kids can focus on understanding, not decoding words.',
  },
  {
    icon: '🔤',
    label: 'Dyslexia Font',
    tip: 'Uses a specially designed font that improves readability for children with dyslexia.',
  },
  {
    icon: '👁️',
    label: 'Bionic Reading',
    tip: 'Bolds the first part of each word to guide the eye and reduce reading effort.',
  },
  {
    icon: '🌗',
    label: 'High Contrast',
    tip: 'Increases color contrast between text and background for easier reading.',
  },
  {
    icon: '⏱️',
    label: 'Extended Time',
    tip: 'Removes the countdown timer in test mode — no time pressure, ever.',
  },
  {
    icon: '💡',
    label: 'Step-by-Step Hints',
    tip: 'Up to 3 progressive hints help kids work through a problem without giving away the answer.',
  },
  {
    icon: '🔕',
    label: 'Reduce Distractions',
    tip: 'Hides animations and decorative elements for a calmer, more focused experience.',
  },
  {
    icon: '🎉',
    label: 'Positive Reinforcement',
    tip: 'Encouraging messages and animations after correct answers keep kids motivated.',
  },
]

function AccommodationTile({ icon, label, tip }: { icon: string; label: string; tip: string }) {
  const [open, setOpen] = useState(false)

  return (
    <TooltipProvider>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger
          // Toggle on tap (mobile) while still opening on hover (desktop)
          onClick={() => setOpen((v) => !v)}
          className="flex flex-col items-center gap-2 bg-background rounded-xl border p-4 w-full cursor-pointer hover:border-primary/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={`${label}: ${tip}`}
        >
          <span className="text-2xl">{icon}</span>
          <span className="text-xs font-medium text-center leading-tight">{label}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px] text-center text-xs leading-relaxed">
          {tip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function AccommodationTiles() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {ACCOMMODATIONS.map((a) => (
        <AccommodationTile key={a.label} {...a} />
      ))}
    </div>
  )
}
