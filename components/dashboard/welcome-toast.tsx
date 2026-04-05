'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export function WelcomeToast({ isNew }: { isNew: boolean }) {
  const [visible, setVisible] = useState(isNew)
  const router = useRouter()

  useEffect(() => {
    if (!isNew) return
    // Strip the ?welcome=1 param from the URL without a reload
    const url = new URL(window.location.href)
    url.searchParams.delete('welcome')
    window.history.replaceState({}, '', url.toString())

    const t = setTimeout(() => setVisible(false), 4000)
    return () => clearTimeout(t)
  }, [isNew])

  if (!visible) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-primary text-primary-foreground px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-in slide-in-from-bottom-4 duration-300">
      <span>🎉</span>
      <span>You&apos;re signed in! Add a child to get started.</span>
      <button onClick={() => setVisible(false)} className="ml-1 opacity-70 hover:opacity-100">✕</button>
    </div>
  )
}
