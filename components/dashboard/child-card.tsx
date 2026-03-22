import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Child { id: string; name: string; grade: number; avatar_emoji: string | null }
interface Props { child: Child; active: boolean }

export function ChildCard({ child, active }: Props) {
  return (
    <Link
      href={`/dashboard?childId=${child.id}`}
      className={cn(
        'flex flex-col items-center gap-1 rounded-xl border px-4 py-3 text-sm font-medium transition-colors',
        active ? 'border-primary bg-primary/10' : 'border-muted hover:bg-muted/50'
      )}
    >
      <span className="text-2xl">{child.avatar_emoji ?? '🧒'}</span>
      <span>{child.name}</span>
      <span className="text-xs text-muted-foreground">Grade {child.grade}</span>
    </Link>
  )
}
