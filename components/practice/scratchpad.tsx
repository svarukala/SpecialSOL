'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { getStroke } from 'perfect-freehand'

type Point = [number, number, number]   // x, y, pressure
type Tool = 'pen' | 'eraser'

const ERASER_RADIUS = 40
const MIN_W = 240
const MIN_H = 180
const STROKE_OPTIONS = { size: 6, thinning: 0.5, smoothing: 0.5, streamline: 0.5, simulatePressure: true }

function getSvgPath(points: Point[]): string {
  const outline = getStroke(points, STROKE_OPTIONS)
  if (!outline.length) return ''
  // Correct perfect-freehand pattern: M x y Q then ALL control+end pairs chained
  // without repeating Q. A single Q command accepts multiple bezier segments.
  const d: (string | number)[] = ['M', outline[0][0], outline[0][1], 'Q']
  for (let i = 0; i < outline.length; i++) {
    const [x0, y0] = outline[i]
    const [x1, y1] = outline[(i + 1) % outline.length]
    d.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
  }
  d.push('Z')
  return d.join(' ')
}

interface Props {
  questionId: string
  onClose: () => void
}

export function Scratchpad({ questionId, onClose }: Props) {
  const [mounted, setMounted] = useState(false)
  const [strokes, setStrokes] = useState<Point[][]>([])
  const [currentPoints, setCurrentPoints] = useState<Point[]>([])
  const [tool, setTool] = useState<Tool>('pen')
  const [pos, setPos] = useState({ x: 16, y: 300 })
  const [size, setSize] = useState({ w: 320, h: 280 })

  const toolRef = useRef<Tool>('pen')
  const svgRef = useRef<SVGSVGElement>(null)
  const eraserCircleRef = useRef<SVGCircleElement>(null)
  const isDrawing = useRef(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => { toolRef.current = tool }, [tool])

  useEffect(() => {
    setPos({ x: Math.max(16, window.innerWidth - 356), y: Math.max(16, window.innerHeight - 320) })
  }, [])

  useEffect(() => {
    setStrokes([])
    setCurrentPoints([])
  }, [questionId])

  // ── Drawing — setPointerCapture on the SVG is reliable for both mouse and touch
  // This does NOT conflict with the X button because pointer capture is per-pointer-id
  // and only applies to pointers that started their DOWN event on the SVG.
  const handleSvgPointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    isDrawing.current = true
    const rect = e.currentTarget.getBoundingClientRect()
    setCurrentPoints([[e.clientX - rect.left, e.clientY - rect.top, e.pressure || 0.5]])
  }, [])

  const handleSvgPointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    // Clamp to SVG bounds so captured-pointer drift outside the canvas doesn't corrupt coords
    const x = Math.max(0, Math.min(rect.width,  e.clientX - rect.left))
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top))

    // Keep eraser circle synced via direct DOM mutation (no re-render)
    if (eraserCircleRef.current) {
      eraserCircleRef.current.setAttribute('cx', String(x))
      eraserCircleRef.current.setAttribute('cy', String(y))
      eraserCircleRef.current.style.display = toolRef.current === 'eraser' ? 'block' : 'none'
    }

    if (!isDrawing.current) return

    if (toolRef.current === 'eraser') {
      setStrokes(prev => prev.filter(s => !s.some(([sx, sy]) => Math.hypot(sx - x, sy - y) < ERASER_RADIUS)))
      return
    }
    setCurrentPoints(prev => [...prev, [x, y, e.pressure || 0.5]])
  }, [])

  const handleSvgPointerUp = useCallback(() => {
    if (eraserCircleRef.current) eraserCircleRef.current.style.display = 'none'
    if (!isDrawing.current) return
    isDrawing.current = false
    setCurrentPoints(prev => {
      if (toolRef.current === 'pen' && prev.length > 0) setStrokes(s => [...s, prev])
      return []
    })
  }, [])

  // ── Panel drag — window listeners, NO setPointerCapture, so button clicks are never stolen
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

  // ── Resize handle
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

  if (!mounted) return null

  return createPortal(
    <div
      className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-xl flex flex-col"
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
      onClick={e => e.stopPropagation()}
      data-testid="scratchpad"
    >
      {/* Header: drag grip (left) and action buttons (right) are SIBLINGS —
          clicking buttons never reaches the drag div since they are not descendants of it. */}
      <div className="flex items-center bg-gray-100 rounded-t-lg border-b shrink-0 select-none">
        <div
          className="flex-1 flex items-center px-2 py-1.5 cursor-grab active:cursor-grabbing min-w-0"
          onPointerDown={handleDragPointerDown}
        >
          <span className="text-xs text-gray-500 truncate">✏️ Scratch Pad</span>
        </div>

        <div className="flex items-center gap-1 px-1 py-1">
          {([['pen', 'Pen'], ['eraser', 'Erase']] as const).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTool(t)}
              aria-label={`${label} tool`}
              data-active={String(tool === t)}
              className={`h-6 px-2 text-xs rounded border font-medium transition-colors
                ${tool === t
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            >{label}</button>
          ))}
          <button
            onClick={() => setStrokes(prev => prev.slice(0, -1))}
            disabled={strokes.length === 0}
            aria-label="Undo last stroke"
            className="h-6 px-2 text-xs rounded border bg-white text-gray-700 border-gray-300 hover:bg-gray-50 disabled:opacity-40"
          >↩</button>
          <button
            onClick={() => setStrokes([])}
            disabled={strokes.length === 0}
            aria-label="Clear all strokes"
            className="h-6 px-2 text-xs rounded border bg-white text-gray-700 border-gray-300 hover:bg-gray-50 disabled:opacity-40"
          >Clear</button>
          <button
            onClick={(e) => { e.stopPropagation(); onClose() }}
            aria-label="Close scratchpad"
            className="h-6 w-6 text-xs rounded hover:bg-gray-200 text-gray-600 flex items-center justify-center"
          >✕</button>
        </div>
      </div>

      {/* Drawing canvas */}
      <svg
        ref={svgRef}
        className="flex-1 w-full bg-white rounded-b-lg"
        style={{ touchAction: 'none', cursor: tool === 'eraser' ? 'cell' : 'crosshair' }}
        onPointerDown={handleSvgPointerDown}
        onPointerMove={handleSvgPointerMove}
        onPointerUp={handleSvgPointerUp}
        onPointerLeave={handleSvgPointerUp}
        aria-label="Drawing canvas"
      >
        {strokes.map((pts, i) => (
          <path key={i} d={getSvgPath(pts)} fill="#111827" />
        ))}
        {currentPoints.length > 0 && tool === 'pen' && (
          <path d={getSvgPath(currentPoints)} fill="#111827" />
        )}
        <circle
          ref={eraserCircleRef}
          r={ERASER_RADIUS}
          fill="rgba(239,68,68,0.1)"
          stroke="rgba(239,68,68,0.5)"
          strokeWidth="1.5"
          strokeDasharray="5 3"
          style={{ display: 'none', pointerEvents: 'none' }}
        />
      </svg>

      {/* Resize corner */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize rounded-br-lg"
        style={{ background: 'linear-gradient(135deg, transparent 50%, #9ca3af 50%)' }}
        onPointerDown={handleResizePointerDown}
        aria-hidden
      />
    </div>,
    document.body
  )
}
