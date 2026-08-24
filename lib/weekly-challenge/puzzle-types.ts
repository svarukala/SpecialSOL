export interface MysteryCodeQuestion {
  prompt: string
  choices: string[]
  correctIndex: number
  revealsDigit: string
}

export interface MysteryCodeContent {
  codeLabel: string
  questions: MysteryCodeQuestion[]
}

export interface MysteryCodeSolution {
  code: string
}

export interface MysteryCodeResult {
  correctCount: number
  solved: boolean
  revealedCode: string
}

export function checkMysteryCodeAnswers(
  content: MysteryCodeContent,
  answerIndexes: number[]
): MysteryCodeResult {
  let correctCount = 0
  let revealedCode = ''

  content.questions.forEach((q, i) => {
    if (answerIndexes[i] === q.correctIndex) {
      correctCount += 1
      revealedCode += q.revealsDigit
    } else {
      revealedCode += '_'
    }
  })

  return { correctCount, solved: correctCount === content.questions.length, revealedCode }
}

export interface SoldleContent {
  concept: string
  clue: string
  min: number
  max: number
  maxGuesses: number
}

export interface SoldleSolution {
  target: number
}

export type SoldleFeedback = 'correct' | 'too_low' | 'too_high'

export function checkSoldleGuess(solution: SoldleSolution, guess: number): SoldleFeedback {
  if (guess === solution.target) return 'correct'
  return guess < solution.target ? 'too_low' : 'too_high'
}
