'use client'

import { useState, useTransition } from 'react'
import type { EngagementRow } from '@/app/(admin)/admin/engagement/page'
import type { TemplateType } from '@/lib/email/templates'

type SegmentKey = TemplateType

const SEGMENT_META: Record<SegmentKey, { label: string; description: string; color: string }> = {
  no_children:     { label: 'No children added',         description: 'Signed up but never created a child profile (3+ days ago)',        color: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
  no_sessions:     { label: 'No sessions yet',            description: 'Has child profiles but never started any session (5+ days ago)',   color: 'bg-orange-50 border-orange-200 text-orange-800' },
  never_completed: { label: 'Never completed a session',  description: 'Started sessions but none were completed — only paused/abandoned', color: 'bg-red-50 border-red-200 text-red-800' },
  single_session:  { label: 'One session, then quiet',    description: 'Completed exactly one session, 7+ days ago',                       color: 'bg-purple-50 border-purple-200 text-purple-800' },
  inactive_14d:    { label: 'Inactive 14–30 days',        description: 'No completed session in 14–30 days',                              color: 'bg-blue-50 border-blue-200 text-blue-800' },
  inactive_30d:    { label: 'Inactive 30+ days',          description: 'No completed session in over 30 days',                            color: 'bg-slate-50 border-slate-200 text-slate-800' },
  paused_session:       { label: 'Paused session pending',     description: 'Has a paused session that hasn\'t been resumed (5+ days)',        color: 'bg-teal-50 border-teal-200 text-teal-800' },
  summer_update_may2025: { label: 'Summer update (May 2025)',   description: 'Broadcast: Science launch + summer activities announcement',        color: 'bg-green-50 border-green-200 text-green-800' },
  weekly_challenge: { label: 'Weekly Challenge',        description: 'Broadcast: notify families with children that a new weekly puzzle is live', color: 'bg-indigo-50 border-indigo-200 text-indigo-800' },
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

function wasNudgedRecently(row: EngagementRow) {
  if (!row.lastNudgeSentAt) return false
  return Date.now() - new Date(row.lastNudgeSentAt).getTime() < SEVEN_DAYS_MS
}

interface Props {
  segments: Record<SegmentKey, EngagementRow[]>
}

export function EngagementSegments({ segments }: Props) {
  const [activeTab, setActiveTab] = useState<SegmentKey>('no_children')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  const [resultMsg, setResultMsg] = useState<string | null>(null)

  const rows = segments[activeTab]
  const eligible = rows.filter(r => !wasNudgedRecently(r))

  const allSelected = eligible.length > 0 && eligible.every(r => selected.has(r.parentId))
  const someSelected = eligible.some(r => selected.has(r.parentId))

  function toggleAll() {
    setSelected(prev => {
      const next = new Set(prev)
      if (allSelected) eligible.forEach(r => next.delete(r.parentId))
      else eligible.forEach(r => next.add(r.parentId))
      return next
    })
  }

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function switchTab(tab: SegmentKey) {
    setActiveTab(tab)
    setSelected(new Set())
    setResultMsg(null)
  }

  function handleSend() {
    const recipients = eligible
      .filter(r => selected.has(r.parentId))
      .map(r => ({
        parentId: r.parentId,
        parentEmail: r.parentEmail,
        childNames: r.childNames,
        lastSessionDate: r.lastSessionDate ?? undefined,
      }))

    if (recipients.length === 0) return

    startTransition(async () => {
      setResultMsg(null)
      const res = await fetch('/api/admin/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: activeTab, recipients }),
      })
      const data = await res.json()
      setResultMsg(`Sent ${data.sent} · Failed ${data.failed}`)
      setSelected(new Set())
    })
  }

  const selectedCount = eligible.filter(r => selected.has(r.parentId)).length

  return (
    <div className="space-y-4">
      {/* Summary badges */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(SEGMENT_META) as SegmentKey[]).map(key => {
          const count = segments[key].length
          const meta = SEGMENT_META[key]
          const isActive = key === activeTab
          return (
            <button
              key={key}
              onClick={() => switchTab(key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                isActive
                  ? `${meta.color} ring-2 ring-current ring-offset-1`
                  : 'bg-muted border-border text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {meta.label}
              <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
                isActive ? 'bg-white/60' : 'bg-background'
              }`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Active segment panel */}
      <div className={`rounded-lg border p-4 space-y-3 ${SEGMENT_META[activeTab].color}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">{SEGMENT_META[activeTab].label}</p>
            <p className="text-xs opacity-75 mt-0.5">{SEGMENT_META[activeTab].description}</p>
          </div>
          {selectedCount > 0 && (
            <button
              onClick={handleSend}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 bg-foreground text-background text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-foreground/80 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Sending…' : `Send nudge to ${selectedCount}`}
            </button>
          )}
        </div>
        {resultMsg && (
          <p className="text-xs font-medium bg-white/50 rounded px-3 py-1.5">{resultMsg}</p>
        )}
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No parents in this segment.</p>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-2.5 w-8">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected && !allSelected }}
                    onChange={toggleAll}
                    className="rounded"
                  />
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Email</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Children</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Sessions</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Last Session</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Joined</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Nudges</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map(row => {
                const recentlyNudged = wasNudgedRecently(row)
                return (
                  <tr
                    key={row.parentId}
                    className={`transition-colors ${recentlyNudged ? 'opacity-40' : 'hover:bg-muted/30'}`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(row.parentId)}
                        onChange={() => toggleOne(row.parentId)}
                        disabled={recentlyNudged}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {row.parentEmail}
                      {recentlyNudged && (
                        <span className="ml-2 text-xs text-muted-foreground">(nudged recently)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.childNames.length === 0
                        ? <span className="text-xs">—</span>
                        : row.childNames.join(', ')
                      }
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {row.completedSessions === 0 ? '—' : `${row.completedSessions} completed`}
                      {row.pausedSessions > 0 && (
                        <span className="ml-1 text-teal-600">· {row.pausedSessions} paused</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {row.lastSessionDate
                        ? new Date(row.lastSessionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : '—'
                      }
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(row.signedUpAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {row.nudgeCount === 0 ? '—' : (
                        <span title={row.lastNudgeSentAt ? `Last: ${new Date(row.lastNudgeSentAt).toLocaleDateString()}` : ''}>
                          {row.nudgeCount}×
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
