'use client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const CATEGORY_LABELS: Record<string, string> = {
  child_confused: "Didn't understand 🤔",
  question_error: 'Something looks wrong 🔍',
  child_read_again: 'Wanted it read again 🔊',
  other: 'Voice note 🎤',
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-500/10 text-blue-700',
  reviewed: 'bg-yellow-500/10 text-yellow-700',
  resolved: 'bg-green-500/10 text-green-700',
}

interface Props {
  childName: string
  category: string
  questionText: string | null
  subject: string | null
  createdAt: string
  status: string
  signedVoiceUrl: string | null
}

export function ChildFeedbackCard({
  childName,
  category,
  questionText,
  subject,
  createdAt,
  status,
  signedVoiceUrl,
}: Props) {
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold">
              {childName} &mdash; {CATEGORY_LABELS[category] ?? category.replace(/_/g, ' ')}
            </p>
            {questionText && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                &ldquo;{questionText}&rdquo;
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {subject && <span className="capitalize mr-2">{subject}</span>}
              {new Date(createdAt).toLocaleDateString(undefined, {
                month: 'short', day: 'numeric', year: 'numeric',
              })}
            </p>
          </div>
          <Badge className={STATUS_COLORS[status] ?? ''}>{status}</Badge>
        </div>
        {signedVoiceUrl && (
          <audio controls src={signedVoiceUrl} className="w-full h-8 mt-1" />
        )}
      </CardContent>
    </Card>
  )
}
