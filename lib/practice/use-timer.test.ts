import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useTimer } from './use-timer'

describe('useTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('initialises with full time, not running, not expired', () => {
    const { result } = renderHook(() => useTimer({ durationSeconds: 10 }))
    expect(result.current.timeLeft).toBe(10)
    expect(result.current.isRunning).toBe(false)
    expect(result.current.isExpired).toBe(false)
    expect(result.current.fractionLeft).toBe(1)
  })

  it('autoStart begins the countdown immediately', () => {
    const { result } = renderHook(() => useTimer({ durationSeconds: 10, autoStart: true }))
    expect(result.current.isRunning).toBe(true)
    act(() => { vi.advanceTimersByTime(3000) })
    expect(result.current.timeLeft).toBeLessThanOrEqual(7)
  })

  it('start() begins countdown and tick reduces timeLeft', () => {
    const { result } = renderHook(() => useTimer({ durationSeconds: 5 }))
    act(() => result.current.start())
    expect(result.current.isRunning).toBe(true)
    act(() => { vi.advanceTimersByTime(2000) })
    expect(result.current.timeLeft).toBeLessThanOrEqual(3)
  })

  it('pause() stops the countdown', () => {
    const { result } = renderHook(() => useTimer({ durationSeconds: 10 }))
    act(() => result.current.start())
    act(() => { vi.advanceTimersByTime(3000) })
    const timeAtPause = result.current.timeLeft
    act(() => result.current.pause())
    act(() => { vi.advanceTimersByTime(3000) })
    expect(result.current.timeLeft).toBe(timeAtPause)
    expect(result.current.isRunning).toBe(false)
  })

  it('reset() restores original duration and stops', () => {
    const { result } = renderHook(() => useTimer({ durationSeconds: 10 }))
    act(() => result.current.start())
    act(() => { vi.advanceTimersByTime(5000) })
    act(() => result.current.reset())
    expect(result.current.timeLeft).toBe(10)
    expect(result.current.isRunning).toBe(false)
    expect(result.current.isExpired).toBe(false)
  })

  it('reset() accepts a new duration', () => {
    const { result } = renderHook(() => useTimer({ durationSeconds: 10 }))
    act(() => result.current.reset(30))
    expect(result.current.timeLeft).toBe(30)
    expect(result.current.fractionLeft).toBe(1)
  })

  it('calls onExpire exactly once when time runs out', () => {
    const onExpire = vi.fn()
    const { result } = renderHook(() => useTimer({ durationSeconds: 3, onExpire }))
    act(() => result.current.start())
    act(() => { vi.advanceTimersByTime(4000) })
    expect(onExpire).toHaveBeenCalledTimes(1)
    expect(result.current.isExpired).toBe(true)
    expect(result.current.isRunning).toBe(false)
  })

  it('fractionLeft goes from 1 to 0 over full duration', () => {
    const { result } = renderHook(() => useTimer({ durationSeconds: 4 }))
    act(() => result.current.start())
    expect(result.current.fractionLeft).toBe(1)
    act(() => { vi.advanceTimersByTime(4000) })
    expect(result.current.fractionLeft).toBe(0)
  })

  it('timeLeft never goes below 0', () => {
    const { result } = renderHook(() => useTimer({ durationSeconds: 2 }))
    act(() => result.current.start())
    act(() => { vi.advanceTimersByTime(10000) })
    expect(result.current.timeLeft).toBe(0)
  })
})
