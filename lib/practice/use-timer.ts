import { useState, useEffect, useRef, useCallback } from 'react'

interface UseTimerOptions {
  /** Total seconds for the countdown. */
  durationSeconds: number
  /** Called once when the timer reaches zero. */
  onExpire?: () => void
  /** Start immediately on mount (default: false). */
  autoStart?: boolean
}

export interface UseTimerReturn {
  /** Whole seconds remaining (never negative). */
  timeLeft: number
  /** Whether the interval is currently ticking. */
  isRunning: boolean
  /** True once timeLeft reaches 0. */
  isExpired: boolean
  /** 0–1 fraction of time remaining (1 = full, 0 = expired). */
  fractionLeft: number
  start: () => void
  pause: () => void
  /** Reset to durationSeconds (or a new duration) and stop. */
  reset: (newDurationSeconds?: number) => void
}

export function useTimer({
  durationSeconds,
  onExpire,
  autoStart = false,
}: UseTimerOptions): UseTimerReturn {
  const [timeLeft, setTimeLeft] = useState(durationSeconds)
  const [isRunning, setIsRunning] = useState(autoStart)
  const deadlineRef = useRef<number | null>(null)
  const onExpireRef = useRef(onExpire)
  const durationRef = useRef(durationSeconds)
  // Synchronous guard so onExpire fires exactly once even if the interval
  // ticks again before setIsRunning(false) takes effect.
  const firedRef = useRef(false)

  // Keep refs current without restarting effects
  useEffect(() => { onExpireRef.current = onExpire }, [onExpire])
  useEffect(() => { durationRef.current = durationSeconds }, [durationSeconds])

  const start = useCallback(() => {
    setTimeLeft((prev) => {
      // Set deadline based on current remaining time
      deadlineRef.current = Date.now() + prev * 1000
      return prev
    })
    setIsRunning(true)
  }, [])

  const pause = useCallback(() => {
    setIsRunning(false)
    deadlineRef.current = null
  }, [])

  const reset = useCallback((newDuration?: number) => {
    const d = newDuration ?? durationRef.current
    durationRef.current = d
    deadlineRef.current = null
    firedRef.current = false
    setTimeLeft(d)
    setIsRunning(false)
  }, [])

  // Tick every 250ms for smooth bar, but only update state when seconds change
  useEffect(() => {
    if (!isRunning) return

    // Establish deadline if not set (e.g. after start() called)
    if (deadlineRef.current === null) {
      deadlineRef.current = Date.now() + timeLeft * 1000
    }

    const id = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadlineRef.current! - Date.now()) / 1000))
      setTimeLeft(remaining)
      if (remaining === 0 && !firedRef.current) {
        firedRef.current = true
        setIsRunning(false)
        deadlineRef.current = null
        onExpireRef.current?.()
      }
    }, 250)

    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning])

  return {
    timeLeft,
    isRunning,
    isExpired: timeLeft === 0,
    fractionLeft: durationRef.current > 0 ? timeLeft / durationRef.current : 0,
    start,
    pause,
    reset,
  }
}
