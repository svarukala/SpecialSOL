import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PracticeSession } from './practice-session'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/lib/tts/factory', () => ({
  createTTSEngine: vi.fn().mockResolvedValue({
    speak: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    isAvailable: vi.fn().mockResolvedValue(true),
  }),
}))

vi.mock('@/lib/audio/web-audio', () => ({
  playCorrectChime: vi.fn(),
  playFanfare: vi.fn(),
}))

// Deterministic shuffle: sort(() => 0) keeps original order
vi.spyOn(Math, 'random').mockReturnValue(0)

const Q1 = {
  id: 'q1',
  question_text: 'What is 2 + 2?',
  simplified_text: null,
  answer_type: 'multiple_choice' as const,
  choices: [
    { id: 'a', text: '4', is_correct: true },
    { id: 'b', text: '3', is_correct: false },
    { id: 'c', text: '5', is_correct: false },
  ],
  hint_1: 'Count fingers', hint_2: null, hint_3: null,
  calculator_allowed: false,
}

const Q2 = {
  id: 'q2',
  question_text: 'What is 3 + 3?',
  simplified_text: null,
  answer_type: 'multiple_choice' as const,
  choices: [
    { id: 'a', text: '6', is_correct: true },
    { id: 'b', text: '5', is_correct: false },
    { id: 'c', text: '7', is_correct: false },
  ],
  hint_1: null, hint_2: null, hint_3: null,
  calculator_allowed: false,
}

const defaultProps = {
  child: { id: 'child-1', name: 'Maya', grade: 3, accommodations: {} },
  availableSubjects: ['math' as const, 'reading' as const],
  parentSettings: {},
  dashboardHref: '/dashboard',
}

function setupFetch({ scorePercent = 80 } = {}) {
  global.fetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
    const method = opts?.method ?? 'GET'
    if (url.includes('/api/questions'))
      return Promise.resolve({ json: () => Promise.resolve([Q1, Q2]) })
    if (url.includes('/api/sessions') && method === 'POST' && !url.includes('/answers'))
      return Promise.resolve({ json: () => Promise.resolve({ sessionId: 'sess-1' }) })
    if (url.includes('/answers'))
      return Promise.resolve({ json: () => Promise.resolve({}) })
    if (method === 'PATCH')
      return Promise.resolve({ json: () => Promise.resolve({ scorePercent }) })
    return Promise.resolve({ json: () => Promise.resolve({}) })
  })
}

/** Navigate from the subject picker to the first question. */
async function pickAndStart(mode: 'practice' | 'test' = 'practice') {
  fireEvent.click(screen.getByText('Math'))
  // Mode buttons are conditionally rendered after subject selection
  await waitFor(() => screen.getByRole('button', { name: new RegExp(`^${mode}$`, 'i') }))
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${mode}$`, 'i') }))
  await waitFor(() => screen.getByRole('button', { name: /let.*go/i }))
  fireEvent.click(screen.getByRole('button', { name: /let.*go/i }))
  await waitFor(() => screen.getByText('What is 2 + 2?'))
}

describe('PracticeSession', () => {
  beforeEach(setupFetch)
  afterEach(() => vi.clearAllMocks())

  it('shows subject/mode picker on mount', () => {
    render(<PracticeSession {...defaultProps} />)
    expect(screen.getByText(/hi maya/i)).toBeInTheDocument()
    expect(screen.getByText('Math')).toBeInTheDocument()
    expect(screen.getByText('Reading')).toBeInTheDocument()
  })

  it('disables the start button while loading and shows the first question after', async () => {
    render(<PracticeSession {...defaultProps} />)
    fireEvent.click(screen.getByText('Math'))
    await waitFor(() => screen.getByRole('button', { name: /^practice$/i }))
    fireEvent.click(screen.getByRole('button', { name: /^practice$/i }))
    await waitFor(() => screen.getByRole('button', { name: /let.*go/i }))
    fireEvent.click(screen.getByRole('button', { name: /let.*go/i }))

    // Button is disabled immediately while the two API calls are in-flight
    expect(screen.getByRole('button', { name: /loading/i })).toBeDisabled()

    await waitFor(() => screen.getByText('What is 2 + 2?'))
  })

  it('correct answer auto-advances to next question', async () => {
    render(<PracticeSession {...defaultProps} />)
    await pickAndStart()

    fireEvent.click(screen.getByText('4')) // correct for Q1
    // 1200ms auto-advance; waitFor default is 1000ms so we extend it
    await waitFor(() => screen.getByText('What is 3 + 3?'), { timeout: 2500 })
  }, 5000)

  it('wrong answer in practice mode shows retry and stays on same question', async () => {
    render(<PracticeSession {...defaultProps} />)
    await pickAndStart('practice')

    fireEvent.click(screen.getByText('3')) // wrong for Q1
    await waitFor(() => screen.getByText(/try again/i))
    expect(screen.getByText('What is 2 + 2?')).toBeInTheDocument()
  })

  it('wrong answer in test mode auto-advances after 1200ms', async () => {
    render(<PracticeSession {...defaultProps} />)
    await pickAndStart('test')

    fireEvent.click(screen.getByText('3')) // wrong for Q1
    await waitFor(() => screen.getByText('What is 3 + 3?'), { timeout: 2500 })
  }, 5000)

  it('clicking a different answer after a wrong answer retries without needing a reset link', async () => {
    render(<PracticeSession {...defaultProps} />)
    await pickAndStart('practice')

    fireEvent.click(screen.getByText('3')) // wrong
    await waitFor(() => screen.getByText(/try again/i))
    fireEvent.click(screen.getByText('4')) // correct retry — no reset link needed
    await waitFor(() => screen.getByText('What is 3 + 3?'), { timeout: 2500 })
  }, 5000)

  it('completes the session after the last question and shows the score', async () => {
    setupFetch({ scorePercent: 100 })
    render(<PracticeSession {...defaultProps} />)
    await pickAndStart()

    fireEvent.click(screen.getByText('4')) // Q1 correct
    await waitFor(() => screen.getByText('What is 3 + 3?'), { timeout: 2500 })
    fireEvent.click(screen.getByText('6')) // Q2 correct
    // Session complete screen
    await waitFor(() => screen.getByRole('button', { name: /practice again/i }), { timeout: 2500 })
  }, 10000)

  it('Practice Again returns to the subject picker', async () => {
    setupFetch({ scorePercent: 100 })
    render(<PracticeSession {...defaultProps} />)
    await pickAndStart()

    fireEvent.click(screen.getByText('4'))
    await waitFor(() => screen.getByText('What is 3 + 3?'), { timeout: 2500 })
    fireEvent.click(screen.getByText('6'))
    await waitFor(() => screen.getByRole('button', { name: /practice again/i }), { timeout: 2500 })

    fireEvent.click(screen.getByRole('button', { name: /practice again/i }))
    await waitFor(() => screen.getByText(/hi maya/i))
  }, 10000)
})
