'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

const DISMISS_KEY = 'dismissed-announcement-practice-tools-may26'

export function AnnouncementBar() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(DISMISS_KEY)) setVisible(true)
  }, [])

  if (!visible) return null

  return (
    <div className="bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center gap-2 px-4 py-2">
      <span>✨ New: <Link href="/blog/new-practice-tools" className="underline underline-offset-2 hover:opacity-80 transition-opacity">Scratchpad, highlighting &amp; croc hint</Link> — try them in your next practice session!</span>
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
