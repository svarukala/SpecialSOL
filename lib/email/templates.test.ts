import { describe, it, expect } from 'vitest'
import { buildEmail } from './templates'

describe('buildEmail weekly_challenge', () => {
  it('links to /challenge and lists each child with a streak', () => {
    const { subject, html } = buildEmail('weekly_challenge', {
      childNames: ['Maya', 'Ben'],
      childStreaks: [
        { name: 'Maya', streak: 3 },
        { name: 'Ben', streak: 0 },
      ],
    })

    expect(subject).toContain("This week's challenge")
    expect(html).toContain('solprep.app/challenge')
    expect(html).toContain('Maya')
    expect(html).toContain('3 week')
  })

  it('omits the streak line for a child with no streak yet', () => {
    const { html } = buildEmail('weekly_challenge', {
      childNames: ['Ben'],
      childStreaks: [{ name: 'Ben', streak: 0 }],
    })
    expect(html).not.toContain('0 week')
  })
})
