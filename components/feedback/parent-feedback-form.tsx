'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const CATEGORIES = [
  { value: 'bug', label: 'Bug / Technical issue' },
  { value: 'question_error', label: 'Question error / Wrong answer' },
  { value: 'suggestion', label: 'Suggestion or feature request' },
  { value: 'praise', label: 'Something I love! 🌟' },
  { value: 'other', label: 'Other' },
]

interface Props {
  parentId: string
  onSubmitted?: () => void
}

export function ParentFeedbackForm({ parentId, onSubmitted }: Props) {
  const [category, setCategory] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!category) return
    setSubmitting(true)
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submittedByType: 'parent',
        submittedById: parentId,
        category,
        message: message || null,
      }),
    })
    setSubmitting(false)
    setSubmitted(true)
    setCategory('')
    setMessage('')
    onSubmitted?.()
  }

  if (submitted) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-lg font-semibold">Thank you for your feedback! 🙏</p>
          <Button variant="link" onClick={() => setSubmitted(false)}>Send more feedback</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader><CardTitle>Send Feedback</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory} required>
              <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us more..."
              rows={4}
            />
          </div>
          <Button type="submit" disabled={submitting || !category}>
            {submitting ? 'Sending...' : 'Send Feedback'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
