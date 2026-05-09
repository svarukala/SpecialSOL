import Link from 'next/link'
import { cn } from '@/lib/utils'

export interface MasteryRow {
  multiplier: number
  attempts: number
  correct: number
  best_speed_ms: number | null
}

interface Props {
  mastery: MasteryRow[]
  childId: string
}

function getMasteryColor(row: MasteryRow | undefined): string {
  if (!row || row.attempts === 0) return 'bg-muted/50 border-border text-foreground'
  const pct = row.correct / row.attempts
  if (pct >= 0.8) return 'bg-green-100 border-green-300 text-green-900'
  return 'bg-yellow-100 border-yellow-300 text-yellow-900'
}

function formatSpeed(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`
}

export function MasteryGrid({ mastery, childId }: Props) {
  const masteryByMultiplier = new Map(mastery.map((r) => [r.multiplier, r]))

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
      {Array.from({ length: 11 }, (_, i) => i + 2).map((n) => {
        const row = masteryByMultiplier.get(n)
        const accuracy = row && row.attempts > 0
          ? Math.round((row.correct / row.attempts) * 100)
          : null

        return (
          <Link
            key={n}
            href={`/times-tables/${n}?childId=${childId}`}
            className={cn(
              'flex flex-col items-center gap-1 rounded-xl border-2 px-3 py-4 text-center transition-colors hover:opacity-80',
              getMasteryColor(row)
            )}
          >
            <span className="text-2xl font-bold">{n}×</span>
            {accuracy !== null ? (
              <span className="text-xs font-medium">{accuracy}%</span>
            ) : (
              <span className="text-xs text-muted-foreground">Not started</span>
            )}
            {row?.best_speed_ms != null && (
              <span className="text-xs text-muted-foreground">
                Best: {formatSpeed(row.best_speed_ms)}
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}
