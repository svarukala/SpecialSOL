import { describe, it, expect, vi } from 'vitest'
import { playCorrectChime, playFanfare } from './web-audio'

const mockOscillator = {
  type: '',
  frequency: { setValueAtTime: vi.fn() },
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
}
const mockGain = {
  gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
  connect: vi.fn(),
}
const mockContext = {
  createOscillator: vi.fn().mockReturnValue(mockOscillator),
  createGain: vi.fn().mockReturnValue(mockGain),
  destination: {},
  currentTime: 0,
}

// Use a regular function (not arrow) so it can be used as a constructor
function MockAudioContext() {
  return mockContext
}
vi.stubGlobal('AudioContext', MockAudioContext)

describe('web-audio', () => {
  it('playCorrectChime creates an oscillator and starts it', () => {
    playCorrectChime()
    expect(mockContext.createOscillator).toHaveBeenCalled()
    expect(mockOscillator.start).toHaveBeenCalled()
  })

  it('playFanfare creates multiple oscillators', () => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    playFanfare()
    vi.runAllTimers()
    expect(mockContext.createOscillator).toHaveBeenCalledTimes(4)
    vi.useRealTimers()
  })
})
