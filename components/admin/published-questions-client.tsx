'use client'

import { useState } from 'react'
import { SOL_CURRICULUM, SUPPORTED_GRADES } from '@/lib/curriculum/sol-curriculum'
import { sanitizeSvg } from '@/lib/svg/sanitize'

type Choice = { id: string; text: string; is_correct: boolean }

type Question = {
  id: string
  grade: number
  subject: string
  topic: string
  subtopic: string | null
  sol_standard: string | null
  difficulty: number
  question_text: string
  simplified_text: string | null
  choices: Choice[]
  hint_1: string | null
  hint_2: string | null
  hint_3: string | null
  calculator_allowed: boolean
  tier: 'foundational' | 'standard'
  image_svg: string | null
}

type Filters = { grade: string; subject: string; topic: string; tier: string; sort: string }

export function PublishedQuestionsClient({
  initialQuestions,
  initialTotal,
}: {
  initialQuestions: Question[]
  initialTotal: number
}) {
  const [questions, setQuestions] = useState<Question[]>(initialQuestions)
  const [total, setTotal] = useState(initialTotal)
  const [offset, setOffset] = useState(initialQuestions.length)
  const [filters, setFilters] = useState<Filters>({ grade: '', subject: '', topic: '', tier: '', sort: 'newest' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, Record<string, unknown>>>({})
  const [saving, setSaving] = useState(false)

  const topicsForFilter = filters.subject && filters.grade
    ? SOL_CURRICULUM[parseInt(filters.grade)]?.[filters.subject as 'math' | 'reading'] ?? []
    : []

  async function fetchWithFilters(newFilters: Filters, newOffset: number, append = false) {
    const params = new URLSearchParams()
    if (newFilters.grade) params.set('grade', newFilters.grade)
    if (newFilters.subject) params.set('subject', newFilters.subject)
    if (newFilters.topic) params.set('topic', newFilters.topic)
    if (newFilters.tier) params.set('tier', newFilters.tier)
    if (newFilters.sort) params.set('sort', newFilters.sort)
    params.set('offset', String(newOffset))
    params.set('limit', '20')
    const res = await fetch(`/api/admin/questions?${params}`)
    if (!res.ok) return
    const body = await res.json()
    setQuestions(prev => append ? [...prev, ...body.questions] : body.questions)
    setTotal(body.total)
    setOffset(newOffset + body.questions.length)
  }

  function handleFilterChange(key: keyof Filters, value: string) {
    const updated = { ...filters, [key]: value, ...(key === 'subject' ? { topic: '' } : {}) }
    setFilters(updated)
    fetchWithFilters(updated, 0)
  }

  async function handleSave(id: string) {
    setSaving(true)
    const patch = drafts[id] ?? {}
    const res = await fetch(`/api/admin/questions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (res.ok) {
      const updated = await res.json()
      setQuestions(prev => prev.map(q => q.id === id ? updated : q))
      setDrafts(prev => { const n = { ...prev }; delete n[id]; return n })
      setEditingId(null)
    }
    setSaving(false)
  }

  const difficultyColor = (d: number) =>
    d === 1 ? 'bg-yellow-100 text-yellow-800' : d === 2 ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex justify-between items-baseline mb-4">
        <h1 className="text-lg font-semibold">
          Published Questions{' '}
          <span className="text-muted-foreground font-normal text-sm">{total} total</span>
        </h1>
        <a href="/admin/generate" className="text-sm text-muted-foreground hover:underline">← Generate &amp; Review</a>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-end p-4 bg-muted/40 border rounded-lg mb-6 flex-wrap">
        <div>
          <label className="text-xs font-medium block mb-1">Grade</label>
          <select value={filters.grade} onChange={e => handleFilterChange('grade', e.target.value)}
            className="border rounded px-2 py-1 text-sm bg-background">
            <option value="">All</option>
            {SUPPORTED_GRADES.map(g => <option key={g} value={String(g)}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium block mb-1">Subject</label>
          <select value={filters.subject} onChange={e => handleFilterChange('subject', e.target.value)}
            className="border rounded px-2 py-1 text-sm bg-background">
            <option value="">All</option>
            <option value="math">Math</option>
            <option value="reading">Reading</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium block mb-1">Topic</label>
          <select value={filters.topic} onChange={e => handleFilterChange('topic', e.target.value)}
            className="border rounded px-2 py-1 text-sm bg-background w-44"
            disabled={!filters.grade || !filters.subject}>
            <option value="">All</option>
            {topicsForFilter.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium block mb-1">Tier</label>
          <select value={filters.tier} onChange={e => handleFilterChange('tier', e.target.value)}
            className="border rounded px-2 py-1 text-sm bg-background">
            <option value="">All</option>
            <option value="standard">Standard</option>
            <option value="foundational">Foundational</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium block mb-1">Sort</label>
          <select value={filters.sort} onChange={e => handleFilterChange('sort', e.target.value)}
            className="border rounded px-2 py-1 text-sm bg-background">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </div>

      {/* Cards */}
      {questions.map(q => {
        const isEditing = editingId === q.id
        const draft = drafts[q.id] ?? {}
        const isDirty = Object.keys(draft).length > 0

        return (
          <div key={q.id} className="border rounded-lg mb-3 bg-white overflow-hidden">
            {isEditing ? (
              <div className="p-4">
                <div className="flex gap-1.5 flex-wrap mb-3">
                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded">Grade {q.grade} · {q.subject}</span>
                  <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded">{q.topic}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${difficultyColor(q.difficulty)}`}>Difficulty {q.difficulty}</span>
                  {q.sol_standard && <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded">SOL {q.sol_standard}</span>}
                  {q.tier === 'foundational' && <span className="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded">Foundational</span>}
                </div>
                <div className="mb-3">
                  <label className="text-xs font-medium block mb-1">Question</label>
                  <textarea defaultValue={q.question_text}
                    onChange={e => setDrafts(prev => ({ ...prev, [q.id]: { ...prev[q.id], question_text: e.target.value } }))}
                    className="w-full border rounded px-2 py-1 text-sm bg-background resize-y" rows={2} />
                </div>
                <div className="mb-3">
                  <label className="text-xs font-medium block mb-1">Simplified</label>
                  <textarea defaultValue={q.simplified_text ?? ''}
                    onChange={e => setDrafts(prev => ({ ...prev, [q.id]: { ...prev[q.id], simplified_text: e.target.value } }))}
                    className="w-full border rounded px-2 py-1 text-sm text-muted-foreground bg-background resize-y" rows={2} />
                </div>
                <div className="mb-3">
                  <label className="text-xs font-medium block mb-1">Image SVG</label>
                  {(() => {
                    const svgValue = typeof drafts[q.id]?.image_svg === 'string'
                      ? drafts[q.id].image_svg as string
                      : q.image_svg
                    return svgValue ? (
                      <div
                        className="mb-2 border rounded p-2 max-w-xs overflow-hidden"
                        dangerouslySetInnerHTML={{ __html: sanitizeSvg(svgValue) }}
                      />
                    ) : null
                  })()}
                  <textarea defaultValue={q.image_svg ?? ''}
                    onChange={e => setDrafts(prev => ({ ...prev, [q.id]: { ...prev[q.id], image_svg: e.target.value || null } }))}
                    placeholder="Paste SVG markup here, or clear to remove"
                    className="w-full border rounded px-2 py-1 text-sm font-mono bg-background resize-y" rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {(q.choices as Choice[]).map(c => (
                    <div key={c.id} className={`border rounded px-3 py-1.5 text-sm ${c.is_correct ? 'border-green-400 bg-green-50' : ''}`}>
                      {c.is_correct ? '✓ ' : ''}{c.id}) {c.text}
                    </div>
                  ))}
                </div>
                <details className="text-xs text-muted-foreground mb-3">
                  <summary className="cursor-pointer">Hints</summary>
                  <div className="mt-2 space-y-1 pl-3">
                    {(['hint_1', 'hint_2', 'hint_3'] as const).map((h, i) => (
                      <input key={h} defaultValue={q[h] ?? ''}
                        onChange={e => setDrafts(prev => ({ ...prev, [q.id]: { ...prev[q.id], [h]: e.target.value } }))}
                        placeholder={`Hint ${i + 1}`} className="w-full border rounded px-2 py-0.5 text-xs bg-background" />
                    ))}
                  </div>
                </details>
                <div className="flex gap-3 items-center">
                  <button onClick={() => handleSave(q.id)} disabled={!isDirty || saving}
                    className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm font-medium disabled:opacity-40">
                    Save changes
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-sm text-muted-foreground hover:underline">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="px-4 py-3 flex justify-between items-center gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-xs px-2 py-0.5 rounded shrink-0 ${difficultyColor(q.difficulty)}`}>Difficulty {q.difficulty}</span>
                  {q.tier === 'foundational' && (
                    <span className="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded shrink-0">Foundational</span>
                  )}
                  {q.image_svg != null && (
                    <span className="bg-sky-100 text-sky-800 text-xs px-2 py-0.5 rounded shrink-0">[img]</span>
                  )}
                  <span className="text-sm truncate">{q.question_text}</span>
                </div>
                <button onClick={() => setEditingId(q.id)} className="px-3 py-1 border rounded text-xs shrink-0 hover:bg-muted">Edit</button>
              </div>
            )}
          </div>
        )
      })}

      {questions.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No questions match your filters.</p>
      )}

      {offset < total && (
        <div className="text-center mt-4">
          <button onClick={() => fetchWithFilters(filters, offset, true)}
            className="px-6 py-2 border rounded text-sm hover:bg-muted">Load more</button>
        </div>
      )}
    </div>
  )
}
