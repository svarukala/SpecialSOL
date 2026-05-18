'use client'
import { useState } from 'react'
import { CrocodileComparison } from '@/components/practice/crocodile-comparison'

export default function CrocDemoPage() {
  const [left, setLeft] = useState(7)
  const [right, setRight] = useState(3)
  const [key, setKey] = useState(0)

  function apply(l: number, r: number) {
    setLeft(l)
    setRight(r)
    setKey(k => k + 1)
  }

  return (
    <div className="max-w-lg mx-auto p-8 space-y-8">
      <h1 className="text-2xl font-bold text-center">🐊 Crocodile Number Comparison</h1>
      <p className="text-center text-muted-foreground text-sm">
        The croc always eats the bigger number! Press ▶ to watch.
      </p>

      <CrocodileComparison key={key} left={left} right={right} />

      <div className="border-t pt-6 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Try different numbers</p>
        <div className="flex gap-3 items-center">
          <input
            type="number"
            value={left}
            onChange={e => setLeft(Number(e.target.value))}
            className="w-20 border rounded px-2 py-1 text-center text-lg font-bold"
          />
          <span className="text-muted-foreground">vs</span>
          <input
            type="number"
            value={right}
            onChange={e => setRight(Number(e.target.value))}
            className="w-20 border rounded px-2 py-1 text-center text-lg font-bold"
          />
          <button
            onClick={() => apply(left, right)}
            className="px-4 py-1.5 bg-emerald-600 text-white rounded text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            Go
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {[[7, 3], [2, 9], [5, 5], [12, 8], [1, 10]].map(([l, r]) => (
            <button
              key={`${l}-${r}`}
              onClick={() => apply(l, r)}
              className="px-3 py-1 rounded-full border text-sm hover:bg-muted transition-colors"
            >
              {l} vs {r}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
