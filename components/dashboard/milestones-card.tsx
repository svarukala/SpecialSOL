import { Card, CardContent } from '@/components/ui/card'
import type { Milestone } from '@/lib/supabase/queries'

function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return '1 day ago'
  return `${diffDays} days ago`
}

export function MilestonesCard({ milestones }: { milestones: Milestone[] }) {
  if (milestones.length === 0) return null
  return (
    <Card>
      <CardContent className="p-4">
        <p className="font-semibold mb-3">Recent Milestones</p>
        <ul className="space-y-2">
          {milestones.map((m, i) => (
            <li
              key={i}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                m.direction === 'promoted'
                  ? 'bg-green-500/10'
                  : 'bg-yellow-500/10'
              }`}
            >
              <span>
                {m.direction === 'promoted' ? '🎉' : '⚠️'}{' '}
                <strong>{m.topic}</strong>{' '}
                <span className="text-muted-foreground">({m.subject})</span>
                {' '}simplified → standard
              </span>
              <span className="text-muted-foreground ml-4 whitespace-nowrap">
                {formatRelativeTime(m.changedAt)}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
