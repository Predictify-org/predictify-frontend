import { render, screen } from '@testing-library/react';
import { MarketStatusBadge } from '../MarketStatusBadge';
import type { ModerationState } from '@/types/moderation';

// The animation class uses the Tailwind `motion-safe:` variant so the pulse is
// suppressed automatically when the user has enabled "prefers-reduced-motion".
const PULSE_CLASS = 'motion-safe:animate-status-live-pulse';

describe('MarketStatusBadge', () => {
  it('renders the resolving badge with a live glow-pulse class', () => {
    render(<MarketStatusBadge state="resolving" showTooltip={false} />);

    const badge = screen.getByRole('status');
    expect(badge).toHaveClass(PULSE_CLASS);
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
      expect(badge).not.toHaveClass(PULSE_CLASS);
      expect(badge.getAttribute('aria-label')).not.toContain('Resolving now');
    }
  );

  it('removes the pulse and "Resolving now" announcement when transitioning away from resolving', () => {
    const { rerender } = render(<MarketStatusBadge state="resolving" showTooltip={false} />);

    let badge = screen.getByRole('status');
    expect(badge).toHaveClass(PULSE_CLASS);

    rerender(<MarketStatusBadge state="removed" showTooltip={false} />);

    badge = screen.getByRole('status');
    expect(badge).not.toHaveClass(PULSE_CLASS);
    expect(badge.getAttribute('aria-label')).not.toContain('Resolving now');
  });
});
