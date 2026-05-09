import { WH_CONFIG } from './types'
import type { WhType } from './types'

interface Props {
  whType: WhType
  size?: 'sm' | 'md'
}

export function WhTypeBadge({ whType, size = 'md' }: Props) {
  const cfg = WH_CONFIG[whType]
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold ${padding} ${cfg.bgClass} ${cfg.textClass}`}>
      <span>{cfg.emoji}</span>
      <span>{cfg.label}</span>
    </span>
  )
}
