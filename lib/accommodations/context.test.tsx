import { render, screen, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { AccommodationProvider, useAccommodations } from './context'
import { DEFAULT_ACCOMMODATIONS } from './defaults'

function TestConsumer() {
  const { state, update } = useAccommodations()
  return (
    <div>
      <span data-testid="contrast">{String(state.high_contrast)}</span>
      <button onClick={() => update({ high_contrast: true })}>Enable Contrast</button>
    </div>
  )
}

describe('AccommodationContext', () => {
  it('provides default accommodation state', () => {
    render(
      <AccommodationProvider initial={DEFAULT_ACCOMMODATIONS}>
        <TestConsumer />
      </AccommodationProvider>
    )
    expect(screen.getByTestId('contrast').textContent).toBe('false')
  })

  it('updates state via update()', async () => {
    render(
      <AccommodationProvider initial={DEFAULT_ACCOMMODATIONS}>
        <TestConsumer />
      </AccommodationProvider>
    )
    await act(async () => {
      screen.getByRole('button').click()
    })
    expect(screen.getByTestId('contrast').textContent).toBe('true')
  })

  it('toggles reduce-distractions class on html element', async () => {
    const { rerender } = render(
      <AccommodationProvider initial={{ ...DEFAULT_ACCOMMODATIONS, reduce_distractions: false }}>
        <TestConsumer />
      </AccommodationProvider>
    )
    expect(document.documentElement.classList.contains('reduce-distractions')).toBe(false)
    rerender(
      <AccommodationProvider initial={{ ...DEFAULT_ACCOMMODATIONS, reduce_distractions: true }}>
        <TestConsumer />
      </AccommodationProvider>
    )
    expect(document.documentElement.classList.contains('reduce-distractions')).toBe(true)
  })
})
