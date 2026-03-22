import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { SignupForm } from './signup-form'

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signUp: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
  }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

describe('SignupForm', () => {
  it('renders email and password fields', () => {
    render(<SignupForm />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getAllByLabelText(/password/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument()
  })

  it('validates that password and confirm password fields exist', () => {
    render(<SignupForm />)
    const passwordInputs = screen.getAllByLabelText(/password/i)
    expect(passwordInputs.length).toBeGreaterThanOrEqual(2)
  })
})
