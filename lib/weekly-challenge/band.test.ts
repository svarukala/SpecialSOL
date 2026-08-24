import { describe, it, expect } from 'vitest'
import { gradeToBand } from './band'

describe('gradeToBand', () => {
  it('maps grades 3-5 to elementary', () => {
    expect(gradeToBand(3)).toBe('elementary')
    expect(gradeToBand(4)).toBe('elementary')
    expect(gradeToBand(5)).toBe('elementary')
  })

  it('maps grades 6-8 to middle', () => {
    expect(gradeToBand(6)).toBe('middle')
    expect(gradeToBand(7)).toBe('middle')
    expect(gradeToBand(8)).toBe('middle')
  })
})
