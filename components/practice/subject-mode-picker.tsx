'use client'
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const SUBJECT_CONFIG = {
  math: { label: 'Math', emoji: '🔢', description: 'Numbers, shapes, and patterns' },
  reading: { label: 'Reading', emoji: '📚', description: 'Stories, words, and ideas' },
} as const

type Subject = keyof typeof SUBJECT_CONFIG
type Mode = 'practice' | 'test'

interface Props {
  childName: string
  availableSubjects: Subject[]
  onStart: (choice: { subject: Subject; mode: Mode }) => void
}

export function SubjectModePicker({ childName, availableSubjects, onStart }: Props) {
  const [subject, setSubject] = useState<Subject | null>(null)
  const [mode, setMode] = useState<Mode | null>(null)

  return (
    <div className="space-y-8 max-w-md mx-auto p-6">
      <h1 className="text-3xl font-bold text-center">Hi {childName}! 👋</h1>
      <div className="space-y-3">
        <p className="text-center font-medium text-muted-foreground">What do you want to practice?</p>
        <div className="grid grid-cols-2 gap-4">
          {availableSubjects.map((s) => (
            <Card
              key={s}
              onClick={() => setSubject(s)}
              className={`cursor-pointer transition-all ${subject === s ? 'border-primary ring-2 ring-primary' : ''}`}
            >
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-2">{SUBJECT_CONFIG[s].emoji}</div>
                <p className="font-bold">{SUBJECT_CONFIG[s].label}</p>
                <p className="text-xs text-muted-foreground mt-1">{SUBJECT_CONFIG[s].description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      {subject && (
        <div className="space-y-3">
          <p className="text-center font-medium text-muted-foreground">How do you want to practice?</p>
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant={mode === 'practice' ? 'default' : 'outline'}
              onClick={() => setMode('practice')}
              className="h-auto py-4 flex-col"
              aria-label="Practice"
            >
              <span className="text-2xl">🌱</span>
              <span className="font-bold mt-1">Practice</span>
              <span className="text-xs opacity-70">Take your time, try again if wrong</span>
            </Button>
            <Button
              variant={mode === 'test' ? 'default' : 'outline'}
              onClick={() => setMode('test')}
              className="h-auto py-4 flex-col"
              aria-label="Test"
            >
              <span className="text-2xl">📝</span>
              <span className="font-bold mt-1">Test</span>
              <span className="text-xs opacity-70">Like the real SOL — one try each</span>
            </Button>
          </div>
        </div>
      )}
      {subject && mode && (
        <Button size="lg" className="w-full" onClick={() => onStart({ subject, mode })}>
          Let&apos;s Go! 🚀
        </Button>
      )}
    </div>
  )
}
