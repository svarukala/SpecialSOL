export type WhType = 'what' | 'where' | 'who' | 'when' | 'why' | 'how'

export const WH_ORDER: WhType[] = ['what', 'where', 'who', 'when', 'why', 'how']

export const WH_CONFIG: Record<WhType, { emoji: string; label: string; bgClass: string; textClass: string; description: string }> = {
  what:  { emoji: '📦', label: 'What',  bgClass: 'bg-blue-100',   textClass: 'text-blue-700',   description: 'Identify objects and actions' },
  where: { emoji: '📍', label: 'Where', bgClass: 'bg-green-100',  textClass: 'text-green-700',  description: 'Find locations and places' },
  who:   { emoji: '👤', label: 'Who',   bgClass: 'bg-yellow-100', textClass: 'text-yellow-800', description: 'Identify people and characters' },
  when:  { emoji: '🕐', label: 'When',  bgClass: 'bg-orange-100', textClass: 'text-orange-700', description: 'Understand time and sequence' },
  why:   { emoji: '💡', label: 'Why',   bgClass: 'bg-purple-100', textClass: 'text-purple-700', description: 'Explain cause and effect' },
  how:   { emoji: '⚙️', label: 'How',   bgClass: 'bg-red-100',    textClass: 'text-red-700',    description: 'Describe process and method' },
}

export interface ProgressRow {
  wh_type: WhType
  questions_answered: number
  correct_count: number
  hint_count: number
  is_mastered: boolean
  last_practiced: string | null
  isUnlocked: boolean
}

export interface QuestionItem {
  id: string
  scenario: string
  question: string
  hint1: string | null
  hint2: string | null
  options: string[]
  difficulty: number
}
