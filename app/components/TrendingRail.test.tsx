/**
 * TrendingRail.test.tsx – Unit tests for TrendingRail component
 *
 * Coverage:
 *   - Loading state with skeleton
 *   - Error state with retry
 *   - Empty state with CTA
 *   - Renders data when available
 *   - Responsive and accessible
 *   - Optimistic UI on primary action with revert on failure
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TrendingRail } from './TrendingRail';

// Mock fetch
global.fetch = jest.fn();

const mockItems = [
  { id: '1', title: 'Bitcoin', value: 45000, change: 2.5, trend: 'up' },
  { id: '2', title: 'Ethereum', value: 2500, change: -1.2, trend: 'down' },
];

describe('TrendingRail Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
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
      json: async () => mockItems,
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
      json: async () => mockItems,
    });

    render(<TrendingRail />);

    await waitFor(() => {
      expect(screen.getByText('+2.50%')).toBeInTheDocument();
      expect(screen.getByText('-1.20%')).toBeInTheDocument();
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

  describe('Optimistic UI on primary action', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockItems,
      });
    });

    it('renders each card as a clickable button', async () => {
      render(<TrendingRail />);

      await waitFor(() => {
        const cards = screen.getAllByRole('button');
        // Each trending item becomes a button, plus any other buttons
        expect(cards.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('shows optimistic state immediately on card click', async () => {
      // Mock the action API to delay so we can see the optimistic state
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockItems,
      });

      render(<TrendingRail />);

      await waitFor(() => {
        expect(screen.getByText('Bitcoin')).toBeInTheDocument();
      });

      // Click the Bitcoin card
      const bitcoinCard = screen.getByRole('button', { name: /Bitcoin/i });
      fireEvent.click(bitcoinCard);

      // The card should now show the optimistic spinner
      // After clicking, fetch is called for the action API
      await waitFor(() => {
        // The card should have aria-pressed="true" when in optimistic state
        expect(bitcoinCard).toHaveAttribute('aria-pressed', 'true');
      });
    });

    it('reverts optimistic state on action failure', async () => {
      // Mock the action API to fail
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockItems,
        })
        .mockRejectedValueOnce(new Error('Network error'));

      render(<TrendingRail />);

      await waitFor(() => {
        expect(screen.getByText('Bitcoin')).toBeInTheDocument();
      });

      const bitcoinCard = screen.getByRole('button', { name: /Bitcoin/i });
      fireEvent.click(bitcoinCard);

      await waitFor(() => {
        // The error toast should appear
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/Network error/)).toBeInTheDocument();
      });

      // The card should no longer be in optimistic state
      expect(bitcoinCard).toHaveAttribute('aria-pressed', 'false');
    });

    it('shows optimistic state and clears it on success', async () => {
      // Mock the action API to succeed
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockItems,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      render(<TrendingRail />);

      await waitFor(() => {
        expect(screen.getByText('Bitcoin')).toBeInTheDocument();
      });

      const bitcoinCard = screen.getByRole('button', { name: /Bitcoin/i });
      fireEvent.click(bitcoinCard);

      // Initially it should show optimistic state
      expect(bitcoinCard).toHaveAttribute('aria-pressed', 'true');

      // After the success delay, the optimistic state should clear
      jest.advanceTimersByTime(500);

      await waitFor(() => {
        expect(bitcoinCard).toHaveAttribute('aria-pressed', 'false');
      });
    });

    it('disables other cards while one is in optimistic state', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockItems,
        })
        .mockReturnValueOnce(
          new Promise(() => {}) // Never resolves — keeps optimistic state
        );

      render(<TrendingRail />);

      await waitFor(() => {
        expect(screen.getByText('Bitcoin')).toBeInTheDocument();
      });

      const bitcoinCard = screen.getByRole('button', { name: /Bitcoin/i });
      const ethCard = screen.getByRole('button', { name: /Ethereum/i });

      fireEvent.click(bitcoinCard);

      // The Ethereum card should be disabled
      expect(ethCard).toBeDisabled();
    });
  });
});