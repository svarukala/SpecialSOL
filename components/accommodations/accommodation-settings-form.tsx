'use client'
import { AccommodationState } from '@/lib/accommodations/types'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'

interface Props {
  value: AccommodationState
  onChange: (next: AccommodationState) => void
}

type BooleanKey = {
  [K in keyof AccommodationState]: AccommodationState[K] extends boolean ? K : never
}[keyof AccommodationState]

function Toggle({ label, field, value, onChange }: {
  label: string
  field: BooleanKey
  value: AccommodationState
  onChange: (next: AccommodationState) => void
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <Label htmlFor={field}>{label}</Label>
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
        <Label>Speech Speed</Label>
        <Slider
          min={0.5} max={2.0} step={0.25}
          value={[value.tts_speed]}
          onValueChange={([v]) => onChange({ ...value, tts_speed: v })}
          aria-label="Speech speed"
        />
        <span className="text-xs text-muted-foreground">{value.tts_speed}x</span>
      </div>
      <Toggle label="Simplified Language" field="simplified_language" value={value} onChange={onChange} />
      <Toggle label="High Contrast" field="high_contrast" value={value} onChange={onChange} />
      <Toggle label="Dyslexia-Friendly Font" field="dyslexia_font" value={value} onChange={onChange} />
      <Toggle label="Reduce Distractions" field="reduce_distractions" value={value} onChange={onChange} />
      <Toggle label="Extended Time (no pressure)" field="extended_time" value={value} onChange={onChange} />
      <Toggle label="Show Hints" field="hints_enabled" value={value} onChange={onChange} />
      <Toggle label="Positive Reinforcement" field="positive_reinforcement" value={value} onChange={onChange} />
      <div className="py-2 space-y-1">
        <Label>Large Text</Label>
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
