'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

const DISMISS_KEY = 'dismissed-announcement-science-grades5-8-may20'

export function AnnouncementBar() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(DISMISS_KEY)) setVisible(true)
  }, [])

  if (!visible) return null

  return (
    <div className="bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center gap-2 px-4 py-2">
      <span>🔬 New: Science for grades 5–8 is ready — <Link href="/dashboard" className="underline underline-offset-2 hover:opacity-80 transition-opacity">start practicing now!</Link></span>
      <button
        onClick={() => { localStorage.setItem(DISMISS_KEY, '1'); setVisible(false) }}
        aria-label="Dismiss announcement"
        className="ml-2 shrink-0 opacity-70 hover:opacity-100 transition-opacity"
      >
        ✕
      </button>
    </div>
  )
}
