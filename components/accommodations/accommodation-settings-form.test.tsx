import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AccommodationSettingsForm } from './accommodation-settings-form'
import { DEFAULT_ACCOMMODATIONS } from '@/lib/accommodations/defaults'

describe('AccommodationSettingsForm', () => {
  it('renders all accommodation toggles', () => {
    render(<AccommodationSettingsForm value={DEFAULT_ACCOMMODATIONS} onChange={vi.fn()} />)
    expect(screen.getByText(/read aloud/i)).toBeInTheDocument()
    expect(screen.getByText(/simplified language/i)).toBeInTheDocument()
    expect(screen.getByText(/high contrast/i)).toBeInTheDocument()
    expect(screen.getByText(/large text/i)).toBeInTheDocument()
    expect(screen.getByText(/dyslexia/i)).toBeInTheDocument()
    expect(screen.getByText(/reduce distractions/i)).toBeInTheDocument()
    expect(screen.getByText(/extended time/i)).toBeInTheDocument()
    expect(screen.getByText(/hints/i)).toBeInTheDocument()
  })

  it('calls onChange when a toggle is clicked', async () => {
    const onChange = vi.fn()
    render(<AccommodationSettingsForm value={DEFAULT_ACCOMMODATIONS} onChange={onChange} />)
    const toggle = screen.getByRole('switch', { name: /high contrast/i })
    toggle.click()
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ high_contrast: true })
    )
  })
})
