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

  it('handles keyboard navigation', async () => {
    const scrollToMock = jest.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      value: scrollToMock,
      writable: true
    });

    // Mock overflow to enable scrolling
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
      configurable: true,
      value: 1000,
    });
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      value: 500,
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollLeft', {
      configurable: true,
      value: 100, // Not at the start, so can scroll left
    });

    render(<ActiveBets {...defaultProps} />);
    
    const carousel = screen.getByRole('region', { name: 'Active bets carousel' });
    
    // Focus the carousel
    carousel.focus();
    expect(carousel).toHaveFocus();
    
    // Wait for scroll state to update
    await waitFor(() => {
      // Test arrow key navigation - should work now that we have overflow
      fireEvent.keyDown(carousel, { key: 'ArrowRight' });
      expect(scrollToMock).toHaveBeenCalled();
    });
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

    // Check that bet cards are rendered and are interactive elements
    const betCards = document.querySelectorAll('[role="button"]');
    expect(betCards.length).toBeGreaterThan(0);

    // Check that bet cards are focusable
    betCards.forEach(card => {
      expect(card).toHaveAttribute('tabIndex', '0');
    });
  });

  it('handles scroll arrow clicks', async () => {
    const scrollToMock = jest.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      value: scrollToMock,
      writable: true
    });

    // Mock overflow to show arrows
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
      configurable: true,
      value: 1000,
    });
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      value: 500,
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollLeft', {
      configurable: true,
      value: 0, // At the start, so can scroll right
    });

    render(<ActiveBets {...defaultProps} />);
    
    // Wait for scroll state to update and arrows to appear
    await waitFor(() => {
      const rightArrow = screen.getByLabelText('Scroll right');
      fireEvent.click(rightArrow);
      expect(scrollToMock).toHaveBeenCalled();
    });
  });

  it('handles touch scroll events', () => {
    render(<ActiveBets {...defaultProps} />);
    
    const carousel = screen.getByRole('region', { name: 'Active bets carousel' });
    
    // Simulate touch drag
    fireEvent.touchStart(carousel, {
      touches: [{ clientX: 100, clientY: 0 }]
    });
    
    fireEvent.touchMove(carousel, {
      touches: [{ clientX: 50, clientY: 0 }]
    });
    
    fireEvent.touchEnd(carousel);
    
    // Should not throw errors
    expect(carousel).toBeInTheDocument();
  });

  it('updates scroll state on scroll events', () => {
    render(<ActiveBets {...defaultProps} />);
    
    const carousel = screen.getByRole('region', { name: 'Active bets carousel' });
    
    // Mock the scrollLeft property to be writable
    Object.defineProperty(carousel, 'scrollLeft', {
      value: 100,
      writable: true,
      configurable: true
    });
    
    // Simulate scroll event without trying to set scrollLeft in the event
    fireEvent.scroll(carousel);
    
    // Component should handle scroll without errors
    expect(carousel).toBeInTheDocument();
  });
});
