export default function ChallengeLoading() {
  return (
    <main className="max-w-lg mx-auto p-6 space-y-8 animate-pulse">
      {/* Title */}
      <div className="space-y-2">
        <div className="h-7 w-48 rounded bg-muted" />
        <div className="h-4 w-64 rounded bg-muted" />
      </div>

      {/* Child selector row */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[1, 2].map(i => (
          <div key={i} className="h-8 w-24 rounded-lg bg-muted" />
        ))}
      </div>

      {/* Streak line + badges link */}
      <div className="flex items-center justify-between">
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="h-4 w-20 rounded bg-muted" />
      </div>

      {/* Puzzle card */}
      <div className="h-64 rounded-xl border bg-muted/40" />
    </main>
  )
}
