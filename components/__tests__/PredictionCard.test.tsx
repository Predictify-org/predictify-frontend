import React from 'react';
import { render } from '@testing-library/react';
import PredictionCard from '../PredictionCard';
import { Prediction } from '../../types/predictions';

const createMockPrediction = (category?: string, outcome?: 'Yes' | 'No'): Prediction => ({
  id: 'test-1',
  title: 'Test Prediction',
  description: 'Test Description',
  category,
  outcome,
  stakeAmount: 10,
  stakeToken: 'USDC',
  odds: 1.5,
  potentialWinnings: 15,
  winningsToken: 'USDC',
  eventDate: '01/01/2024',
  status: 'active',
});

describe('PredictionCard Snapshots', () => {
  const categories = ['sports', 'crypto', 'politics', 'weather', 'esports', 'unknown-category'];

  categories.forEach((category) => {
    it(`should match snapshot for category: ${category} with 'Yes' outcome`, () => {
      const { container } = render(
        <PredictionCard prediction={createMockPrediction(category, 'Yes')} />
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it(`should match snapshot for category: ${category} with 'No' outcome`, () => {
      const { container } = render(
        <PredictionCard prediction={createMockPrediction(category, 'No')} />
      );
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  it('should match snapshot without outcome', () => {
    const { container } = render(
      <PredictionCard prediction={createMockPrediction()} />
    );
    expect(container.firstChild).toMatchSnapshot();
import { render, screen } from '@testing-library/react';
import PredictionCard, { PredictionCardSkeleton } from '../PredictionCard';
import { Prediction } from '../../types/predictions';

// --- Test Data ---

const mockPrediction: Prediction = {
  id: '1',
  title: 'NBA Finals: Lakers vs Heat',
  description: 'Lakers to win',
  stakeAmount: 10,
  stakeToken: 'XLM',
  odds: 1.8,
  potentialWinnings: 18,
  winningsToken: 'XLM',
  eventDate: '10/06/2023',
  status: 'active',
};

const mockResolvedPrediction: Prediction = {
  ...mockPrediction,
  id: '2',
  status: 'won',
  resolvedDate: '01/06/2023',
};

// --- PredictionCardSkeleton Tests ---

describe('PredictionCardSkeleton', () => {
  it('renders a skeleton with the correct structure', () => {
    render(<PredictionCardSkeleton />);
    
    const skeleton = screen.getByTestId('prediction-card-skeleton');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveAttribute('aria-busy', 'true');
  });

  it('matches the card shape with correct layout classes', () => {
    render(<PredictionCardSkeleton />);
    
    const skeleton = screen.getByTestId('prediction-card-skeleton');
    expect(skeleton).toHaveClass('bg-card');
    expect(skeleton).toHaveClass('p-4');
    expect(skeleton).toHaveClass('rounded-xl');
    expect(skeleton).toHaveClass('border');
    expect(skeleton).toHaveClass('border-border');
  });

  it('contains animated skeleton bars', () => {
    render(<PredictionCardSkeleton />);
    
    // The Skeleton component uses animate-pulse class
    const animatedElements = document.querySelectorAll('.animate-pulse');
    expect(animatedElements.length).toBeGreaterThan(0);
  });

  it('renders skeleton placeholders for all card sections', () => {
    render(<PredictionCardSkeleton />);
    
    const skeletonBars = document.querySelectorAll('.animate-pulse');
    // Expected: title, badge, 2 description lines, 
    // 2 per grid cell (label + value) * 4 cells = 8,
    // 2 for resolved date row = 12 total
    expect(skeletonBars.length).toBe(14);
  });
});

// --- PredictionCard Tests ---

describe('PredictionCard', () => {
  it('renders skeleton when prediction is undefined', () => {
    render(<PredictionCard />);
    
    const skeleton = screen.getByTestId('prediction-card-skeleton');
    expect(skeleton).toBeInTheDocument();
  });

  it('renders skeleton when prediction is null', () => {
    // @ts-expect-error - null is not assignable to Prediction | undefined; testing runtime guard
    render(<PredictionCard prediction={null} />);
    
    const skeleton = screen.getByTestId('prediction-card-skeleton');
    expect(skeleton).toBeInTheDocument();
  });

  it('renders full card content when prediction is provided', () => {
    render(<PredictionCard prediction={mockPrediction} />);
    
    expect(screen.getByText(mockPrediction.title)).toBeInTheDocument();
    expect(screen.getByText(mockPrediction.description)).toBeInTheDocument();
    expect(screen.getByText(/10 XLM/)).toBeInTheDocument();
    expect(screen.getByText(/1.8x/)).toBeInTheDocument();
    expect(screen.getByText(/18 XLM/)).toBeInTheDocument();
    expect(screen.getByText(mockPrediction.eventDate)).toBeInTheDocument();
  });

  it('renders status badge with correct label', () => {
    render(<PredictionCard prediction={mockPrediction} />);
    
    expect(screen.getByLabelText('Status: Active')).toBeInTheDocument();
  });

  it('renders resolved date when status is won', () => {
    render(<PredictionCard prediction={mockResolvedPrediction} />);
    
    expect(screen.getByText('Resolved')).toBeInTheDocument();
    expect(screen.getByText('01/06/2023')).toBeInTheDocument();
  });

  it('does not render resolved date for pending predictions', () => {
    const pendingPrediction: Prediction = { ...mockPrediction, status: 'pending' };
    render(<PredictionCard prediction={pendingPrediction} />);
    
    expect(screen.queryByText('Resolved')).toBeNull();
  });

  it('does not crash with skeleton when prediction is undefined', () => {
    const { container } = render(<PredictionCard />);
    expect(container).toBeTruthy();
  });
});

// --- PredictionsList Loading Tests ---

import PredictionsList from '../PredictionsList';

describe('PredictionsList loading state', () => {
  it('renders skeleton cards when isLoading is true', () => {
    render(<PredictionsList isLoading={true} />);
    
    const skeletons = screen.getAllByTestId('prediction-card-skeleton');
    expect(skeletons).toHaveLength(4); // default skeletonCount
  });

  it('renders custom number of skeleton cards', () => {
    render(<PredictionsList isLoading={true} skeletonCount={6} />);
    
    const skeletons = screen.getAllByTestId('prediction-card-skeleton');
    expect(skeletons).toHaveLength(6);
  });

  it('renders prediction cards when not loading', () => {
    render(<PredictionsList isLoading={false} />);
    
    // Should find actual prediction titles from mock data
    expect(screen.getByText('NBA Finals: Lakers vs Heat')).toBeInTheDocument();
  });

  it('does not show skeletons when isLoading is false', () => {
    render(<PredictionsList isLoading={false} />);
    
    const skeletons = screen.queryAllByTestId('prediction-card-skeleton');
    expect(skeletons).toHaveLength(0);
  });

  it('does not show empty state text when loading', () => {
    render(<PredictionsList isLoading={true} />);
    
    expect(screen.queryByText(/No predictions found/)).toBeNull();
  });
});
