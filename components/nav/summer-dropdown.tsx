'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const SUMMER_LINKS = [
  { href: '/spelling-bee',     emoji: '🐝', label: 'Spelling Bee' },
  { href: '/times-tables',     emoji: '✖️',  label: 'Times Tables' },
  { href: '/summer-reading',   emoji: '📚', label: 'Summer Reading' },
  { href: '/question-quest',   emoji: '🎯', label: 'Question Quest' },
  { href: '/crocodile-numbers',emoji: '🐊', label: 'Croc Numbers' },
  { href: '/learn-clock',      emoji: '🕐', label: 'Learn Clock' },
  { href: '/money-match',      emoji: '💰', label: 'Money Match' },
  { href: '/fraction-frenzy',  emoji: '🍕', label: 'Fractions' },
]

export function SummerDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  // Close on navigation
  useEffect(() => { setOpen(false) }, [pathname])

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const isSummerPage = SUMMER_LINKS.some((l) => pathname.startsWith(l.href))

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1 rounded-lg px-2 sm:px-2.5 h-8 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground ${
          isSummerPage || open ? 'bg-primary/10 text-primary' : ''
        }`}
        aria-expanded={open}
      >
        <span>☀️</span>
        <span className="hidden sm:inline">Summer</span>
        <svg
          className={`w-3 h-3 transition-transform hidden sm:block ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border bg-popover shadow-lg z-50 overflow-hidden">
          <div className="grid grid-cols-2 gap-px bg-border p-px">
            {SUMMER_LINKS.map(({ href, emoji, label }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 bg-popover px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted ${
                  pathname.startsWith(href) ? 'text-primary bg-primary/5' : ''
                }`}
              >
                <span>{emoji}</span>
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
