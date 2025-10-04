import React from 'react';
import { render, screen } from '@testing-library/react';
import { ActiveBetCard } from '../ActiveBetCard';
import { Bet } from '@/lib/types';

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} alt={props.alt} />,
}));

describe('ActiveBetCard', () => {
  const mockBet: Bet = {
    id: '1',
    title: 'Test Match',
    category: {
      name: 'Football',
      color: 'football'
    },
    thumbnail: '/test-image.jpg',
    startDate: new Date('2025-12-12T20:00:00'),
    endDate: new Date('2025-12-12T22:00:00'),
    timeRemaining: '90:09:32:55',
    progress: 75,
    status: 'active',
    odds: 2.5,
    amount: 100,
    currency: 'XLM'
  };

  it('renders bet information correctly', () => {
    render(<ActiveBetCard bet={mockBet} />);
    
    expect(screen.getByText('Test Match')).toBeInTheDocument();
    expect(screen.getByText('Football')).toBeInTheDocument();
    
    // Both start and end dates should be present
    const dates = screen.getAllByText('Dec 12, 2025');
    expect(dates).toHaveLength(2);
  });

  it('displays category chip with correct styling', () => {
    render(<ActiveBetCard bet={mockBet} />);
    
    const categoryChip = screen.getByText('Football');
    expect(categoryChip).toHaveClass('text-blue-400'); // Football category color
  });

  it('shows start and end dates', () => {
    render(<ActiveBetCard bet={mockBet} />);
    
    // Both start and end dates should show "Dec 12, 2025" for this mock
    const dates = screen.getAllByText('Dec 12, 2025');
    expect(dates).toHaveLength(2);
  });

  it('displays time remaining in correct format', () => {
    render(<ActiveBetCard bet={mockBet} />);
    
    // Should show formatted time (90d 09h for this example)
    expect(screen.getByText('90d 09h')).toBeInTheDocument();
  });

  it('shows progress bar with correct width', () => {
    render(<ActiveBetCard bet={mockBet} />);
    
    const progressBar = document.querySelector('[style*="width: 75%"]');
    expect(progressBar).toBeInTheDocument();
  });

  it('renders image with correct attributes', () => {
    render(<ActiveBetCard bet={mockBet} />);
    
    const image = screen.getByAltText('Test Match');
    expect(image).toHaveAttribute('src', '/test-image.jpg');
  });

  it('has proper accessibility attributes', () => {
    render(<ActiveBetCard bet={mockBet} />);
    
    const card = screen.getByRole('button', { name: 'Active bet: Test Match' });
    expect(card).toHaveAttribute('tabIndex', '0');
  });

  it('applies custom className', () => {
    render(<ActiveBetCard bet={mockBet} className="custom-class" />);
    
    const card = screen.getByRole('button');
    expect(card).toHaveClass('custom-class');
  });

  it('formats time remaining for different scenarios', () => {
    // Test with hours/minutes/seconds only
    const betWithShortTime = {
      ...mockBet,
      timeRemaining: '00:02:30:45'
    };
    
    const { rerender } = render(<ActiveBetCard bet={betWithShortTime} />);
    expect(screen.getByText('02:30:45')).toBeInTheDocument();
    
    // Test with days
    const betWithDays = {
      ...mockBet,
      timeRemaining: '05:10:30:45'
    };
    
    rerender(<ActiveBetCard bet={betWithDays} />);
    expect(screen.getByText('05d 10h')).toBeInTheDocument();
  });

  it('renders different category colors correctly', () => {
    const politicsBet = {
      ...mockBet,
      category: { name: 'Politics', color: 'politics' as const }
    };
    
    render(<ActiveBetCard bet={politicsBet} />);
    
    const categoryChip = screen.getByText('Politics');
    expect(categoryChip).toHaveClass('text-green-400'); // Politics category color
  });
});
