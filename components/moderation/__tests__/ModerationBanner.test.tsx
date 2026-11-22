import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { ModerationBanner } from '../ModerationBanner';
import { MarketStatusBadge } from '../MarketStatusBadge';
import { MODERATION_CONFIG } from '../moderation-config';
import type { ModerationState } from '@/types/moderation';

describe('ModerationBanner', () => {
  it('renders standard moderation states correctly', () => {
    const states: ModerationState[] = [
      'under_review',
      'paused',
      'restricted',
      'flagged',
      'removed',
      'resolving',
    ];

    for (const state of states) {
      const { unmount } = render(<ModerationBanner state={state} />);
      const config = MODERATION_CONFIG[state];
      expect(screen.getByText(config.title)).toBeInTheDocument();
      expect(screen.getByText(config.description)).toBeInTheDocument();
      expect(screen.getByLabelText(`Market status: ${config.label}`)).toBeInTheDocument();
      unmount();
    }
  });

  it('renders the reported / "under community report" state', () => {
    render(<ModerationBanner state="reported" />);
    const config = MODERATION_CONFIG.reported;

    expect(screen.getByText(config.title)).toBeInTheDocument();
    expect(screen.getByText(config.description)).toBeInTheDocument();
    expect(
      screen.getByLabelText(`Market status: ${config.label}`)
    ).toBeInTheDocument();
  });

  it('renders the reported state when report threshold flag is set', () => {
    // When state is under_review but reportThresholdReached is true, should render reported state
    render(<ModerationBanner state="under_review" reportThresholdReached={true} />);
    const config = MODERATION_CONFIG.reported;

    expect(screen.getByText(config.title)).toBeInTheDocument();
    expect(
      screen.getByLabelText(`Market status: ${config.label}`)
    ).toBeInTheDocument();
  });

  it('allows overriding the learnMoreHref', () => {
    render(<ModerationBanner state="reported" learnMoreHref="/custom/help" />);
    const link = screen.getByRole('link', { name: /Learn more about/i });
    expect(link).toHaveAttribute('href', '/custom/help');
  });
});

describe('MarketStatusBadge', () => {
  it('renders the reported state badge with accessible text', () => {
    render(<MarketStatusBadge state="reported" showTooltip={false} />);
    const badge = screen.getByRole('status');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent(MODERATION_CONFIG.reported.label);
    expect(badge).toHaveAttribute(
      'aria-label',
      `Market status: ${MODERATION_CONFIG.reported.label}`
    );
  });
});
