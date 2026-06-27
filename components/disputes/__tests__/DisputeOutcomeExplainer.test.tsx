import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DisputeOutcomeExplainer } from '../DisputeOutcomeExplainer';
import { DisputeData } from '@/types/disputes';

describe('DisputeOutcomeExplainer', () => {
  const mockData: DisputeData = {
    id: '1',
    eventTitle: 'Test Event',
    state: 'ended',
    tally: [
      { label: 'Yes', amount: 1000, percentage: 60 },
      { label: 'No', amount: 400, percentage: 40 }
    ]
  };

  it('renders the math steps', async () => {
    const user = userEvent.setup();
    render(
      <DisputeOutcomeExplainer data={mockData} eligibleForAppeal={true}>
        <button>Open</button>
      </DisputeOutcomeExplainer>
    );

    const trigger = screen.getByRole('button', { name: 'Open' });
    await user.click(trigger);

    expect(screen.getByText(/Final Tally/i)).toBeInTheDocument();
    expect(screen.getByText(/Quorum Check/i)).toBeInTheDocument();
    expect(screen.getByText(/Winning Outcome/i)).toBeInTheDocument();
    expect(screen.getByText(/Payout Calculation/i)).toBeInTheDocument();

    // Verify formatted numbers
    expect(screen.getByText(/1,400/)).toBeInTheDocument(); // total tokens
    expect(screen.getByText(/60%/)).toBeInTheDocument(); // winning percentage
    
    const payoutStep = screen.getByTestId('payout-calc-step');
    expect(within(payoutStep).getByText(/400/)).toBeInTheDocument();
  });
});
