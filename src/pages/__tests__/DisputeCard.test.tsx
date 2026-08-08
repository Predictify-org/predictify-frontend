import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DisputeCard } from '../DisputeCard';
import type { DisputeData } from '@/types/disputes';
import { mockDisputesByState } from '@/components/disputes/mock-data';

describe('DisputeCard', () => {
  const baseData: DisputeData = {
    id: 'test-001',
    eventTitle: 'Will ETH reach $5,000 by end of Q4 2025?',
    state: 'none',
    openCost: 50,
  };

  it('renders the card with correct aria-label', () => {
    render(<DisputeCard data={baseData} />);
    expect(screen.getByTestId('dispute-card')).toHaveAttribute(
      'aria-label',
      `Dispute for ${baseData.eventTitle}`,
    );
  });

  it('applies the .dispute-card class for CSS targeting', () => {
    render(<DisputeCard data={baseData} />);
    expect(screen.getByTestId('dispute-card')).toHaveClass('dispute-card');
  });

  it('renders the event title', () => {
    render(<DisputeCard data={baseData} />);
    expect(screen.getByText(baseData.eventTitle)).toBeInTheDocument();
  });

  it('renders the state badge', () => {
    render(<DisputeCard data={baseData} />);
    expect(screen.getByTestId('dispute-state-badge')).toBeInTheDocument();
  });

  it('renders penalty info when provided', () => {
    const dataWithPenalty = { ...baseData, penaltyInfo: 'Losing stakers forfeit tokens.' };
    render(<DisputeCard data={dataWithPenalty} />);
    expect(screen.getByText(dataWithPenalty.penaltyInfo)).toBeInTheDocument();
  });

  it('renders the "Raise Dispute" button in none state', () => {
    const onRaise = jest.fn();
    render(<DisputeCard data={baseData} onRaiseDispute={onRaise} />);
    const btn = screen.getByRole('button', { name: /raise a dispute/i });
    expect(btn).toBeInTheDocument();
  });

  it('calls onRaiseDispute when the button is clicked', async () => {
    const user = userEvent.setup();
    const onRaise = jest.fn();
    render(<DisputeCard data={baseData} onRaiseDispute={onRaise} />);
    await user.click(screen.getByRole('button', { name: /raise a dispute/i }));
    expect(onRaise).toHaveBeenCalledTimes(1);
  });

  it('does not render the Raise Dispute button when a dispute is active', () => {
    const openData = { ...baseData, state: 'open' as const };
    render(<DisputeCard data={openData} />);
    expect(screen.queryByRole('button', { name: /raise a dispute/i })).not.toBeInTheDocument();
  });

  it('renders audit references inside a details accordion', async () => {
    const dataWithAudit: DisputeData = {
      ...baseData,
      state: 'ended',
      auditRefs: [
        { label: 'Audit Report A', url: 'https://example.com/audit-a' },
        { label: 'Audit Report B', url: 'https://example.com/audit-b' },
      ],
    };
    const user = userEvent.setup();
    render(<DisputeCard data={dataWithAudit} />);

    // Initially hidden by the accordion
    expect(screen.queryByText('Audit Report A')).not.toBeInTheDocument();

    // Expand accordion
    await user.click(screen.getByText(/show details/i));
    expect(screen.getByText('Audit Report A')).toBeInTheDocument();
    expect(screen.getByText('Audit Report B')).toBeInTheDocument();
  });

  it('renders audit links with correct attributes', async () => {
    const dataWithAudit: DisputeData = {
      ...baseData,
      state: 'ended',
      auditRefs: [{ label: 'On-chain proof', url: 'https://etherscan.io/tx/0xabc' }],
    };
    const user = userEvent.setup();
    render(<DisputeCard data={dataWithAudit} />);
    await user.click(screen.getByText(/show details/i));

    const link = screen.getByRole('link', { name: /on-chain proof/i });
    expect(link).toHaveAttribute('href', 'https://etherscan.io/tx/0xabc');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('calls onViewAudit when an audit link is clicked', async () => {
    const onViewAudit = jest.fn();
    const ref = { label: 'Ref A', url: 'https://example.com/ref-a' };
    const dataWithAudit: DisputeData = {
      ...baseData,
      state: 'ended',
      auditRefs: [ref],
    };
    const user = userEvent.setup();
    render(<DisputeCard data={dataWithAudit} onViewAudit={onViewAudit} />);
    await user.click(screen.getByText(/show details/i));
    await user.click(screen.getByRole('link', { name: /ref a/i }));
    expect(onViewAudit).toHaveBeenCalledWith(ref);
  });

  it('renders an aria-live region for polite status announcements', () => {
    render(<DisputeCard data={baseData} />);
    const liveRegion = screen.getByTestId('dispute-card-live-region');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    expect(liveRegion).toHaveAttribute('role', 'status');
  });

  it('announces the correct status label for the none state', () => {
    render(<DisputeCard data={baseData} />);
    const liveRegion = screen.getByTestId('dispute-card-live-region');
    // The "none" state label is "No active dispute"
    expect(liveRegion).toHaveTextContent('No active dispute');
  });

  it('announces the correct status label when state changes', () => {
    const { rerender } = render(<DisputeCard data={baseData} />);

    // Initial state: none
    expect(screen.getByTestId('dispute-card-live-region')).toHaveTextContent('No active dispute');

    // Re-render with open state
    const openData = { ...baseData, state: 'open' as const, openCost: 100 };
    rerender(<DisputeCard data={openData} />);
    expect(screen.getByTestId('dispute-card-live-region')).toHaveTextContent('Dispute open — staking');

    // Re-render with voting state
    const votingData = { ...openData, state: 'voting' as const, votingDeadline: new Date('2026-08-15') };
    rerender(<DisputeCard data={votingData} />);
    expect(screen.getByTestId('dispute-card-live-region')).toHaveTextContent('Community voting');
  });

  it('announces the executed state label', () => {
    const executedData = { ...baseData, state: 'executed' as const };
    render(<DisputeCard data={executedData} />);
    expect(screen.getByTestId('dispute-card-live-region')).toHaveTextContent('Outcome executed');
  });

  it('announces the ended state label', () => {
    const endedData = { ...baseData, state: 'ended' as const };
    render(<DisputeCard data={endedData} />);
    expect(screen.getByTestId('dispute-card-live-region')).toHaveTextContent('Voting ended');
  });
});