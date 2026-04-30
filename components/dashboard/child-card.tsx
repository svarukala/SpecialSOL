import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Child { id: string; name: string; grade: number; avatar: string | null }
interface Props { child: Child; active: boolean }

export function ChildCard({ child, active }: Props) {
  return (
    <div className="flex flex-col gap-1">
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
        className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-0.5"
      >
        ✏️ <span>Edit settings</span>
      </Link>
    </div>
  )
}
