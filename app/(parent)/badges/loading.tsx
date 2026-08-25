export default function BadgesLoading() {
  return (
    <main className="max-w-lg mx-auto p-6 space-y-8 animate-pulse">
      {/* Title */}
      <div className="space-y-2">
        <div className="h-7 w-40 rounded bg-muted" />
        <div className="h-4 w-56 rounded bg-muted" />
      </div>

      {/* Child selector row */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[1, 2].map(i => (
          <div key={i} className="h-8 w-24 rounded-lg bg-muted" />
        ))}
      </div>

      {/* Badge grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="h-24 rounded-xl border bg-muted/40" />
        ))}
      </div>
    </main>
  )
}
