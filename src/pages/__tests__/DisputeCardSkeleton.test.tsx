import { render, screen } from '@testing-library/react';
import { DisputeCardSkeleton } from '../DisputeCardSkeleton';

describe('DisputeCardSkeleton', () => {
  it('renders the skeleton with correct test id', () => {
    render(<DisputeCardSkeleton />);
    expect(screen.getByTestId('dispute-card-skeleton')).toBeInTheDocument();
  });

  it('has accessible loading role', () => {
    render(<DisputeCardSkeleton />);
    expect(screen.getByTestId('dispute-card-skeleton')).toHaveAttribute('role', 'status');
  });

  it('indicates busy state', () => {
    render(<DisputeCardSkeleton />);
    expect(screen.getByTestId('dispute-card-skeleton')).toHaveAttribute('aria-busy', 'true');
  });

  it('has a sr-only loading message', () => {
    render(<DisputeCardSkeleton />);
    expect(screen.getByText('Loading dispute details…')).toBeInTheDocument();
  });

  it('renders the header with title shards', () => {
    const { container } = render(<DisputeCardSkeleton />);
    // The CardHeader contains two Skeleton shards for title + badge
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThanOrEqual(8);
  });

  it('renders footer with state label and action button shards', () => {
    render(<DisputeCardSkeleton />);
    // The CardFooter is inside the Card component
    expect(screen.getByTestId('dispute-card-skeleton')).toBeInTheDocument();
  });
});
