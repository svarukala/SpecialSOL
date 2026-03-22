import { Card, CardContent } from '@/components/ui/card'

interface Props { label: string; value: string | number; icon: string }
export function StatCard({ label, value, icon }: Props) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <div className="text-2xl">{icon}</div>
        <div className="text-2xl font-bold mt-1">{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
      </CardContent>
    </Card>
  )
}
