'use client'
import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

const CHILD_REASONS = [
  { category: 'child_confused', label: "I don't understand 🤔" },
  { category: 'too_hard', label: 'Too hard for me 😓' },
  { category: 'too_easy', label: 'Too easy 😴' },
  { category: 'question_error', label: 'Something looks wrong 🔍' },
] as const

interface Props {
  sessionId: string
  questionId: string
  childId: string
}

export function ChildFeedbackSheet({ sessionId, questionId, childId }: Props) {
  const [open, setOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function submitFeedback(category: string) {
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submittedByType: 'child',
        submittedById: childId,
        sessionId,
        questionId,
        category,
      }),
    })
    setSubmitted(true)
    setTimeout(() => {
      setOpen(false)
      setSubmitted(false)
    }, 1500)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="inline-flex items-center justify-center rounded-lg px-2.5 h-7 text-sm transition-colors hover:bg-muted"
        aria-label="I need help with this question"
      >
        😕
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-xl">
        <SheetHeader><SheetTitle>What&apos;s wrong?</SheetTitle></SheetHeader>
        {submitted ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <span className="text-5xl">🎉</span>
            <p className="text-lg font-medium">Thanks for telling us!</p>
          </div>
        ) : (
          <div className="grid gap-3 mt-4">
            {CHILD_REASONS.map(({ category, label }) => (
              <Button
                key={category}
                variant="outline"
                size="lg"
                className="text-lg h-14"
                onClick={() => submitFeedback(category)}
              >
                {label}
              </Button>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
