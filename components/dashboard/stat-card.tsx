import { Card, CardContent } from '@/components/ui/card'

interface Props { label: string; value: string | number; icon: string; sub?: string }
export function StatCard({ label, value, icon, sub }: Props) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <div className="text-2xl">{icon}</div>
        <div className="text-2xl font-bold mt-1">{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
        {sub && <div className="text-xs text-muted-foreground/70 mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  )
}
