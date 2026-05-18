'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { getStroke } from 'perfect-freehand'
import { Button } from '@/components/ui/button'

type Point = [number, number, number]   // x, y, pressure
type Tool = 'pen' | 'eraser'

const ERASER_RADIUS = 20
const STROKE_OPTIONS = { size: 6, thinning: 0.5, smoothing: 0.5, streamline: 0.5, simulatePressure: true }

function getSvgPath(points: Point[]): string {
  const outline = getStroke(points, STROKE_OPTIONS)
  if (!outline.length) return ''
  const d = outline.reduce((acc, [x0, y0], i, arr) => {
    const [x1, y1] = arr[(i + 1) % arr.length]
    return `${acc} ${x0},${y0} Q${x0},${y0} ${(x0 + x1) / 2},${(y0 + y1) / 2}`
  }, `M${outline[0][0]},${outline[0][1]} Q`)
  return `${d} Z`
}

interface Props {
  questionId: string
  onClose: () => void
}

export function Scratchpad({ questionId, onClose }: Props) {
  const [strokes, setStrokes] = useState<Point[][]>([])
  const [currentPoints, setCurrentPoints] = useState<Point[]>([])
  const [tool, setTool] = useState<Tool>('pen')
  const [pos, setPos] = useState({ x: 16, y: 300 })

  const isDrawing = useRef(false)
  const dragState = useRef<{ startX: number; startY: number; panelX: number; panelY: number } | null>(null)

  // Position bottom-right on first render
  useEffect(() => {
    setPos({ x: Math.max(16, window.innerWidth - 356), y: Math.max(16, window.innerHeight - 320) })
  }, [])

  // Clear strokes when question changes
  useEffect(() => {
    setStrokes([])
    setCurrentPoints([])
  }, [questionId])

  // ── Drawing ──────────────────────────────────────────────────────────────────
  const handleSvgPointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    isDrawing.current = true
    const rect = e.currentTarget.getBoundingClientRect()
    setCurrentPoints([[e.clientX - rect.left, e.clientY - rect.top, e.pressure || 0.5]])
  }, [])

  const handleSvgPointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawing.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const pressure = e.pressure || 0.5

    if (tool === 'eraser') {
      setStrokes(prev => prev.filter(stroke =>
        !stroke.some(([sx, sy]) => Math.hypot(sx - x, sy - y) < ERASER_RADIUS)
      ))
      return
    }
    setCurrentPoints(prev => [...prev, [x, y, pressure]])
  }, [tool])

  const handleSvgPointerUp = useCallback(() => {
    if (!isDrawing.current) return
    isDrawing.current = false
    setCurrentPoints(prev => {
      if (tool === 'pen' && prev.length > 0) {
        setStrokes(s => [...s, prev])
      }
      return []
    })
  }, [tool])

  // ── Panel drag ───────────────────────────────────────────────────────────────
  const handleDragPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragState.current = { startX: e.clientX, startY: e.clientY, panelX: pos.x, panelY: pos.y }
  }, [pos])

  const handleDragPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current) return
    setPos({
      x: dragState.current.panelX + (e.clientX - dragState.current.startX),
      y: dragState.current.panelY + (e.clientY - dragState.current.startY),
    })
  }, [])

  const handleDragPointerUp = useCallback(() => { dragState.current = null }, [])

  const handleUndo = () => setStrokes(prev => prev.slice(0, -1))
  const handleClear = () => setStrokes([])

  return (
    <div
      className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-xl flex flex-col select-none"
      style={{ left: pos.x, top: pos.y, width: 320, height: 280 }}
      data-testid="scratchpad"
    >
      {/* Drag handle + toolbar */}
      <div
        className="flex items-center gap-1 px-2 py-1.5 bg-gray-100 rounded-t-lg border-b cursor-grab active:cursor-grabbing"
        onPointerDown={handleDragPointerDown}
        onPointerMove={handleDragPointerMove}
        onPointerUp={handleDragPointerUp}
      >
        <span className="text-xs text-gray-500 mr-1 flex-1">✏️ Scratch Pad</span>
        <Button
          size="sm" variant={tool === 'pen' ? 'default' : 'outline'}
          className="h-6 px-2 text-xs"
          aria-label="Pen tool" data-active={String(tool === 'pen')}
          onPointerDown={e => e.stopPropagation()}
          onClick={() => setTool('pen')}
        >Pen</Button>
        <Button
          size="sm" variant={tool === 'eraser' ? 'default' : 'outline'}
          className="h-6 px-2 text-xs"
          aria-label="Eraser tool" data-active={String(tool === 'eraser')}
          onPointerDown={e => e.stopPropagation()}
          onClick={() => setTool('eraser')}
        >Erase</Button>
        <Button
          size="sm" variant="outline" className="h-6 px-2 text-xs"
          aria-label="Undo last stroke"
          disabled={strokes.length === 0}
          onPointerDown={e => e.stopPropagation()}
          onClick={handleUndo}
        >↩</Button>
        <Button
          size="sm" variant="outline" className="h-6 px-2 text-xs"
          aria-label="Clear all strokes"
          disabled={strokes.length === 0}
          onPointerDown={e => e.stopPropagation()}
          onClick={handleClear}
        >Clear</Button>
        <Button
          size="sm" variant="ghost" className="h-6 px-2 text-xs"
          aria-label="Close scratchpad"
          onPointerDown={e => e.stopPropagation()}
          onClick={onClose}
        >✕</Button>
      </div>

      {/* Drawing surface */}
      <svg
        className="flex-1 w-full rounded-b-lg bg-white"
        style={{ touchAction: 'none', cursor: tool === 'eraser' ? 'cell' : 'crosshair' }}
        onPointerDown={handleSvgPointerDown}
        onPointerMove={handleSvgPointerMove}
        onPointerUp={handleSvgPointerUp}
        onPointerLeave={handleSvgPointerUp}
        aria-label="Drawing canvas"
      >
        {strokes.map((pts, i) => (
          <path key={i} d={getSvgPath(pts)} fill="currentColor" className="text-gray-900" />
        ))}
        {currentPoints.length > 0 && tool === 'pen' && (
          <path d={getSvgPath(currentPoints)} fill="currentColor" className="text-gray-900" />
        )}
      </svg>
    </div>
  )
}
