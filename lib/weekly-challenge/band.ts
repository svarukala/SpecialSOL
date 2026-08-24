export type Band = 'elementary' | 'middle'

export function gradeToBand(grade: number): Band {
  return grade <= 5 ? 'elementary' : 'middle'
}
