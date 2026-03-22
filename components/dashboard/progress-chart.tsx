interface TopicAccuracy { topic: string; accuracy: number }

function getColor(accuracy: number) {
  if (accuracy >= 0.80) return 'bg-green-500'
  if (accuracy >= 0.65) return 'bg-yellow-500'
  return 'bg-red-500'
}

export function ProgressChart({ topics }: { topics: TopicAccuracy[] }) {
  if (topics.length === 0) {
    return <p className="text-muted-foreground text-sm">No data yet — complete some sessions to see progress.</p>
  }
  return (
    <div className="space-y-3">
      {topics.map(({ topic, accuracy }) => (
        <div key={topic} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{topic}</span>
            <span className="text-muted-foreground">{Math.round(accuracy * 100)}%</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${getColor(accuracy)}`}
              style={{ width: `${accuracy * 100}%` }}
              role="progressbar"
              aria-valuenow={Math.round(accuracy * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
