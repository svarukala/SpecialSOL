'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export interface PausedSessionInfo {
  id: string
  childId: string
  childName: string
  childAvatar: string | null
  subject: string
  mode: string
  questionCount: number
  currentIndex: number
  pausedAt: string
}

export function ResumeSessionBanner({ sessions }: { sessions: PausedSessionInfo[] }) {
  const [discarded, setDiscarded] = useState<Set<string>>(new Set())

  async function handleDiscard(sessionId: string) {
    await fetch(`/api/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'abandon' }),
    })
    setDiscarded((prev) => new Set([...prev, sessionId]))
  }

  const visible = sessions.filter((s) => !discarded.has(s.id))
  if (visible.length === 0) return null

  return (
    <div className="space-y-2">
      {visible.map((s) => (
        <Card key={s.id} className="border-blue-200 bg-blue-50">
          <CardContent className="flex items-center justify-between py-3 px-4 gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg shrink-0">{s.childAvatar ?? '🧒'}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight">
                  {s.childName} · <span className="capitalize">{s.subject}</span>
                  {s.mode === 'test' && (
                    <span className="ml-1.5 text-xs bg-amber-100 text-amber-800 border border-amber-200 rounded px-1.5 py-0.5">Test</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  Paused at question {s.currentIndex + 1} of {s.questionCount}
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" asChild>
                <Link href={`/practice/${s.childId}?resume=${s.id}`}>Resume</Link>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium h-8 px-3 hover:bg-muted transition-colors">
                  Discard
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Discard this session?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {s.childName}&apos;s paused {s.subject} session will be permanently discarded. Answers already given will be lost.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDiscard(s.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Yes, discard
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
