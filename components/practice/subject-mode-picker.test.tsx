import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SubjectModePicker } from './subject-mode-picker'

describe('SubjectModePicker', () => {
  it('renders subject options', () => {
    render(<SubjectModePicker childName="Maya" availableSubjects={['math', 'reading']} onStart={vi.fn()} dashboardHref="/dashboard" />)
    expect(screen.getByText(/math/i)).toBeInTheDocument()
    expect(screen.getByText(/reading/i)).toBeInTheDocument()
  })

  it('calls onStart with subject and mode when both are selected', () => {
    const onStart = vi.fn()
    render(<SubjectModePicker childName="Maya" availableSubjects={['math']} onStart={onStart} dashboardHref="/dashboard" />)
    // Click Math
    fireEvent.click(screen.getByText('Math'))
    // Click Practice button (appears after subject selected)
    fireEvent.click(screen.getByRole('button', { name: /practice/i }))
    // Click Let's Go
    fireEvent.click(screen.getByRole('button', { name: /let.*go/i }))
    expect(onStart).toHaveBeenCalledWith({ subject: 'math', mode: 'practice' })
  })
})
