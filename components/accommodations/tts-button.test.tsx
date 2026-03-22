import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TTSButton } from './tts-button'

const mockSpeak = vi.fn().mockResolvedValue(undefined)
const mockStop = vi.fn()

vi.mock('@/lib/accommodations/context', () => ({
  useAccommodations: () => ({
    state: { tts_enabled: true, tts_speed: 1.0 },
    update: vi.fn(),
  }),
}))

describe('TTSButton', () => {
  it('renders read aloud button when tts_enabled', () => {
    render(<TTSButton text="Test question" engine={{ speak: mockSpeak, stop: mockStop, isAvailable: vi.fn() }} />)
    expect(screen.getByRole('button', { name: /read aloud/i })).toBeInTheDocument()
  })

  it('calls speak when clicked', () => {
    render(<TTSButton text="Test question" engine={{ speak: mockSpeak, stop: mockStop, isAvailable: vi.fn() }} />)
    fireEvent.click(screen.getByRole('button', { name: /read aloud/i }))
    expect(mockSpeak).toHaveBeenCalledWith('Test question', expect.any(Object))
  })
})
