import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Child { id: string; name: string; grade: number; avatar: string | null }
interface Props { child: Child; active: boolean }

export function ChildCard({ child, active }: Props) {
  return (
    <div className="relative">
      <Link
        href={`/dashboard?childId=${child.id}`}
        className={cn(
          'flex flex-col items-center gap-1 rounded-xl border px-4 py-3 text-sm font-medium transition-colors',
          active ? 'border-primary bg-primary/10' : 'border-muted hover:bg-muted/50'
        )}
      >
        <span className="text-2xl">{child.avatar ?? '🧒'}</span>
        <span>{child.name}</span>
        <span className="text-xs text-muted-foreground">Grade {child.grade}</span>
      </Link>
      <Link
        href={`/children/${child.id}/edit`}
        className="absolute top-1 right-1 text-muted-foreground hover:text-foreground p-0.5 rounded"
        title="Edit"
      >
        ✏️
      </Link>
    </div>
  )
}
