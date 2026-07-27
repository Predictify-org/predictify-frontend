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
    const ref = { label: 'Ref A', url: 'https://example.com' };
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

  it('renders "View Details" link in ended state', () => {
    render(<DisputeCard data={{ ...baseData, state: 'ended' }} />);
    expect(screen.getByRole('link', { name: /view dispute details/i })).toBeInTheDocument();
  });

  it('supports custom className', () => {
    render(<DisputeCard data={baseData} className="my-custom-class" />);
    expect(screen.getByTestId('dispute-card')).toHaveClass('my-custom-class');
  });
});

describe('DisputeCard focus-visible accessibility', () => {
  const baseData: DisputeData = {
    id: 'focus-001',
    eventTitle: 'Focus Test Event',
    state: 'none',
  };

  it('interactive elements receive focus on Tab key press', async () => {
    const user = userEvent.setup();
    render(<DisputeCard data={baseData} onRaiseDispute={jest.fn()} />);
    const btn = screen.getByRole('button', { name: /raise a dispute/i });

    await user.tab();
    expect(btn).toHaveFocus();
  });

  it('Raise Dispute button is keyboard-activatable', async () => {
    const user = userEvent.setup();
    const onRaise = jest.fn();
    render(<DisputeCard data={baseData} onRaiseDispute={onRaise} />);
    const btn = screen.getByRole('button', { name: /raise a dispute/i });

    btn.focus();
    await user.keyboard('{Enter}');
    expect(onRaise).toHaveBeenCalledTimes(1);
  });

  it('audit accordion is keyboard-expandable', async () => {
    const dataWithAudit: DisputeData = {
      ...baseData,
      state: 'ended',
      auditRefs: [{ label: 'Ref', url: 'https://example.com' }],
    };
    const user = userEvent.setup();
    render(<DisputeCard data={dataWithAudit} />);

    // Tab to the accordion trigger
    await user.tab();
    const trigger = screen.getByText(/show details/i);
    expect(trigger).toHaveFocus();

    // Expand with Enter
    await user.keyboard('{Enter}');
    expect(screen.getByText('Ref')).toBeInTheDocument();
  });
});

describe('DisputeCard renders all states', () => {
  it('renders none state with raise-dispute button', () => {
    render(<DisputeCard data={mockDisputesByState.none} onRaiseDispute={jest.fn()} />);
    expect(screen.getByTestId('dispute-card')).toBeInTheDocument();
    expect(screen.getByText(mockDisputesByState.none.eventTitle)).toBeInTheDocument();
    expect(screen.getByText('No active dispute')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /raise/i })).toBeInTheDocument();
  });

  it('renders open state with staking deadline', () => {
    render(<DisputeCard data={mockDisputesByState.open} />);
    expect(screen.getByText(mockDisputesByState.open.eventTitle)).toBeInTheDocument();
    expect(screen.getByText('Dispute open — staking')).toBeInTheDocument();
    expect(screen.getByText(/staking deadline/i)).toBeInTheDocument();
  });

  it('renders voting state with voting deadline', () => {
    render(<DisputeCard data={mockDisputesByState.voting} />);
    expect(screen.getByText(mockDisputesByState.voting.eventTitle)).toBeInTheDocument();
    expect(screen.getByText('Community voting')).toBeInTheDocument();
    expect(screen.getByText(/voting deadline/i)).toBeInTheDocument();
  });

  it('renders ended state with outcome and view details link', () => {
    render(<DisputeCard data={mockDisputesByState.ended} />);
    expect(screen.getByText(mockDisputesByState.ended.eventTitle)).toBeInTheDocument();
    expect(screen.getByText('Voting ended')).toBeInTheDocument();
    expect(screen.getByText(/Outcome:/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view dispute details/i })).toBeInTheDocument();
  });

  it('renders executed state with outcome', () => {
    render(<DisputeCard data={mockDisputesByState.executed} />);
    expect(screen.getByText(mockDisputesByState.executed.eventTitle)).toBeInTheDocument();
    expect(screen.getByText('Outcome executed')).toBeInTheDocument();
    expect(screen.getByText(/Outcome:/)).toBeInTheDocument();
  });
});
