'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'solprep_thankyou_dismissed'

export function ThankYouBanner() {
  const [visible, setVisible] = useState(false)

  // Only reveal after mount — avoids SSR/hydration mismatch when reading localStorage
  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true)
  }, [])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="w-full bg-primary/10 border-b border-primary/20">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-start gap-3 sm:items-center">
        <span className="text-xl shrink-0" aria-hidden>💙</span>
        <p className="text-sm text-foreground/80 leading-snug flex-1">
          <span className="font-semibold text-foreground">Thank you for trying SolPrep!</span>{' '}
          Your feedback is making a real difference — every report you send helps us find and fix
          questions, improve accuracy, and make practice better for every child.
          We read every note and act on it.
        </p>
        <button
          onClick={dismiss}
          aria-label="Dismiss message"
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors text-lg leading-none mt-0.5 sm:mt-0"
        >
          ×
        </button>
      </div>
    </div>
  )
}
