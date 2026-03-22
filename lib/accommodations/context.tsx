'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import { AccommodationState } from './types'

interface AccommodationContextValue {
  state: AccommodationState
  update: (patch: Partial<AccommodationState>) => void
}

const AccommodationContext = createContext<AccommodationContextValue | null>(null)

export function AccommodationProvider({
  children,
  initial,
}: {
  children: React.ReactNode
  initial: AccommodationState
}) {
  const [state, setState] = useState<AccommodationState>(initial)

  // Sync when initial prop changes (e.g. on rerender with new child profile)
  useEffect(() => {
    setState(initial)
  }, [initial])

  function update(patch: Partial<AccommodationState>) {
    setState((prev) => ({ ...prev, ...patch }))
  }

  // Apply visual modes to <html> element
  useEffect(() => {
    const html = document.documentElement
    html.classList.toggle('theme-high-contrast', state.high_contrast)
    html.classList.toggle('font-dyslexic', state.dyslexia_font)
    html.classList.toggle('reduce-distractions', state.reduce_distractions)
    html.classList.remove('text-large-0', 'text-large-1', 'text-large-2')
    html.classList.add(`text-large-${state.large_text}`)
  }, [state.high_contrast, state.dyslexia_font, state.large_text, state.reduce_distractions])

  return (
    <AccommodationContext.Provider value={{ state, update }}>
      {children}
    </AccommodationContext.Provider>
  )
}

export function useAccommodations(): AccommodationContextValue {
  const ctx = useContext(AccommodationContext)
  if (!ctx) throw new Error('useAccommodations must be used within AccommodationProvider')
  return ctx
}
