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

describe('buildEmail welcome_back_2026', () => {
  it('links to the welcome-back blog post and the Weekly Challenge', () => {
    const { subject, html } = buildEmail('welcome_back_2026', {})

    expect(subject).toContain('Welcome back')
    expect(subject).toContain('Weekly Challenge')
    expect(html).toContain('solprep.app/blog/welcome-back-2026-2027-school-year')
    expect(html).toContain('solprep.app/challenge')
    expect(html).toContain('Weekly Challenge')
    expect(html).toContain('— SolPrep')
  })
})
