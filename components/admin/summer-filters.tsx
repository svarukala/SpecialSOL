'use client'
import { useRouter, useSearchParams } from 'next/navigation'

export interface SummerGame {
  key: string
  label: string
  emoji: string
  count: number
}

export function SummerFilters({ games, total }: { games: SummerGame[]; total: number }) {
  const router = useRouter()
  const params = useSearchParams()
  const active = params.get('game')

  function toggle(key: string) {
    const next = new URLSearchParams(params.toString())
    if (active === key) next.delete('game')
    else next.set('game', key)
    router.push(`?${next.toString()}`)
  }

  const anyActive = active !== null

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
        ☀️ Summer learning participation
        {anyActive && (
          <button
            onClick={() => router.push('?')}
            className="ml-3 normal-case text-primary hover:underline"
          >
            Clear filter
          </button>
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        {games.map(g => {
          const isActive = active === g.key
          return (
            <button
              key={g.key}
              onClick={() => toggle(g.key)}
              className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
              }`}
            >
              <span>{g.emoji}</span>
              <span>{g.label}</span>
              <span className={`${isActive ? 'text-primary-foreground/70' : 'text-muted-foreground/60'}`}>
                {g.count}
              </span>
            </button>
          )
        })}
        <span className="inline-flex items-center text-xs text-muted-foreground px-1">
          {anyActive ? `showing ${total} of` : `${total} total`}{anyActive ? ` ${total}` : ''} parents
        </span>
      </div>
    </div>
  )
}
