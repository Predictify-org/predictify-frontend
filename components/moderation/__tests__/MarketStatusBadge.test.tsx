import { render, screen } from '@testing-library/react';
import { MarketStatusBadge } from '../MarketStatusBadge';
import type { ModerationState } from '@/types/moderation';

// Mock AccessibilityContext
jest.mock('@/context/AccessibilityContext', () => ({
  useAccessibility: jest.fn(() => ({
    reduceMotion: false,
    disableParallax: false,
    disableAutoplay: false,
    increaseContrast: false,
    setReduceMotion: jest.fn(),
    setDisableParallax: jest.fn(),
    setDisableAutoplay: jest.fn(),
    setIncreaseContrast: jest.fn(),
  })),
}));

const { useAccessibility } = require('@/context/AccessibilityContext');

describe('MarketStatusBadge', () => {
  beforeEach(() => {
    // Reset to default (motion enabled) before each test
    useAccessibility.mockReturnValue({
      reduceMotion: false,
      disableParallax: false,
      disableAutoplay: false,
      increaseContrast: false,
      setReduceMotion: jest.fn(),
      setDisableParallax: jest.fn(),
      setDisableAutoplay: jest.fn(),
      setIncreaseContrast: jest.fn(),
    });
  });

  it('renders the resolving badge with a live glow-pulse class', () => {
    render(<MarketStatusBadge state="resolving" showTooltip={false} />);

    const badge = screen.getByRole('status');
    expect(badge).toHaveClass('animate-status-live-pulse');
  });

  it('announces "Resolving now" in the aria-label for the resolving state', () => {
    render(<MarketStatusBadge state="resolving" showTooltip={false} />);

    const badge = screen.getByRole('status');
    expect(badge.getAttribute('aria-label')).toContain('Resolving now');
  });

  it.each<ModerationState>(['under_review', 'paused', 'restricted', 'flagged', 'removed'])(
    'does not apply the pulse to the %s state',
    (state) => {
      render(<MarketStatusBadge state={state} showTooltip={false} />);

      const badge = screen.getByRole('status');
      expect(badge).not.toHaveClass('animate-status-live-pulse');
      expect(badge.getAttribute('aria-label')).not.toContain('Resolving now');
    }
  );

  it('removes the pulse and "Resolving now" announcement when transitioning away from resolving', () => {
    const { rerender } = render(<MarketStatusBadge state="resolving" showTooltip={false} />);

    let badge = screen.getByRole('status');
    expect(badge).toHaveClass('animate-status-live-pulse');

    rerender(<MarketStatusBadge state="removed" showTooltip={false} />);

    badge = screen.getByRole('status');
    expect(badge).not.toHaveClass('animate-status-live-pulse');
    expect(badge.getAttribute('aria-label')).not.toContain('Resolving now');
  });

  // ── Reduced-motion tests (Quality-2 High) ────────────────────────────────
  describe('reduced-motion accessibility', () => {
    it('suppresses the pulse animation when reduceMotion is true', () => {
      useAccessibility.mockReturnValue({
        reduceMotion: true,
        disableParallax: false,
        disableAutoplay: false,
        increaseContrast: false,
        setReduceMotion: jest.fn(),
        setDisableParallax: jest.fn(),
        setDisableAutoplay: jest.fn(),
        setIncreaseContrast: jest.fn(),
      });

      render(<MarketStatusBadge state="resolving" showTooltip={false} />);

      const badge = screen.getByRole('status');
      // Pulse animation class should NOT be applied
      expect(badge).not.toHaveClass('animate-status-live-pulse');
      // Aria-label and icon are still present
      expect(badge.getAttribute('aria-label')).toContain('Resolving now');
      expect(badge).toHaveTextContent('Resolving');
    });

    it('applies the pulse animation when reduceMotion is false', () => {
      useAccessibility.mockReturnValue({
        reduceMotion: false,
        disableParallax: false,
        disableAutoplay: false,
        increaseContrast: false,
        setReduceMotion: jest.fn(),
        setDisableParallax: jest.fn(),
        setDisableAutoplay: jest.fn(),
        setIncreaseContrast: jest.fn(),
      });

      render(<MarketStatusBadge state="resolving" showTooltip={false} />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('animate-status-live-pulse');
    });

    it('non-resolving states are never affected by reduceMotion', () => {
      useAccessibility.mockReturnValue({
        reduceMotion: true,
        disableParallax: false,
        disableAutoplay: false,
        increaseContrast: false,
        setReduceMotion: jest.fn(),
        setDisableParallax: jest.fn(),
        setDisableAutoplay: jest.fn(),
        setIncreaseContrast: jest.fn(),
      });

      render(<MarketStatusBadge state="paused" showTooltip={false} />);

      const badge = screen.getByRole('status');
      // Still no pulse (because paused never has it)
      expect(badge).not.toHaveClass('animate-status-live-pulse');
    });

    it('dynamically respects reduceMotion transitions on rerender', () => {
      useAccessibility.mockReturnValue({
        reduceMotion: false,
        disableParallax: false,
        disableAutoplay: false,
        increaseContrast: false,
        setReduceMotion: jest.fn(),
        setDisableParallax: jest.fn(),
        setDisableAutoplay: jest.fn(),
        setIncreaseContrast: jest.fn(),
      });

      const { rerender } = render(<MarketStatusBadge state="resolving" showTooltip={false} />);
      let badge = screen.getByRole('status');
      expect(badge).toHaveClass('animate-status-live-pulse');

      // User enables reduce-motion
      useAccessibility.mockReturnValue({
        reduceMotion: true,
        disableParallax: false,
        disableAutoplay: false,
        increaseContrast: false,
        setReduceMotion: jest.fn(),
        setDisableParallax: jest.fn(),
        setDisableAutoplay: jest.fn(),
        setIncreaseContrast: jest.fn(),
      });

      rerender(<MarketStatusBadge state="resolving" showTooltip={false} />);
      badge = screen.getByRole('status');
      expect(badge).not.toHaveClass('animate-status-live-pulse');
    });
  });
});
