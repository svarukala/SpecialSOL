import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { OnScreenCalculator } from './on-screen-calculator'

describe('OnScreenCalculator', () => {
  it('renders digit and operator buttons', () => {
    render(<OnScreenCalculator />)
    expect(screen.getByRole('button', { name: '7' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '=' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'C' })).toBeInTheDocument()
  })

  it('displays typed digits', () => {
    render(<OnScreenCalculator />)
    fireEvent.click(screen.getByRole('button', { name: '4' }))
    fireEvent.click(screen.getByRole('button', { name: '2' }))
    expect(screen.getByRole('status')).toHaveTextContent('42')
  })

  it('computes addition', () => {
    render(<OnScreenCalculator />)
    fireEvent.click(screen.getByRole('button', { name: '3' }))
    fireEvent.click(screen.getByRole('button', { name: '+' }))
    fireEvent.click(screen.getByRole('button', { name: '5' }))
    fireEvent.click(screen.getByRole('button', { name: '=' }))
    expect(screen.getByRole('status')).toHaveTextContent('8')
  })

  it('clears display on C', () => {
    render(<OnScreenCalculator />)
    fireEvent.click(screen.getByRole('button', { name: '9' }))
    fireEvent.click(screen.getByRole('button', { name: 'C' }))
    expect(screen.getByRole('status')).toHaveTextContent('0')
  })

  it('does not render when hidden is true', () => {
    const { container } = render(<OnScreenCalculator hidden />)
    expect(container.firstChild).toBeNull()
  })
})
