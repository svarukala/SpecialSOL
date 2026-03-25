import { render, screen } from '@testing-library/react'
import { MilestonesCard } from './milestones-card'
import type { Milestone } from '@/lib/supabase/queries'

const promotion: Milestone = {
  subject: 'math', topic: 'fractions',
  fromLevel: 'simplified', toLevel: 'standard',
  changedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
  direction: 'promoted',
}
const demotion: Milestone = {
  subject: 'math', topic: 'division',
  fromLevel: 'standard', toLevel: 'simplified',
  changedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
  direction: 'demoted',
}

describe('MilestonesCard', () => {
  it('renders nothing when milestones array is empty', () => {
    const { container } = render(<MilestonesCard milestones={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders a promotion row with 🎉 and topic + subject', () => {
    render(<MilestonesCard milestones={[promotion]} />)
    expect(screen.getByText(/fractions/i)).toBeInTheDocument()
    expect(screen.getByText(/math/i)).toBeInTheDocument()
    expect(screen.getByText(/🎉/)).toBeInTheDocument()
  })

  it('renders a demotion row with ⚠️', () => {
    render(<MilestonesCard milestones={[demotion]} />)
    expect(screen.getByText(/division/i)).toBeInTheDocument()
    expect(screen.getByText(/⚠️/)).toBeInTheDocument()
  })

  it('shows relative time string for each milestone', () => {
    render(<MilestonesCard milestones={[promotion]} />)
    expect(screen.getByText(/days? ago/i)).toBeInTheDocument()
  })

  it('renders the card heading', () => {
    render(<MilestonesCard milestones={[promotion]} />)
    expect(screen.getByText(/recent milestones/i)).toBeInTheDocument()
  })
})
