import { describe, it, expect } from 'vitest'
import { getCurrentWeekStartDate } from './week'

describe('getCurrentWeekStartDate', () => {
  it('returns the same date when given a Monday', () => {
    // 2026-08-24 is a Monday
    const monday = new Date('2026-08-24T15:00:00Z')
    expect(getCurrentWeekStartDate(monday)).toBe('2026-08-24')
  })

  it('returns the preceding Monday when given a midweek date', () => {
    // 2026-08-26 is a Wednesday
    const wednesday = new Date('2026-08-26T15:00:00Z')
    expect(getCurrentWeekStartDate(wednesday)).toBe('2026-08-24')
  })

  it('returns the preceding Monday when given a Sunday', () => {
    // 2026-08-30 is a Sunday, week started 2026-08-24
    const sunday = new Date('2026-08-30T15:00:00Z')
    expect(getCurrentWeekStartDate(sunday)).toBe('2026-08-24')
  })

  it('handles a New York evening date that is still the same NY calendar day', () => {
    // 2026-08-24 23:30 UTC is 2026-08-24 19:30 America/New_York (EDT, UTC-4) — still Monday
    const lateUtc = new Date('2026-08-24T23:30:00Z')
    expect(getCurrentWeekStartDate(lateUtc)).toBe('2026-08-24')
  })
})
