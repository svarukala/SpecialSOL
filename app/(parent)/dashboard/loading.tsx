export default function DashboardLoading() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6 animate-pulse">
      {/* Child selector row */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        {[1, 2].map(i => (
          <div key={i} className="flex-shrink-0 w-24 h-[88px] rounded-xl bg-muted" />
        ))}
        <div className="flex-shrink-0 w-24 h-[88px] rounded-xl bg-muted/50 border-2 border-dashed border-muted" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 rounded-lg bg-muted" />
        ))}
      </div>

      {/* Chart + weak areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-52 rounded-lg bg-muted" />
        <div className="h-52 rounded-lg bg-muted" />
      </div>

      {/* Session history table */}
      <div className="rounded-lg border overflow-hidden">
        <div className="h-10 bg-muted border-b" />
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-14 bg-muted/40 border-b last:border-0" />
        ))}
      </div>
    </main>
  )
}
