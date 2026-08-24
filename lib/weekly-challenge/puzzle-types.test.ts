import { describe, it, expect } from 'vitest'
import { checkMysteryCodeAnswers, checkSoldleGuess, type MysteryCodeContent } from './puzzle-types'

const content: MysteryCodeContent = {
  codeLabel: '3-digit code',
  questions: [
    { prompt: 'What is 6 x 7?', choices: ['42', '36', '48'], correctIndex: 0, revealsDigit: '4' },
    { prompt: 'Which word means "happy"?', choices: ['sad', 'joyful', 'tired'], correctIndex: 1, revealsDigit: '2' },
    { prompt: 'What is 100 - 15?', choices: ['85', '75', '95'], correctIndex: 0, revealsDigit: '9' },
  ],
}

describe('checkMysteryCodeAnswers', () => {
  it('reveals the full code and marks solved when every answer is correct', () => {
    const result = checkMysteryCodeAnswers(content, [0, 1, 0])
    expect(result).toEqual({ correctCount: 3, solved: true, revealedCode: '429' })
  })

  it('reveals a partial code with underscores for wrong answers', () => {
    const result = checkMysteryCodeAnswers(content, [0, 2, 0])
    expect(result).toEqual({ correctCount: 2, solved: false, revealedCode: '4_9' })
  })
})

describe('checkSoldleGuess', () => {
  it('returns correct when the guess matches the target', () => {
    expect(checkSoldleGuess({ target: 42 }, 42)).toBe('correct')
  })

  it('returns too_low when the guess is below the target', () => {
    expect(checkSoldleGuess({ target: 42 }, 30)).toBe('too_low')
  })

  it('returns too_high when the guess is above the target', () => {
    expect(checkSoldleGuess({ target: 42 }, 50)).toBe('too_high')
  })
})
