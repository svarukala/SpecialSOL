import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ProgressChart } from './progress-chart'

const mockTopics = [
  { topic: 'Fractions', accuracy: 0.85 },
  { topic: 'Main Idea', accuracy: 0.55 },
  { topic: 'Place Value', accuracy: 0.70 },
]

describe('ProgressChart', () => {
  it('renders topic labels', () => {
    render(<ProgressChart topics={mockTopics} />)
    expect(screen.getByText('Fractions')).toBeInTheDocument()
    expect(screen.getByText('Main Idea')).toBeInTheDocument()
    expect(screen.getByText('Place Value')).toBeInTheDocument()
  })

  it('shows percentage for each topic', () => {
    render(<ProgressChart topics={mockTopics} />)
    expect(screen.getByText('85%')).toBeInTheDocument()
    expect(screen.getByText('55%')).toBeInTheDocument()
  })
})
