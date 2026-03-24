'use client'
import { useState, useRef } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

const CHILD_REASONS = [
  { category: 'child_confused', label: "I don't understand 🤔" },
  { category: 'question_error', label: 'Something looks wrong 🔍' },
  { category: 'child_read_again', label: 'Read it again 🔊' },
] as const

interface Props {
  sessionId: string
  questionId: string
  childId: string
}

export function ChildFeedbackSheet({ sessionId, questionId, childId }: Props) {
  const [open, setOpen] = useState(false)
  const [recording, setRecording] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const mediaRef = useRef<MediaRecorder | null>(null)

  async function submitFeedback(category: string, voiceNoteUrl?: string) {
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submittedByType: 'child',
        submittedById: childId,
        sessionId,
        questionId,
        category,
        voiceNoteUrl,
      }),
    })
    setSubmitted(true)
    setTimeout(() => {
      setOpen(false)
      setSubmitted(false)
    }, 1500)
  }

  async function toggleVoiceNote(category: string) {
    // Second tap: stop recording
    if (recording && mediaRef.current) {
      mediaRef.current.stop()
      return
    }

    // First tap: start recording
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
    const chunks: BlobPart[] = []
    mediaRef.current = recorder
    setRecording(true)

    recorder.ondataavailable = (e) => chunks.push(e.data)
    recorder.onstop = async () => {
      setRecording(false)
      stream.getTracks().forEach((t) => t.stop())
      const blob = new Blob(chunks, { type: 'audio/webm' })
      const { signedUrl, path } = await fetch('/api/feedback/upload-url', {
        method: 'POST',
        body: JSON.stringify({ fileName: 'note.webm' }),
        headers: { 'Content-Type': 'application/json' },
      }).then((r) => r.json())
      await fetch(signedUrl, { method: 'PUT', body: blob })
      await submitFeedback(category, path)
    }

    recorder.start()
    setTimeout(() => recorder.stop(), 30000) // auto-stop at 30s
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleVoiceNote('other')}
              className={recording ? 'text-destructive animate-pulse' : ''}
            >
              {recording ? '🔴 Recording… tap to stop' : '🎤 Tap to record a voice note'}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
