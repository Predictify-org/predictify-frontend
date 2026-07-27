import React from 'react'
import { render, screen } from '@testing-library/react'
import { StellarWaveEmptyState } from '../EmptyState'

describe('StellarWaveEmptyState', () => {
  it('renders with default props', () => {
    render(<StellarWaveEmptyState />)
    expect(screen.getByText('No Stellar Wave data yet')).toBeInTheDocument()
    expect(screen.getByText('Join the GrantFox FWC26 campaign to start seeing your predictions and market data here.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Explore Campaigns/i })).toBeInTheDocument()
  })

  it('renders custom title and description', () => {
    render(
      <StellarWaveEmptyState 
        title="Custom Title" 
        description="Custom Description" 
        ctaText="Custom CTA"
      />
    )
    expect(screen.getByText('Custom Title')).toBeInTheDocument()
    expect(screen.getByText('Custom Description')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Custom CTA/i })).toBeInTheDocument()
  })

  it('renders a button instead of a link if onCtaClick is provided', () => {
    const handleClick = jest.fn()
    render(<StellarWaveEmptyState onCtaClick={handleClick} ctaText="Click Me" />)
    
    const button = screen.getByRole('button', { name: /Click Me/i })
    expect(button).toBeInTheDocument()
    button.click()
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('is accessible', () => {
    const { container } = render(<StellarWaveEmptyState />)
    const statusRegion = container.querySelector('[role="status"]')
    expect(statusRegion).toBeInTheDocument()
    expect(statusRegion).toHaveAttribute('aria-live', 'polite')
  })
})
