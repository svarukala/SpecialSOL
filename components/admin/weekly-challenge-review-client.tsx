'use client'

import { useEffect, useState, useCallback } from 'react'
import type { MysteryCodeContent, SoldleContent } from '@/lib/weekly-challenge/puzzle-types'

type WeeklyPuzzle = {
  id: string
  band: 'elementary' | 'middle'
  puzzle_type: 'mystery_code' | 'soldle'
  week_start_date: string | null
  title: string
  content: MysteryCodeContent | SoldleContent
  status: 'pending' | 'approved' | 'rejected'
  attemptedCount: number
  solvedCount: number
}

export function WeeklyChallengeReviewClient() {
  const [puzzles, setPuzzles] = useState<WeeklyPuzzle[]>([])
  const [showReviewed, setShowReviewed] = useState(false)
  const [weekDrafts, setWeekDrafts] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  // Optimistic status map: overrides server status for immediate UI feedback
  const [optimisticStatuses, setOptimisticStatuses] = useState<Record<string, WeeklyPuzzle['status']>>({})

  const fetchPuzzles = useCallback(async () => {
    const res = await fetch(`/api/admin/weekly-challenge?includeReviewed=${showReviewed}`)
    if (res.ok) {
      const data: WeeklyPuzzle[] = await res.json()
      setPuzzles(data)
      setOptimisticStatuses({})
      setWeekDrafts(Object.fromEntries(data.map(p => [p.id, p.week_start_date ?? ''])))
    }
  }, [showReviewed])

  useEffect(() => { fetchPuzzles() }, [fetchPuzzles])

  async function saveWeekStartDate(id: string, weekStartDate: string) {
    await fetch(`/api/admin/weekly-challenge/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week_start_date: weekStartDate || null }),
    })
  }

  async function handleApprove(id: string) {
    setErrors(prev => ({ ...prev, [id]: '' }))
    if (!weekDrafts[id]) {
      setErrors(prev => ({ ...prev, [id]: 'Set a week start date before approving.' }))
      return
    }
    setOptimisticStatuses(prev => ({ ...prev, [id]: 'approved' }))
    const res = await fetch(`/api/admin/weekly-challenge/${id}/approve`, { method: 'POST' })
    if (!res.ok) {
      setOptimisticStatuses(prev => ({ ...prev, [id]: 'pending' }))
      const body = await res.json()
      setErrors(prev => ({
        ...prev,
        [id]: body.error === 'week_already_scheduled'
          ? 'Another puzzle is already scheduled for this band and week.'
          : 'Approval failed.',
      }))
    }
  }

  async function handleReject(id: string) {
    setOptimisticStatuses(prev => ({ ...prev, [id]: 'rejected' }))
    const res = await fetch(`/api/admin/weekly-challenge/${id}/reject`, { method: 'POST' })
    if (!res.ok) setOptimisticStatuses(prev => ({ ...prev, [id]: 'pending' }))
  }

  async function handleRestore(id: string) {
    setOptimisticStatuses(prev => ({ ...prev, [id]: 'pending' }))
    const res = await fetch(`/api/admin/weekly-challenge/${id}/restore`, { method: 'POST' })
    if (!res.ok) setOptimisticStatuses(prev => ({ ...prev, [id]: 'rejected' }))
  }

  const displayedPuzzles = puzzles.filter(p => {
    const status = optimisticStatuses[p.id] ?? p.status
    return showReviewed || status === 'pending'
  })
  const pendingCount = displayedPuzzles.filter(
    p => (optimisticStatuses[p.id] ?? p.status) === 'pending'
  ).length

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-4">
        <span className="font-semibold text-sm">
          Weekly Challenge Review{' '}
          <span className="bg-amber-500 text-white text-xs rounded-full px-2 py-0.5 ml-1">{pendingCount}</span>
        </span>
        <label className="text-xs text-muted-foreground flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={showReviewed} onChange={e => setShowReviewed(e.target.checked)} />
          Show approved/rejected
        </label>
      </div>

      {displayedPuzzles.map(p => {
        const status = optimisticStatuses[p.id] ?? p.status
        const isRejected = status === 'rejected'
        const isApproved = status === 'approved'

        return (
          <div key={p.id} className={`border rounded-lg p-4 mb-3 ${isRejected ? 'border-red-200 bg-red-50/50 opacity-60' : isApproved ? 'opacity-50 bg-muted/20' : 'bg-white'}`}>
            <div className="flex gap-1.5 flex-wrap mb-3">
              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded">{p.band}</span>
              <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded">{p.puzzle_type}</span>
              {isApproved && <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded">Approved</span>}
              {isRejected && <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded">Rejected</span>}
              {isApproved && (
                <span className="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded">
                  {p.attemptedCount} attempted &middot; {p.solvedCount} solved
                </span>
              )}
            </div>

            <p className="font-medium text-sm mb-2">{p.title}</p>

            {p.puzzle_type === 'mystery_code' ? (
              <ul className="text-xs text-muted-foreground mb-3 list-disc pl-4 space-y-0.5">
                {(p.content as MysteryCodeContent).questions.map((q, i) => (
                  <li key={i}>{q.prompt}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground mb-3">{(p.content as SoldleContent).clue}</p>
            )}

            {isRejected ? (
              <button onClick={() => handleRestore(p.id)} className="px-3 py-1 border rounded text-xs shrink-0 hover:bg-muted">↩ Restore</button>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <label className="text-xs font-medium">Week of</label>
                  <input
                    type="date"
                    value={weekDrafts[p.id] ?? ''}
                    disabled={isApproved}
                    onChange={e => setWeekDrafts(prev => ({ ...prev, [p.id]: e.target.value }))}
                    onBlur={e => saveWeekStartDate(p.id, e.target.value)}
                    className="border rounded px-2 py-1 text-sm bg-background disabled:opacity-50"
                  />
                </div>
                {errors[p.id] && (
                  <p className="text-xs text-red-600 mb-2">{errors[p.id]}</p>
                )}
                <div className="flex gap-2">
                  <button onClick={() => handleApprove(p.id)} disabled={isApproved}
                    className="px-4 py-1.5 bg-green-600 text-white rounded text-xs font-medium disabled:opacity-40">✓ Approve</button>
                  <button onClick={() => handleReject(p.id)} disabled={isApproved}
                    className="px-4 py-1.5 bg-red-600 text-white rounded text-xs font-medium disabled:opacity-40">✗ Reject</button>
                </div>
              </>
            )}
          </div>
        )
      })}

      {displayedPuzzles.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No pending puzzles to review.</p>
      )}
    </div>
  )
}
