'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Row = {
  id: string
  submitterEmail: string
  submitted_by_type: string
  categoryLabel: string
  message: string | null
  status: string
  created_at: string
  session_id: string | null
  question_id: string | null
}

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  reviewed: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  resolved: 'bg-green-500/10 text-green-700 dark:text-green-400',
}

const NEXT_STATUS: Record<string, string> = {
  new: 'reviewed',
  reviewed: 'resolved',
  resolved: 'new',
}

const NEXT_LABEL: Record<string, string> = {
  new: 'Mark reviewed',
  reviewed: 'Mark resolved',
  resolved: 'Reopen',
}

export function FeedbackTable({ rows: initial }: { rows: Row[] }) {
  const [rows, setRows] = useState(initial)
  const [filter, setFilter] = useState<'all' | 'new' | 'reviewed' | 'resolved'>('all')
  const supabase = createClient()

  async function updateStatus(id: string, newStatus: string) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r))
    await supabase.from('feedback').update({ status: newStatus }).eq('id', id)
  }

  const filtered = filter === 'all' ? rows : rows.filter(r => r.status === filter)

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-2 text-sm">
        {(['all', 'new', 'reviewed', 'resolved'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded-full capitalize transition-colors ${
              filter === s
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {s} {s !== 'all' && `(${rows.filter(r => r.status === s).length})`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Date</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">From</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Category</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Message</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map(row => (
              <tr key={row.id} className={`hover:bg-muted/30 transition-colors ${row.status === 'new' ? 'font-medium' : ''}`}>
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground max-w-[140px] truncate" title={row.submitterEmail}>
                  {row.submitterEmail}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {row.categoryLabel}
                </td>
                <td className="px-4 py-3 text-muted-foreground max-w-xs">
                  {row.message ? (
                    <span title={row.message} className="line-clamp-2">{row.message}</span>
                  ) : (
                    <span className="italic text-xs">No message</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block text-xs px-2 py-0.5 rounded-full capitalize font-medium ${STATUS_STYLES[row.status] ?? ''}`}>
                    {row.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => updateStatus(row.id, NEXT_STATUS[row.status])}
                    className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 whitespace-nowrap"
                  >
                    {NEXT_LABEL[row.status]}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            {filter === 'all' ? 'No feedback submitted yet.' : `No ${filter} feedback.`}
          </div>
        )}
      </div>
    </div>
  )
}
