import React from 'react';
import { readFileSync } from 'fs';
import path from 'path';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PredictionCard, { PredictionCardSkeleton } from '../PredictionCard';
import PredictionsList from '../PredictionsList';
import type { Prediction } from '../../types/predictions';

const mockPrediction: Prediction = {
  id: '1',
  title: 'NBA Finals: Lakers vs Heat',
  description: 'Lakers to win',
  category: 'sports',
  outcome: 'Yes',
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

describe('PredictionCardSkeleton', () => {
  it('renders a busy skeleton with the card shape', () => {
    render(<PredictionCardSkeleton />);

    const skeleton = screen.getByTestId('prediction-card-skeleton');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveAttribute('aria-busy', 'true');
    expect(skeleton).toHaveClass('bg-card', 'p-4', 'rounded-xl', 'border', 'border-border');
  });

  it('renders animated placeholders for all card sections', () => {
    render(<PredictionCardSkeleton />);

    expect(document.querySelectorAll('.animate-pulse')).toHaveLength(14);
  });
});

describe('PredictionCard', () => {
  it('renders skeleton when prediction is missing', () => {
    render(<PredictionCard />);

    expect(screen.getByTestId('prediction-card-skeleton')).toBeInTheDocument();
  });

  it('renders full card content when prediction is provided', () => {
    render(<PredictionCard prediction={mockPrediction} />);

    expect(screen.getByText(mockPrediction.title)).toBeInTheDocument();
    expect(screen.getByText(mockPrediction.description)).toBeInTheDocument();
    expect(screen.getByText(/10 XLM/)).toBeInTheDocument();
    expect(screen.getByText(/1.8x/)).toBeInTheDocument();
    expect(screen.getByText(/18 XLM/)).toBeInTheDocument();
    expect(screen.getByText(mockPrediction.eventDate)).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
  });

  it('renders status and resolved metadata conditionally', () => {
    const { rerender } = render(<PredictionCard prediction={mockPrediction} />);

    expect(screen.getByLabelText('Status: Active')).toBeInTheDocument();
    expect(screen.queryByText('Resolved')).not.toBeInTheDocument();

    rerender(<PredictionCard prediction={mockResolvedPrediction} />);

    expect(screen.getByLabelText('Status: Won')).toBeInTheDocument();
    expect(screen.getByText('Resolved')).toBeInTheDocument();
    expect(screen.getByText('01/06/2023')).toBeInTheDocument();
  });

  it('adds ripple-ready touch feedback classes to the root card button', () => {
    render(<PredictionCard prediction={mockPrediction} />);

    const card = screen.getByRole('button', { name: /NBA Finals/i });
    expect(card).toHaveClass('touch-target', 'touch-ripple', 'relative', 'overflow-hidden');
  });

  it('keeps the odds trigger as a stable touch target', async () => {
    const user = userEvent.setup();
    render(<PredictionCard prediction={mockPrediction} />);

    const oddsTrigger = document.querySelector('[aria-controls="odds-breakdown"]') as HTMLElement;
    expect(oddsTrigger).toHaveClass('touch-target');
    expect(oddsTrigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(oddsTrigger);

    expect(oddsTrigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('does not nest button elements inside the card button', () => {
    const { container } = render(<PredictionCard prediction={mockPrediction} />);

    expect(container.querySelector('button button')).toBeNull();
  });
});

describe('PredictionCard touch ripple styles', () => {
  const touchCss = readFileSync(path.join(process.cwd(), 'app/styles/touch.css'), 'utf8');

  it('implements the ripple with a pseudo-element triggered by active press state', () => {
    expect(touchCss).toContain('.touch-ripple::after');
    expect(touchCss).toContain('.touch-ripple:active::after');
    expect(touchCss).toContain('radial-gradient');
  });

  it('respects reduced-motion preferences', () => {
    expect(touchCss).toContain('@media (prefers-reduced-motion: reduce)');
    expect(touchCss).toContain('transition: none');
  });
});

describe('PredictionsList loading state', () => {
  it('renders skeleton cards when loading', () => {
    render(<PredictionsList isLoading />);

    expect(screen.getAllByTestId('prediction-card-skeleton')).toHaveLength(4);
  });

  it('renders prediction cards when not loading', () => {
    render(<PredictionsList isLoading={false} />);

    expect(screen.getByText('NBA Finals: Lakers vs Heat')).toBeInTheDocument();
    expect(screen.queryAllByTestId('prediction-card-skeleton')).toHaveLength(0);
  });
});
