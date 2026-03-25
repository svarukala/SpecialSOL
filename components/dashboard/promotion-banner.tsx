'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

type PromotionRow = { child_id: string; subject: string; language_level: string }
type Child = { id: string; name: string; avatar: string }

interface Props {
  children: Child[]
  promotionReady: PromotionRow[]
}

export function PromotionBanner({ children, promotionReady }: Props) {
  // Deduplicate to unique (child_id, subject) pairs — multiple topics per subject count as one
  const pairs = [...new Map(
    promotionReady.map((r) => [`${r.child_id}:${r.subject}`, r])
  ).values()]

  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  async function handleAction(childId: string, subject: string, action: 'confirm' | 'dismiss') {
    await fetch(`/api/children/${childId}/promote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, action }),
    })
    setDismissed((prev) => new Set([...prev, `${childId}:${subject}`]))
  }

  const visible = pairs.filter((p) => !dismissed.has(`${p.child_id}:${p.subject}`))
  if (visible.length === 0) return null

  return (
    <div className="space-y-2">
      {visible.map((row) => {
        const child = children.find((c) => c.id === row.child_id)
        if (!child) return null
        return (
          <Card key={`${row.child_id}:${row.subject}`} className="border-green-200 bg-green-50">
            <CardContent className="flex items-center justify-between py-3 px-4">
              <p className="text-sm">
                <span className="mr-1">{child.avatar}</span>
                <strong>{child.name}</strong> is ready to move up in{' '}
                <strong className="capitalize">{row.subject}</strong> — scoring well at the foundational level.
              </p>
              <div className="flex gap-2 ml-4 shrink-0">
                <Button
                  size="sm"
                  onClick={() => handleAction(row.child_id, row.subject, 'confirm')}
                >
                  Promote
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleAction(row.child_id, row.subject, 'dismiss')}
                >
                  Not yet
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
