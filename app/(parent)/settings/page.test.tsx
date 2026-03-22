import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ApiKeySection } from './api-key-section'

describe('ApiKeySection', () => {
  it('renders provider dropdown and key inputs', () => {
    render(<ApiKeySection currentProvider="web_speech" hasOpenAIKey={false} hasElevenLabsKey={false} onSave={vi.fn()} />)
    expect(screen.getByText(/tts provider/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/openai api key/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/elevenlabs api key/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save settings/i })).toBeInTheDocument()
  })
})
