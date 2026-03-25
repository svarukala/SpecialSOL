interface TopicAccuracy { topic: string; accuracy: number }

function getColor(accuracy: number) {
  if (accuracy >= 0.80) return 'bg-green-500'
  if (accuracy >= 0.65) return 'bg-yellow-500'
  return 'bg-red-500'
}

export function ProgressChart({
  topics,
  topicLevels = {},
}: {
  topics: TopicAccuracy[]
  topicLevels?: Record<string, 'simplified' | 'standard'>
}) {
  if (topics.length === 0) {
    return <p className="text-muted-foreground text-sm">No data yet — complete some sessions to see progress.</p>
  }
  return (
    <div className="space-y-3">
      {topics.map(({ topic, accuracy }) => {
        const level = topicLevels[topic]
        return (
          <div key={topic} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium flex items-center gap-2">
                {topic}
                {level === 'standard' && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-green-500 text-white font-semibold">
                    STANDARD
                  </span>
                )}
                {level === 'simplified' && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
                    simplified
                  </span>
                )}
              </span>
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
        )
      })}
    </div>
  )
}
