import Link from 'next/link'
import { WH_CONFIG, WH_ORDER } from './types'
import type { ProgressRow, WhType } from './types'
import { WhTypeBadge } from './wh-type-badge'

interface Props {
  progress: ProgressRow[]
  childId: string
}

export function WhProgressGrid({ progress, childId }: Props) {
  const byType = new Map(progress.map((r) => [r.wh_type, r]))

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {WH_ORDER.map((wh: WhType) => {
        const row = byType.get(wh)
        const cfg = WH_CONFIG[wh]
        const isUnlocked = row?.isUnlocked ?? wh === 'what'
        const isMastered = row?.is_mastered ?? false
        const answered = row?.questions_answered ?? 0
        const correct = row?.correct_count ?? 0
        const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : null
        const hasStarted = answered > 0

        return (
          <div
            key={wh}
            className={`rounded-xl border p-4 flex flex-col gap-3 transition-colors ${
              isUnlocked
                ? `${cfg.bgClass} border-transparent`
                : 'bg-muted/30 border-border opacity-60'
            }`}
          >
            <div className="flex items-center justify-between">
              <WhTypeBadge whType={wh} />
              {isMastered && (
                <span className="text-xs font-semibold text-green-700 bg-green-100 rounded-full px-2 py-0.5">
                  Mastered ✓
                </span>
              )}
              {!isUnlocked && (
                <span className="text-sm text-muted-foreground">🔒</span>
              )}
            </div>

            <p className="text-xs text-muted-foreground">{cfg.description}</p>

            {hasStarted && !isMastered && accuracy !== null && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span>{accuracy}% accuracy</span>
                  <span>{correct}/{answered}</span>
                </div>
                <div className="h-1.5 rounded-full bg-black/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-current transition-all"
                    style={{ width: `${accuracy}%` }}
                  />
                </div>
              </div>
            )}

            {isMastered && (
              <div className="text-xs font-medium text-green-700">
                {correct}/{answered} correct
              </div>
            )}

            {isUnlocked && (
              <Link
                href={`/question-quest/${wh}?childId=${childId}`}
                className={`mt-auto inline-flex items-center justify-center rounded-lg px-3 h-8 text-xs font-semibold transition-colors ${cfg.textClass} bg-white/70 hover:bg-white border border-black/10`}
              >
                {hasStarted ? 'Continue' : 'Start'}
              </Link>
            )}
          </div>
        )
      })}
    </div>
  )
}
