'use client'
import { useState, useRef, useEffect } from 'react'
import { getStroke } from 'perfect-freehand'
import { Button } from '@/components/ui/button'

type Point = [number, number, number]   // x, y, pressure
type Tool = 'pen' | 'eraser'

const ERASER_RADIUS = 20
const MIN_W = 240
const MIN_H = 180
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
  const [size, setSize] = useState({ w: 320, h: 280 })

  // toolRef lets window event listeners read the current tool without stale closure
  const toolRef = useRef<Tool>('pen')
  const svgRef = useRef<SVGSVGElement>(null)
  const isDrawing = useRef(false)

  useEffect(() => { toolRef.current = tool }, [tool])

  useEffect(() => {
    setPos({ x: Math.max(16, window.innerWidth - 356), y: Math.max(16, window.innerHeight - 320) })
  }, [])

  useEffect(() => {
    setStrokes([])
    setCurrentPoints([])
  }, [questionId])

  // ── Drawing — window listeners avoid setPointerCapture conflicts ──────────────
  function handleSvgPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (!svgRef.current) return
    e.preventDefault()
    isDrawing.current = true
    const rect = svgRef.current.getBoundingClientRect()
    setCurrentPoints([[e.clientX - rect.left, e.clientY - rect.top, e.pressure || 0.5]])

    const onMove = (ev: PointerEvent) => {
      if (!isDrawing.current || !svgRef.current) return
      const r = svgRef.current.getBoundingClientRect()
      const x = ev.clientX - r.left
      const y = ev.clientY - r.top

      if (toolRef.current === 'eraser') {
        setStrokes(prev => prev.filter(s => !s.some(([sx, sy]) => Math.hypot(sx - x, sy - y) < ERASER_RADIUS)))
        return
      }
      setCurrentPoints(prev => [...prev, [x, y, ev.pressure || 0.5]])
    }

    const onUp = () => {
      isDrawing.current = false
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      setCurrentPoints(prev => {
        if (toolRef.current === 'pen' && prev.length > 0) setStrokes(s => [...s, prev])
        return []
      })
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  // ── Panel drag ───────────────────────────────────────────────────────────────
  function handleDragPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault()
    const start = { sx: e.clientX, sy: e.clientY, px: pos.x, py: pos.y }

    const onMove = (ev: PointerEvent) => setPos({
      x: start.px + (ev.clientX - start.sx),
      y: start.py + (ev.clientY - start.sy),
    })
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  // ── Resize handle ────────────────────────────────────────────────────────────
  function handleResizePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    const start = { sx: e.clientX, sy: e.clientY, sw: size.w, sh: size.h }

    const onMove = (ev: PointerEvent) => setSize({
      w: Math.max(MIN_W, start.sw + (ev.clientX - start.sx)),
      h: Math.max(MIN_H, start.sh + (ev.clientY - start.sy)),
    })
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <div
      className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-xl flex flex-col select-none"
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
      data-testid="scratchpad"
    >
      {/* Header: drag grip and buttons are SIBLINGS so drag capture never intercepts button clicks */}
      <div className="flex items-center bg-gray-100 rounded-t-lg border-b shrink-0">
        <div
          className="flex-1 flex items-center px-2 py-1.5 cursor-grab active:cursor-grabbing min-w-0"
          onPointerDown={handleDragPointerDown}
        >
          <span className="text-xs text-gray-500 truncate">✏️ Scratch Pad</span>
        </div>

        <div className="flex items-center gap-1 px-1 py-1">
          <Button
            size="sm" variant={tool === 'pen' ? 'default' : 'outline'}
            className="h-6 px-2 text-xs"
            aria-label="Pen tool" data-active={String(tool === 'pen')}
            onClick={() => setTool('pen')}
          >Pen</Button>
          <Button
            size="sm" variant={tool === 'eraser' ? 'default' : 'outline'}
            className="h-6 px-2 text-xs"
            aria-label="Eraser tool" data-active={String(tool === 'eraser')}
            onClick={() => setTool('eraser')}
          >Erase</Button>
          <Button
            size="sm" variant="outline" className="h-6 px-2 text-xs"
            aria-label="Undo last stroke"
            disabled={strokes.length === 0}
            onClick={() => setStrokes(prev => prev.slice(0, -1))}
          >↩</Button>
          <Button
            size="sm" variant="outline" className="h-6 px-2 text-xs"
            aria-label="Clear all strokes"
            disabled={strokes.length === 0}
            onClick={() => setStrokes([])}
          >Clear</Button>
          <Button
            size="sm" variant="ghost" className="h-6 w-6 px-0 text-xs"
            aria-label="Close scratchpad"
            onClick={onClose}
          >✕</Button>
        </div>
      </div>

      {/* Drawing surface */}
      <svg
        ref={svgRef}
        className="flex-1 w-full bg-white rounded-b-lg"
        style={{ touchAction: 'none', cursor: tool === 'eraser' ? 'cell' : 'crosshair' }}
        onPointerDown={handleSvgPointerDown}
        aria-label="Drawing canvas"
      >
        {strokes.map((pts, i) => (
          <path key={i} d={getSvgPath(pts)} fill="#111827" />
        ))}
        {currentPoints.length > 0 && tool === 'pen' && (
          <path d={getSvgPath(currentPoints)} fill="#111827" />
        )}
      </svg>

      {/* Resize handle — bottom-right corner triangle */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize rounded-br-lg"
        style={{ background: 'linear-gradient(135deg, transparent 50%, #9ca3af 50%)' }}
        onPointerDown={handleResizePointerDown}
        aria-hidden
      />
    </div>
  )
}
