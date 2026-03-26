import { describe, it, expect } from 'vitest'
import { sanitizeSvg } from './sanitize'

describe('sanitizeSvg', () => {
  it('passes clean SVG through unchanged', () => {
    const svg = '<svg viewBox="0 0 100 50"><rect x="0" y="0" width="50" height="50" fill="#ccc"/></svg>'
    expect(sanitizeSvg(svg)).toBe(svg)
  })

  it('strips <script> tags', () => {
    const svg = '<svg><script>alert(1)</script><rect/></svg>'
    expect(sanitizeSvg(svg)).not.toContain('<script>')
    expect(sanitizeSvg(svg)).toContain('<rect/>')
  })

  it('strips multiline <script> blocks', () => {
    const svg = '<svg><script>\nconst x = 1\n</script><circle/></svg>'
    expect(sanitizeSvg(svg)).not.toContain('script')
  })

  it('strips double-quoted on* event attributes', () => {
    const svg = '<svg><circle onclick="evil()" r="5"/></svg>'
    expect(sanitizeSvg(svg)).not.toContain('onclick')
    expect(sanitizeSvg(svg)).toContain('<circle')
  })

  it('strips single-quoted on* event attributes', () => {
    const svg = "<svg><rect onmouseover='bad()'/></svg>"
    expect(sanitizeSvg(svg)).not.toContain('onmouseover')
  })
})
