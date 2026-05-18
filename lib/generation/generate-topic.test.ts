import { describe, it, expect, vi } from 'vitest'
import { generateTopic } from './generate-topic'
import type { SolTopic } from '@/lib/curriculum/sol-curriculum'

const mockTopic: SolTopic = {
  name: 'fractions',
  solStandard: '3.2',
  description: 'Name, write, and model fractions',
}

const mockQuestion = {
  grade: 3, subject: 'math', topic: 'fractions', subtopic: 'identifying fractions',
  sol_standard: '3.2', difficulty: 1,
  question_text: 'What fraction?', simplified_text: 'What fraction?',
  answer_type: 'multiple_choice',
  choices: [
    { id: 'a', text: '1/4', is_correct: true },
    { id: 'b', text: '1/3', is_correct: false },
    { id: 'c', text: '2/4', is_correct: false },
    { id: 'd', text: '3/4', is_correct: false },
  ],
  hint_1: 'H1', hint_2: 'H2', hint_3: 'H3',
  calculator_allowed: false, source: 'ai_generated',
  image_svg: null,
}

// Shared mock for the messages.create call — can be overridden per test
const mockCreate = vi.fn().mockResolvedValue({
  content: [{ type: 'text', text: JSON.stringify([mockQuestion]) }],
})

vi.mock('@anthropic-ai/sdk', () => {
  // Must be a real constructor (function, not arrow) so `new Anthropic(...)` works
  const MockAnthropic = function (this: unknown) {
    return { messages: { create: mockCreate } }
  }
  return { default: MockAnthropic }
})

describe('generateTopic', () => {
  it('returns validated questions from the API response', async () => {
    const result = await generateTopic(3, 'math', mockTopic)
    expect(result).toHaveLength(1)
    expect(result[0].grade).toBe(3)
    expect(result[0].sol_standard).toBe('3.2')
  })

  it('strips markdown code fences from the response', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '```json\n' + JSON.stringify([mockQuestion]) + '\n```' }],
    })
    const result = await generateTopic(3, 'math', mockTopic)
    expect(result).toHaveLength(1)
  })

  it('throws when the API returns invalid JSON', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'not json at all' }],
    })
    await expect(generateTopic(3, 'math', mockTopic)).rejects.toThrow()
  })

  it('includes image_svg instructions in the prompt', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify([mockQuestion]) }],
    })
    await generateTopic(3, 'math', mockTopic)
    const lastCall = mockCreate.mock.calls[mockCreate.mock.calls.length - 1]
    const prompt: string = lastCall[0].messages[0].content
    expect(prompt).toContain('image_svg')
  })
})

const mockScienceTopic: SolTopic = {
  name: 'electricity',
  solStandard: '5.4',
  description: 'Circuits, conductors, insulators, static electricity, magnetic fields',
}

const mockScienceQuestion = {
  grade: 5, subject: 'science', topic: 'electricity', subtopic: 'conductors and insulators',
  sol_standard: '5.4', difficulty: 1,
  question_text: 'Which material allows electricity to flow through it?',
  simplified_text: 'Which material lets electricity pass through it?',
  answer_type: 'multiple_choice',
  choices: [
    { id: 'a', text: 'Copper wire', is_correct: true },
    { id: 'b', text: 'Rubber band', is_correct: false },
    { id: 'c', text: 'Plastic cup', is_correct: false },
    { id: 'd', text: 'Wood block', is_correct: false },
  ],
  hint_1: 'Think about what materials let electricity flow.',
  hint_2: 'Metals are usually good at letting electricity through.',
  hint_3: 'Copper is a metal commonly used in wires.',
  calculator_allowed: false, source: 'ai_generated',
  image_svg: null,
}

describe('generateTopic — science subject', () => {
  it('accepts science as a subject and returns validated questions', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify([mockScienceQuestion]) }],
    })
    const result = await generateTopic(5, 'science', mockScienceTopic)
    expect(result).toHaveLength(1)
    expect(result[0].subject).toBe('science')
  })

  it('includes science-specific guidance in the prompt (no reading passage)', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify([mockScienceQuestion]) }],
    })
    await generateTopic(5, 'science', mockScienceTopic)
    const lastCall = mockCreate.mock.calls[mockCreate.mock.calls.length - 1]
    const prompt: string = lastCall[0].messages[0].content
    expect(prompt).toContain('reading_passage": null')
    expect(prompt).toContain('calculator_allowed": false')
  })

  it('includes real-world anchor guidance in science prompt', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify([mockScienceQuestion]) }],
    })
    await generateTopic(5, 'science', mockScienceTopic)
    const lastCall = mockCreate.mock.calls[mockCreate.mock.calls.length - 1]
    const prompt: string = lastCall[0].messages[0].content
    expect(prompt.toLowerCase()).toContain('real-world')
  })
})
