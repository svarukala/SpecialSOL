import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Scratchpad } from './scratchpad'

describe('Scratchpad', () => {
  it('renders the scratchpad panel', () => {
    render(<Scratchpad questionId="q1" onClose={vi.fn()} />)
    expect(screen.getByText('✏️ Scratch Pad')).toBeInTheDocument()
  })

  it('calls onClose when × button is clicked', () => {
    const onClose = vi.fn()
    render(<Scratchpad questionId="q1" onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('Close scratchpad'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('undo button is disabled when no strokes exist', () => {
    render(<Scratchpad questionId="q1" onClose={vi.fn()} />)
    expect(screen.getByLabelText('Undo last stroke')).toBeDisabled()
  })

  it('clear button is disabled when no strokes exist', () => {
    render(<Scratchpad questionId="q1" onClose={vi.fn()} />)
    expect(screen.getByLabelText('Clear all strokes')).toBeDisabled()
  })

  it('pen button is active by default', () => {
    render(<Scratchpad questionId="q1" onClose={vi.fn()} />)
    const penBtn = screen.getByLabelText('Pen tool')
    expect(penBtn).toHaveAttribute('data-active', 'true')
  })

  it('eraser button becomes active when clicked', () => {
    render(<Scratchpad questionId="q1" onClose={vi.fn()} />)
    fireEvent.click(screen.getByLabelText('Eraser tool'))
    expect(screen.getByLabelText('Eraser tool')).toHaveAttribute('data-active', 'true')
    expect(screen.getByLabelText('Pen tool')).toHaveAttribute('data-active', 'false')
  })
})
