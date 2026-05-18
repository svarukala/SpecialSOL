'use client'
import { useState } from 'react'

type Phase = 'idle' | 'turning' | 'chomping' | 'done'
type Winner = 'left' | 'right' | 'equal'

const MAX_COOKIES = 10
const COOKIE_PX = 30
const COOKIE_GAP = 4

// ── Cookie stack ──────────────────────────────────────────────────────────────

function CookieStack({ value, max }: { value: number; max: number }) {
  const count = max === 0 ? 1 : Math.max(1, Math.round((value / max) * MAX_COOKIES))
  const totalH = MAX_COOKIES * (COOKIE_PX + COOKIE_GAP)
  return (
    <div className="flex flex-col items-center">
      <div className="flex flex-col-reverse items-center" style={{ height: totalH, gap: COOKIE_GAP }}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="rounded-full bg-amber-300 border-2 border-amber-500 flex items-center justify-center select-none"
            style={{ width: COOKIE_PX, height: COOKIE_PX, fontSize: 16, lineHeight: 1 }}
          >
            🍪
          </div>
        ))}
      </div>
      <span className="mt-3 text-3xl font-bold text-slate-700 tabular-nums">{value}</span>
    </div>
  )
}

// ── Crocodile SVG — top-down view, snout faces RIGHT ─────────────────────────
//
// viewBox 220×100. Snout is long (~80px) so the open jaw clearly reads as > or <.
// Jaw hinge at (122, 50). Snout tip at (210, 50).
// Both jaws rotate ±36° for a wide, dramatic opening.

function CrocSVG({ mouthOpen }: { mouthOpen: boolean }) {
  const jaw = mouthOpen ? 36 : 0

  return (
    <svg width="176" height="80" viewBox="0 0 220 100" aria-hidden>

      {/* ── Tail ── */}
      <path d="M5,40 Q0,50 5,60 L22,50 Z" fill="#15803d" />

      {/* ── Hind legs ── */}
      <ellipse cx="28" cy="26" rx="14" ry="5" fill="#16a34a" transform="rotate(-35 28 26)" />
      <ellipse cx="28" cy="74" rx="14" ry="5" fill="#16a34a" transform="rotate(35 28 74)" />

      {/* ── Body ── */}
      <ellipse cx="64" cy="50" rx="48" ry="26" fill="#22c55e" />

      {/* ── Front legs ── */}
      <ellipse cx="84" cy="24" rx="14" ry="5" fill="#16a34a" transform="rotate(-20 84 24)" />
      <ellipse cx="84" cy="76" rx="14" ry="5" fill="#16a34a" transform="rotate(20 84 76)" />

      {/* ── Scale ridges ── */}
      {[38, 58, 78].map((x) => (
        <ellipse key={x} cx={x} cy={50} rx={5} ry={11} fill="#16a34a" opacity={0.35} />
      ))}

      {/* ── Head ── */}
      <ellipse cx="108" cy="50" rx="28" ry="26" fill="#22c55e" />

      {/* ── Eyes ── */}
      <circle cx="96"  cy="27" r="12" fill="white" stroke="#166534" strokeWidth="1.5" />
      <circle cx="98"  cy="28" r="7"  fill="#1e293b" />
      <circle cx="100" cy="26" r="2.4" fill="white" />

      <circle cx="96"  cy="73" r="12" fill="white" stroke="#166534" strokeWidth="1.5" />
      <circle cx="98"  cy="72" r="7"  fill="#1e293b" />
      <circle cx="100" cy="70" r="2.4" fill="white" />

      {/* ── Upper jaw — hinge (122,50), opens upward ── */}
      <g style={{
        transformOrigin: '122px 50px',
        transform: `rotate(${-jaw}deg)`,
        transition: 'transform 0.3s ease-out',
      }}>
        {/* Jaw shape: wide snout curving to a rounded tip */}
        <path d="M122,50 L106,34 Q162,12 206,32 L208,50 Z" fill="#22c55e" />
        {/* Teeth hanging down from the inner edge */}
        {[130, 142, 154, 166, 178, 192].map((x) => (
          <polygon key={x} points={`${x},50 ${x + 7},50 ${x + 3.5},60`} fill="#f5e642" stroke="#a16207" strokeWidth="0.8" />
        ))}
        {/* Nostrils at tip */}
        <circle cx="200" cy="26" r="4" fill="#15803d" />
      </g>

      {/* ── Lower jaw — hinge (122,50), opens downward ── */}
      <g style={{
        transformOrigin: '122px 50px',
        transform: `rotate(${jaw}deg)`,
        transition: 'transform 0.3s ease-out',
      }}>
        <path d="M122,50 L106,66 Q162,88 206,68 L208,50 Z" fill="#16a34a" />
        {/* Teeth pointing upward */}
        {[130, 142, 154, 166, 178, 192].map((x) => (
          <polygon key={x} points={`${x},50 ${x + 7},50 ${x + 3.5},40`} fill="#f5e642" stroke="#a16207" strokeWidth="0.8" />
        ))}
        {/* Nostrils at tip */}
        <circle cx="200" cy="74" r="4" fill="#15803d" />
      </g>

    </svg>
  )
}

