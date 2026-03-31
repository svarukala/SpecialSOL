'use client'
import { useState } from 'react'
import { Info } from 'lucide-react'
import { AccommodationState } from '@/lib/accommodations/types'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'

interface Props {
  value: AccommodationState
  onChange: (next: AccommodationState) => void
}

type BooleanKey = {
  [K in keyof AccommodationState]: AccommodationState[K] extends boolean ? K : never
}[keyof AccommodationState]

const TOOLTIPS: Partial<Record<BooleanKey | 'tts_speed' | 'large_text', string>> = {
  tts_enabled:             'Reads questions aloud using text-to-speech. Helpful for children with reading difficulties or those who benefit from audio support.',
  tts_speed:               'Controls how fast the text-to-speech voice reads. Lower values give more time to process each word.',
  high_contrast:           'Increases color contrast between text and background, making content easier to read.',
  large_text:              'Increases the font size throughout the practice session.',
  dyslexia_font:           'Uses a specially designed font that improves readability for children with dyslexia.',
  bionic_reading:          'Bolds the first letters of each word to guide the eye and speed up reading.',
  reduce_distractions:     'Simplifies the interface by hiding decorative animations and elements. Automatically turns off Positive Reinforcement, since animations can be distracting.',
  extended_time:           'Removes time pressure — no timers or time-based scoring during sessions.',
  hints_enabled:           'Shows hint buttons during questions so children can get step-by-step guidance when stuck.',
  positive_reinforcement:  'Displays encouraging messages and animations after correct answers. Automatically turns off Reduce Distractions, since the two settings conflict.',
}

function InfoTooltip({ field }: { field: keyof typeof TOOLTIPS }) {
  const [open, setOpen] = useState(false)
  const content = TOOLTIPS[field]
  if (!content) return null
  return (
    <TooltipProvider>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger
          type="button"
          aria-label="More information"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center justify-center rounded-full text-muted-foreground/60 hover:text-muted-foreground focus-visible:outline-none"
        >
          <Info className="size-3.5" />
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-[220px] text-xs font-normal leading-relaxed">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function Toggle({ label, field, value, onChange }: {
  label: string
  field: BooleanKey
  value: AccommodationState
  onChange: (next: AccommodationState) => void
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-1.5">
        <Label htmlFor={field}>{label}</Label>
        <InfoTooltip field={field} />
      </div>
      <Switch
        id={field}
        aria-label={label}
        checked={value[field] as boolean}
        onCheckedChange={(checked) => onChange({ ...value, [field]: checked })}
      />
    </div>
  )
}

export function AccommodationSettingsForm({ value, onChange }: Props) {
  return (
    <div className="space-y-1 divide-y">
      <Toggle label="Read Aloud (TTS)" field="tts_enabled" value={value} onChange={onChange} />
      <div className="py-2 space-y-1">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="tts-speed">Speech Speed — {value.tts_speed}x</Label>
          <InfoTooltip field="tts_speed" />
        </div>
        <input
          id="tts-speed"
          type="range"
          min={0.5} max={2.0} step={0.25}
          value={value.tts_speed}
          onChange={(e) => onChange({ ...value, tts_speed: parseFloat(e.target.value) })}
          className="w-full accent-primary"
          aria-label="Speech speed"
        />
      </div>
      <Toggle label="High Contrast" field="high_contrast" value={value} onChange={onChange} />
      <Toggle label="Dyslexia-Friendly Font" field="dyslexia_font" value={value} onChange={onChange} />
      <Toggle label="Bionic Reading" field="bionic_reading" value={value} onChange={onChange} />
      <Toggle label="Reduce Distractions" field="reduce_distractions" value={value} onChange={(next) =>
        onChange(next.reduce_distractions ? { ...next, positive_reinforcement: false } : next)
      } />
      <Toggle label="Extended Time (no pressure)" field="extended_time" value={value} onChange={onChange} />
      <Toggle label="Show Hints" field="hints_enabled" value={value} onChange={onChange} />
      <Toggle label="Positive Reinforcement" field="positive_reinforcement" value={value} onChange={(next) =>
        onChange(next.positive_reinforcement ? { ...next, reduce_distractions: false } : next)
      } />
      <div className="py-2 space-y-1">
        <div className="flex items-center gap-1.5">
          <Label>Large Text</Label>
          <InfoTooltip field="large_text" />
        </div>
        <div className="flex gap-2">
          {([0, 1, 2] as const).map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => onChange({ ...value, large_text: size })}
              className={`px-3 py-1 rounded border text-sm ${value.large_text === size ? 'bg-primary text-primary-foreground' : 'border-input'}`}
              aria-pressed={value.large_text === size}
            >
              {size === 0 ? 'Normal' : size === 1 ? 'Large' : 'Extra Large'}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
