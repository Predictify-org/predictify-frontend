import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PredictionCard, { PredictionCardSkeleton } from '../PredictionCard';
import PredictionsList from '../PredictionsList';
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

// --- Tooltip Tests ---

describe('PredictionCard tooltips', () => {
  it('renders tooltip content on the status icon when hovered', async () => {
    const user = userEvent.setup();
    render(<PredictionCard prediction={mockPrediction} />);

    // The Tooltip component wraps the icon. On hover, the tooltip content should appear.
    // Instead of targeting the icon directly (which is aria-hidden), hover the status badge area.
    const statusBadge = screen.getByLabelText('Status: Active');
    await user.hover(statusBadge);

    // The tooltip for 'active' status should appear
    expect(await screen.findByText('This prediction is currently active')).toBeInTheDocument();
  });

  it('renders correct tooltip content for each status variant', async () => {
    const user = userEvent.setup();
    const statuses: Array<{ status: Prediction['status']; tooltip: string }> = [
      { status: 'won', tooltip: 'This prediction was correct' },
      { status: 'lost', tooltip: 'This prediction was incorrect' },
      { status: 'pending', tooltip: 'This prediction is awaiting resolution' },
    ];

    for (const { status, tooltip } of statuses) {
      const prediction: Prediction = {
        ...mockPrediction,
        id: `${status}-test`,
        status,
        ...(status === 'won' || status === 'lost' ? { resolvedDate: '01/06/2023' } : {}),
      };
      const { unmount } = render(<PredictionCard prediction={prediction} />);

      const badge = screen.getByLabelText(`Status: ${status.charAt(0).toUpperCase() + status.slice(1)}`);
      await user.hover(badge);
      expect(await screen.findByText(tooltip)).toBeInTheDocument();

      unmount();
    }
  });

  it('shows odds expand/collapse tooltip on the odds trigger', async () => {
    const user = userEvent.setup();
    render(<PredictionCard prediction={mockPrediction} />);

    // Hover over the odds trigger button
    const oddsTrigger = document.querySelector('[aria-controls="odds-breakdown"]') as HTMLElement;
    await user.hover(oddsTrigger);

    // Should show the expand tooltip initially
    expect(await screen.findByText('Click to expand odds details')).toBeInTheDocument();
  });

  it('updates odds tooltip after expanding', async () => {
    const user = userEvent.setup();
    render(<PredictionCard prediction={mockPrediction} />);

    const oddsTrigger = document.querySelector('[aria-controls="odds-breakdown"]') as HTMLElement;

    // Click to expand
    await user.click(oddsTrigger);
    expect(oddsTrigger).toHaveAttribute('aria-expanded', 'true');

    // Now hover again - should show "collapse" tooltip
    await user.hover(oddsTrigger);
    expect(await screen.findByText('Click to collapse odds details')).toBeInTheDocument();
  });

  it('does not show tooltip content by default (no hover)', () => {
    render(<PredictionCard prediction={mockPrediction} />);

    expect(screen.queryByText('This prediction is currently active')).toBeNull();
    expect(screen.queryByText('Click to expand odds details')).toBeNull();
  });
});

// --- Touch Target Tests (WCAG 2.5.5 / Apple HIG ≥44px) ---

describe('PredictionCard touch targets', () => {
  it('outer card button has touch-target and touch-ripple classes', () => {
    render(<PredictionCard prediction={mockPrediction} />);
    // The root interactive element must carry the touch-target utility class
    // which enforces min-height: 44px and min-width: 44px.
    const card = screen.getByRole('button', { name: /NBA Finals/i });
    expect(card).toHaveClass('touch-target');
    expect(card).toHaveClass('touch-ripple');
  });

  it('odds collapsible trigger has touch-target and touch-ripple classes', () => {
    render(<PredictionCard prediction={mockPrediction} />);
    // Query specifically by aria-controls to distinguish from the outer card button.
    const oddsTrigger = document.querySelector('[aria-controls="odds-breakdown"]') as HTMLElement;
    expect(oddsTrigger).toHaveClass('touch-target');
    expect(oddsTrigger).toHaveClass('touch-ripple');
  });

  it('odds trigger uses aria-expanded to reflect collapsed state', () => {
    render(<PredictionCard prediction={mockPrediction} />);
    const oddsTrigger = document.querySelector('[aria-controls="odds-breakdown"]') as HTMLElement;
    expect(oddsTrigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('odds trigger uses aria-expanded to reflect expanded state after click', async () => {
    const user = userEvent.setup();
    render(<PredictionCard prediction={mockPrediction} />);
    const oddsTrigger = document.querySelector('[aria-controls="odds-breakdown"]') as HTMLElement;
    await user.click(oddsTrigger);
    expect(oddsTrigger).toHaveAttribute('aria-expanded', 'true');
  });
});