// ── Crocodile with rotation + shake ─────────────────────────────────────────

interface CrocProps {
  winner: Winner
  phase: Phase
  mouthOpen: boolean
  onPlay: () => void
}

function Crocodile({ winner, phase, mouthOpen, onPlay }: CrocProps) {
  // Croc SVG faces RIGHT. Rotate to choose direction:
  //   idle / equal  →  -90° (pointing UP, neutral)
  //   right wins    →    0° (90° clockwise from up)
  //   left wins     → -180° (90° counterclockwise from up)
  const isShaking = winner === 'equal' && phase === 'turning'
  const deg = (phase === 'idle' || winner === 'equal') ? -90 : winner === 'right' ? 0 : -180

  const rotateStyle: React.CSSProperties = isShaking
    ? { animation: 'crocShake 0.75s ease-in-out forwards' }
    : {
        transform: `rotate(${deg}deg)`,
        transition: phase === 'idle'
          ? 'none'
          : 'transform 0.65s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }

  return (
    <>
      {/* Keyframe injected inline — only one instance renders */}
      <style>{`
        @keyframes crocShake {
          0%   { transform: rotate(-90deg); }
          18%  { transform: rotate(-68deg); }
          36%  { transform: rotate(-112deg); }
          54%  { transform: rotate(-73deg); }
          72%  { transform: rotate(-107deg); }
          88%  { transform: rotate(-83deg); }
          100% { transform: rotate(-90deg); }
        }
      `}</style>

      <div className="flex flex-col items-center gap-3">
        {/*
          Fixed 176×176 square container — the 176×80 SVG displays fine
          in both orientations without causing layout shift.
        */}
        <div style={{ width: 176, height: 176, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={rotateStyle}>
            <CrocSVG mouthOpen={mouthOpen} />
          </div>
        </div>

        {phase === 'idle' && (
          <button
            onClick={onPlay}
            className="w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xl flex items-center justify-center shadow-md transition-all"
            aria-label="Animate crocodile"
          >
            ▶
          </button>
        )}
      </div>
    </>
  )
}

// ── Result ────────────────────────────────────────────────────────────────────

function ResultBanner({ left, right, winner }: { left: number; right: number; winner: Winner }) {
  if (winner === 'equal') {
    return (
      <p className="text-center text-lg font-semibold text-slate-600">
        {left} = {right} — they&apos;re equal! 🤝
      </p>
    )
  }
  const bigger  = winner === 'left' ? left : right
  const smaller = winner === 'left' ? right : left
  const symbol  = winner === 'left' ? '>' : '<'
  return (
    <p className="text-center text-lg font-semibold text-emerald-700">
      {left} {symbol} {right} — the croc eats <strong>{bigger}</strong>!{' '}
      {bigger} is bigger than {smaller} 🐊
    </p>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

interface Props {
  left: number
  right: number
}

export function CrocodileComparison({ left, right }: Props) {
  const [phase, setPhase] = useState<Phase>('idle')

  const winner: Winner = left > right ? 'left' : left < right ? 'right' : 'equal'
  const mouthOpen = winner !== 'equal' && (phase === 'chomping' || phase === 'done')

  function handlePlay() {
    if (phase !== 'idle') return

    if (winner === 'equal') {
      setPhase('turning')                              // triggers shake animation
      setTimeout(() => setPhase('done'), 900)          // show result after shake finishes
      return
    }

    setPhase('turning')
    setTimeout(() => setPhase('chomping'), 720)        // jaw opens after croc has turned
    setTimeout(() => setPhase('done'), 1500)           // settle
  }

  const max = Math.max(left, right)

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="flex items-center gap-6">
        <CookieStack value={left} max={max} />
        <Crocodile winner={winner} phase={phase} mouthOpen={mouthOpen} onPlay={handlePlay} />
        <CookieStack value={right} max={max} />
      </div>

      {phase === 'done' && (
        <div className="space-y-3 text-center">
          <ResultBanner left={left} right={right} winner={winner} />
          <button
            onClick={() => setPhase('idle')}
            className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
          >
            Watch again
          </button>
        </div>
      )}
    </div>
  )
}
