'use client'

import { useEffect, useState, useCallback } from 'react'
import { SOL_CURRICULUM } from '@/lib/curriculum/sol-curriculum'

type Choice = { id: string; text: string; is_correct: boolean }

type PendingQuestion = {
  id: string
  grade: number
  subject: string
  topic: string
  difficulty: number
  question_text: string
  simplified_text: string
  choices: Choice[]
  hint_1: string
  hint_2: string
  hint_3: string
  status: 'pending' | 'approved' | 'rejected'
}

export function GenerateReviewClient() {
  const [grade, setGrade] = useState<number>(3)
  const [subject, setSubject] = useState<'math' | 'reading'>('math')
  const [topicName, setTopicName] = useState<string>('')
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [pendingQuestions, setPendingQuestions] = useState<PendingQuestion[]>([])
  const [showRejected, setShowRejected] = useState(false)
  // Optimistic status map: overrides server status for immediate UI feedback
  const [optimisticStatuses, setOptimisticStatuses] = useState<Record<string, PendingQuestion['status']>>({})

  const topicsForCurrent = SOL_CURRICULUM[grade]?.[subject] ?? []

  // Reset topic when grade or subject changes
  useEffect(() => {
    setTopicName(topicsForCurrent[0]?.name ?? '')
  }, [grade, subject]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchPending = useCallback(async () => {
    const res = await fetch(`/api/admin/pending?includeRejected=${showRejected}`)
    if (res.ok) {
      setPendingQuestions(await res.json())
      setOptimisticStatuses({})
    }
  }, [showRejected])

  useEffect(() => { fetchPending() }, [fetchPending])

  async function handleGenerate() {
    setGenerating(true)
    setGenerateError(null)
    try {
      const res = await fetch('/api/admin/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grade, subject, topic: topicName }),
      })
      if (!res.ok) {
        const body = await res.json()
        setGenerateError(body.error ?? 'Generation failed')
        return
      }
      await fetchPending()
    } finally {
      setGenerating(false)
    }
  }

  async function saveField(id: string, patch: Record<string, unknown>) {
    await fetch(`/api/admin/pending/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
  }

  async function handleApprove(id: string) {
    setOptimisticStatuses(prev => ({ ...prev, [id]: 'approved' }))
    const res = await fetch(`/api/admin/pending/${id}/approve`, { method: 'POST' })
    if (!res.ok) {
      setOptimisticStatuses(prev => ({ ...prev, [id]: 'pending' }))
      const body = await res.json()
      alert(body.error === 'already_published' ? 'Already published in questions table.' : 'Approval failed.')
    }
  }

  async function handleReject(id: string) {
    setOptimisticStatuses(prev => ({ ...prev, [id]: 'rejected' }))
    const res = await fetch(`/api/admin/pending/${id}/reject`, { method: 'POST' })
    if (!res.ok) setOptimisticStatuses(prev => ({ ...prev, [id]: 'pending' }))
  }

  async function handleRestore(id: string) {
    setOptimisticStatuses(prev => ({ ...prev, [id]: 'pending' }))
    const res = await fetch(`/api/admin/pending/${id}/restore`, { method: 'POST' })
    if (!res.ok) setOptimisticStatuses(prev => ({ ...prev, [id]: 'rejected' }))
  }

  const displayedQuestions = pendingQuestions.filter(q => {
    const status = optimisticStatuses[q.id] ?? q.status
    return showRejected || status !== 'rejected'
  })
  const pendingCount = displayedQuestions.filter(
    q => (optimisticStatuses[q.id] ?? q.status) === 'pending'
  ).length

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex justify-between items-baseline mb-4">
        <h1 className="text-lg font-semibold">Generate Questions</h1>
        <a href="/admin/questions" className="text-sm text-muted-foreground hover:underline">→ Published Questions</a>
      </div>

      {/* Generation form */}
      <div className="flex gap-3 items-end p-4 bg-muted/40 border rounded-lg mb-6 flex-wrap">
        <div>
          <label className="text-xs font-medium block mb-1">Grade</label>
          <select value={grade} onChange={e => setGrade(Number(e.target.value))}
            className="border rounded px-2 py-1 text-sm bg-background">
            {[3, 4, 5].map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium block mb-1">Subject</label>
          <select value={subject} onChange={e => setSubject(e.target.value as 'math' | 'reading')}
            className="border rounded px-2 py-1 text-sm bg-background">
            <option value="math">Math</option>
            <option value="reading">Reading</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium block mb-1">Topic</label>
          <select value={topicName} onChange={e => setTopicName(e.target.value)}
            className="border rounded px-2 py-1 text-sm bg-background w-48">
            {topicsForCurrent.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
          </select>
        </div>
        <button onClick={handleGenerate} disabled={generating || !topicName}
          className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm font-medium disabled:opacity-50">
          {generating ? 'Generating…' : '⚡ Generate 6 questions'}
        </button>
      </div>
      {generateError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
          {generateError}
        </div>
      )}

      {/* Queue header */}
      <div className="flex justify-between items-center mb-3">
        <span className="font-semibold text-sm">
          Pending Review{' '}
          <span className="bg-amber-500 text-white text-xs rounded-full px-2 py-0.5 ml-1">{pendingCount}</span>
        </span>
        <label className="text-xs text-muted-foreground flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={showRejected} onChange={e => setShowRejected(e.target.checked)} />
          Show rejected
        </label>
      </div>

      {/* Cards */}
      {displayedQuestions.map(q => {
        const status = optimisticStatuses[q.id] ?? q.status
        const isRejected = status === 'rejected'
        const isApproved = status === 'approved'

        return (
          <div key={q.id} className={`border rounded-lg p-4 mb-3 ${isRejected ? 'border-red-200 bg-red-50/50 opacity-60' : isApproved ? 'opacity-50 bg-muted/20' : 'bg-white'}`}>
            <div className="flex gap-1.5 flex-wrap mb-3">
              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded">Grade {q.grade} · {q.subject}</span>
              <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded">{q.topic}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${q.difficulty === 1 ? 'bg-yellow-100 text-yellow-800' : q.difficulty === 2 ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'}`}>
                Difficulty {q.difficulty}
              </span>
              {isRejected && <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded">Rejected</span>}
            </div>

            {isRejected ? (
              <div className="flex justify-between items-center">
                <p className="text-sm truncate mr-4">{q.question_text}</p>
                <button onClick={() => handleRestore(q.id)} className="px-3 py-1 border rounded text-xs shrink-0 hover:bg-muted">↩ Restore</button>
              </div>
            ) : (
              <>
                <div className="mb-3">
                  <label className="text-xs font-medium block mb-1">Question</label>
                  <textarea defaultValue={q.question_text} onBlur={e => saveField(q.id, { question_text: e.target.value })}
                    className="w-full border rounded px-2 py-1 text-sm bg-background resize-y" rows={2} />
                </div>
                <div className="mb-3">
                  <label className="text-xs font-medium block mb-1">Simplified</label>
                  <textarea defaultValue={q.simplified_text} onBlur={e => saveField(q.id, { simplified_text: e.target.value })}
                    className="w-full border rounded px-2 py-1 text-sm text-muted-foreground bg-background resize-y" rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {q.choices.map((c, i) => (
                    <div key={c.id} className={`border rounded px-3 py-1.5 text-sm flex items-center gap-2 ${c.is_correct ? 'border-green-400 bg-green-50' : ''}`}>
                      <input type="radio" name={`correct-${q.id}`} checked={c.is_correct} onChange={() => {
                        const updated = q.choices.map((ch, j) => ({ ...ch, is_correct: j === i }))
                        saveField(q.id, { choices: updated })
                      }} />
                      <span>{c.id}) {c.text}</span>
                    </div>
                  ))}
                </div>
                <details className="text-xs text-muted-foreground mb-3 cursor-pointer">
                  <summary>Hints</summary>
                  <div className="mt-2 space-y-1 pl-3">
                    {(['hint_1', 'hint_2', 'hint_3'] as const).map((h, i) => (
                      <input key={h} defaultValue={q[h]} onBlur={e => saveField(q.id, { [h]: e.target.value })}
                        placeholder={`Hint ${i + 1}`} className="w-full border rounded px-2 py-0.5 text-xs bg-background" />
                    ))}
                  </div>
                </details>
                <div className="flex gap-2">
                  <button onClick={() => handleApprove(q.id)} disabled={isApproved}
                    className="px-4 py-1.5 bg-green-600 text-white rounded text-xs font-medium disabled:opacity-40">✓ Approve</button>
                  <button onClick={() => handleReject(q.id)}
                    className="px-4 py-1.5 bg-red-600 text-white rounded text-xs font-medium">✗ Reject</button>
                </div>
              </>
            )}
          </div>
        )
      })}

      {displayedQuestions.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No pending questions. Generate some above.</p>
      )}
    </div>
  )
}
