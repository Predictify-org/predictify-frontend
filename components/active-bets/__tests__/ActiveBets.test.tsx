import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ActiveBets } from '../ActiveBets';
import { mockActiveBets } from '@/lib/mock-data';

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

describe('ActiveBets', () => {
  const defaultProps = {
    bets: mockActiveBets,
    onAddBet: jest.fn(),
    onLearnMore: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders active bets correctly', () => {
    render(<ActiveBets {...defaultProps} />);
    
    expect(screen.getByText('Active Bets')).toBeInTheDocument();
    expect(screen.getByText('Add Bet')).toBeInTheDocument();
    expect(screen.getByText('Learn more')).toBeInTheDocument();
  });

  it('displays bet cards', () => {
    render(<ActiveBets {...defaultProps} />);
    
    // Check if bet titles are rendered
    expect(screen.getByText('Barca vs Madrid')).toBeInTheDocument();
    expect(screen.getByText('Arsenal vs Liverpool')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<ActiveBets {...defaultProps} isLoading={true} />);
    
    // Should show skeleton loaders
    expect(screen.getByText('Active Bets')).toBeInTheDocument();
    // Skeleton elements should be present (they have animate-pulse class)
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows empty state when no bets', () => {
    render(<ActiveBets {...defaultProps} bets={[]} />);
    
    expect(screen.getByText('No Active Bets')).toBeInTheDocument();
    expect(screen.getByText('You don\'t have any active bets at the moment. Start by placing your first bet!')).toBeInTheDocument();
  });

  it('calls onAddBet when Add Bet button is clicked', () => {
    render(<ActiveBets {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Add Bet'));
    expect(defaultProps.onAddBet).toHaveBeenCalledTimes(1);
  });

  it('calls onLearnMore when Learn more button is clicked', () => {
    render(<ActiveBets {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Learn more'));
    expect(defaultProps.onLearnMore).toHaveBeenCalledTimes(1);
  });

  it('handles keyboard navigation', () => {
    render(<ActiveBets {...defaultProps} />);
    
    const carousel = screen.getByRole('region', { name: 'Active bets carousel' });
    
    // Focus the carousel
    carousel.focus();
    expect(carousel).toHaveFocus();
    
    // Test arrow key navigation (this would require more complex mocking of scroll behavior)
    fireEvent.keyDown(carousel, { key: 'ArrowRight' });
    // In a real test, we'd mock the scroll behavior and test it
  });

  it('shows navigation arrows when content overflows', async () => {
    // Mock scrollWidth to be larger than clientWidth to trigger arrows
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
      configurable: true,
      value: 1000,
    });
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      value: 500,
    });

    render(<ActiveBets {...defaultProps} />);
    
    // Wait for the component to update scroll state
    await waitFor(() => {
      const rightArrow = screen.queryByLabelText('Scroll right');
      expect(rightArrow).toBeInTheDocument();
    });
  });

  it('renders with accessibility attributes', () => {
    render(<ActiveBets {...defaultProps} />);
    
    const carousel = screen.getByRole('region', { name: 'Active bets carousel' });
    expect(carousel).toHaveAttribute('tabIndex', '0');
    
    // Check that bet cards have proper accessibility attributes
    const betCards = screen.getAllByRole('button');
    betCards.forEach(card => {
      expect(card).toHaveAttribute('tabIndex', '0');
      expect(card).toHaveAttribute('aria-label');
    });
  });
});
