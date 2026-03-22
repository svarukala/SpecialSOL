import { Badge } from '@/components/ui/badge'

interface Session {
  id: string
  subject: string
  mode: string
  score_percent: number | null
  started_at: string
}

function scoreToStars(pct: number) {
  if (pct >= 90) return '⭐⭐⭐⭐⭐'
  if (pct >= 80) return '⭐⭐⭐⭐'
  if (pct >= 70) return '⭐⭐⭐'
  if (pct >= 60) return '⭐⭐'
  return '⭐'
}

export function SessionHistoryTable({ sessions }: { sessions: Session[] }) {
  if (sessions.length === 0) {
    return <p className="text-muted-foreground text-sm">No completed sessions yet.</p>
  }
  return (
    <div className="divide-y rounded-lg border">
      {sessions.slice(0, 10).map((s) => (
        <div key={s.id} className="flex items-center justify-between px-4 py-3 text-sm">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">{s.subject}</Badge>
            <span className="text-muted-foreground capitalize">{s.mode}</span>
          </div>
          <div className="flex items-center gap-3">
            <span>{s.score_percent != null ? scoreToStars(s.score_percent) : '—'}</span>
            <span className="text-muted-foreground">
              {new Date(s.started_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
