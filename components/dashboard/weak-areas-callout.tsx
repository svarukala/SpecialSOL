import { Card, CardContent } from '@/components/ui/card'

interface WeakTopic { topic: string; accuracy: number }
export function WeakAreasCallout({ topics, childName }: { topics: WeakTopic[]; childName: string }) {
  if (topics.length === 0) return null
  return (
    <Card className="border-yellow-500/50 bg-yellow-500/5">
      <CardContent className="p-4">
        <p className="font-semibold">📊 Areas to focus on for {childName}:</p>
        <ul className="mt-2 space-y-1">
          {topics.map(({ topic, accuracy }) => (
            <li key={topic} className="text-sm">
              • <strong>{topic}</strong> — {Math.round(accuracy * 100)}% accuracy this month
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
