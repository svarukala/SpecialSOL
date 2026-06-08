'use client'
import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [active, setActive] = useState(false)
  const [width, setWidth] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevKey = useRef(`${pathname}?${searchParams.toString()}`)

  // Start the bar when any internal link is clicked
  useEffect(() => {
    function onLinkClick(e: MouseEvent) {
      const anchor = (e.target as Element).closest('a')
      if (!anchor) return
      const href = anchor.getAttribute('href')
      // Skip external, hash-only, or mailto links
      if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto')) return
      // Skip if already on that page
      const targetPath = href.split('?')[0]
      if (targetPath === window.location.pathname && !href.includes('?')) return
      setActive(true)
      setWidth(10)
    }
    document.addEventListener('click', onLinkClick)
    return () => document.removeEventListener('click', onLinkClick)
  }, [])

  // Crawl toward 80% while navigation is pending
  useEffect(() => {
    if (!active) return
    intervalRef.current = setInterval(() => {
      setWidth(w => w + (80 - w) * 0.08)
    }, 100)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [active])

  // Complete when route changes
  useEffect(() => {
    const key = `${pathname}?${searchParams.toString()}`
    if (active && key !== prevKey.current) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setWidth(100)
      const t = setTimeout(() => { setActive(false); setWidth(0) }, 300)
      return () => clearTimeout(t)
    }
    prevKey.current = key
  }, [pathname, searchParams, active])

  if (!active && width === 0) return null

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: '3px',
        width: `${width}%`,
        background: 'hsl(var(--primary))',
        zIndex: 9999,
        borderRadius: '0 2px 2px 0',
        transition: width === 100
          ? 'width 200ms ease-out'
          : width <= 10
          ? 'width 80ms ease-out'
          : 'none',
        pointerEvents: 'none',
      }}
    />
  )
}
