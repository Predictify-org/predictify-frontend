/**
 * TrendingRail.test.tsx – Unit tests for TrendingRail component
 *
 * Coverage:
 *   - Loading state with skeleton
 *   - Error state with retry
 *   - Empty state with CTA
 *   - Renders data when available
 *   - Responsive and accessible
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TrendingRail } from './TrendingRail';

// Mock fetch
global.fetch = jest.fn();

describe('TrendingRail Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading skeleton initially', () => {
    (global.fetch as jest.Mock).mockImplementationOnce(
      () => new Promise(() => {}) // Never resolves
    );

    render(<TrendingRail />);
    expect(screen.getByRole('status', { hidden: true })).toHaveAttribute('aria-busy', 'true');
  });

  it('renders empty state when no data', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(<TrendingRail />);

    await waitFor(() => {
      expect(screen.getByText('No trending data yet')).toBeInTheDocument();
      expect(screen.getByText(/Check back soon/)).toBeInTheDocument();
    });
  });

  it('shows error state on fetch failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
    });

    render(<TrendingRail />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Failed to load/)).toBeInTheDocument();
    });
  });

  it('retries fetch on error button click', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: '1', title: 'Test', value: 100, change: 5, trend: 'up' },
        ],
      });

    render(<TrendingRail />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    const retryButton = screen.getByRole('button', { name: /Try again/i });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('Test')).toBeInTheDocument();
    });
  });

  it('renders trending items when data available', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: '1', title: 'Bitcoin', value: 45000, change: 2.5, trend: 'up' },
        { id: '2', title: 'Ethereum', value: 2500, change: -1.2, trend: 'down' },
      ],
    });

    render(<TrendingRail />);

    await waitFor(() => {
      expect(screen.getByText('Bitcoin')).toBeInTheDocument();
      expect(screen.getByText('Ethereum')).toBeInTheDocument();
      expect(screen.getByText('45000')).toBeInTheDocument();
      expect(screen.getByText('2500')).toBeInTheDocument();
    });
  });

  it('refresh button in empty state refetches data', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: '1', title: 'Test', value: 100, change: 5, trend: 'up' },
        ],
      });

    render(<TrendingRail />);

    await waitFor(() => {
      expect(screen.getByText('No trending data yet')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /Refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(screen.getByText('Test')).toBeInTheDocument();
    });
  });

  it('displays trending indicator (up/down) correctly', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: '1', title: 'Up Trend', value: 100, change: 5, trend: 'up' },
        { id: '2', title: 'Down Trend', value: 100, change: -3, trend: 'down' },
      ],
    });

    render(<TrendingRail />);

    await waitFor(() => {
      expect(screen.getByText('+5.00%')).toBeInTheDocument();
      expect(screen.getByText('-3.00%')).toBeInTheDocument();
    });
  });

  it('is keyboard accessible', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(<TrendingRail />);

    await waitFor(() => {
      const refreshButton = screen.getByRole('button', { name: /Refresh/i });
      refreshButton.focus();
      expect(refreshButton).toHaveFocus();
    });
  });
});
