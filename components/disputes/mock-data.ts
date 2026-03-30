import { DisputeData } from '@/types/disputes';

/** Fixture: no active dispute */
export const mockNoneDispute: DisputeData = {
  id: 'dispute-none-001',
  eventTitle: 'Will ETH reach $5,000 by end of Q4 2025?',
  state: 'none',
  openCost: 50,
};

/** Fixture: dispute open, staking in progress */
export const mockOpenDispute: DisputeData = {
  id: 'dispute-open-001',
  eventTitle: 'Will BTC surpass $100,000 in 2025?',
  state: 'open',
  reason: 'The reported outcome does not match on-chain price data from three independent oracles at the resolution timestamp.',
  openCost: 50,
  stakingDeadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
  tally: [
    { label: 'Yes', amount: 1200, percentage: 60 },
    { label: 'No', amount: 800, percentage: 40 },
  ],
  userHasStaked: false,
  penaltyInfo: 'Stakers on the losing side forfeit their staked tokens.',
};

/** Fixture: dispute in community voting phase */
export const mockVotingDispute: DisputeData = {
  id: 'dispute-voting-001',
  eventTitle: 'Will the Fed cut rates in September 2025?',
  state: 'voting',
  reason: 'Outcome was marked "Yes" but the Fed meeting minutes indicate no rate change was made.',
  stakingDeadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // passed
  votingDeadline: new Date(Date.now() + 18 * 60 * 60 * 1000), // 18 hours from now (urgent)
  tally: [
    { label: 'Yes', amount: 3400, percentage: 55 },
    { label: 'No', amount: 2800, percentage: 45 },
  ],
  userHasVoted: false,
  penaltyInfo: 'Voters who vote with the minority may lose a portion of their governance tokens.',
};

/** Fixture: voting ended, outcome pending execution */
export const mockEndedDispute: DisputeData = {
  id: 'dispute-ended-001',
  eventTitle: 'Will Apple release a foldable iPhone in 2025?',
  state: 'ended',
  reason: 'Multiple credible sources confirm no foldable iPhone was released, contradicting the "Yes" resolution.',
  tally: [
    { label: 'Yes', amount: 1500, percentage: 30 },
    { label: 'No', amount: 3500, percentage: 70 },
  ],
  outcome: 'No',
  penaltyInfo: 'Stakers on the losing side forfeit their staked tokens.',
};

/** Fixture: dispute fully executed with audit references */
export const mockExecutedDispute: DisputeData = {
  id: 'dispute-executed-001',
  eventTitle: 'Will Ethereum complete the Pectra upgrade before June 2025?',
  state: 'executed',
  reason: 'The upgrade was completed on May 7, 2025, but the market resolved as "No".',
  tally: [
    { label: 'Yes', amount: 8200, percentage: 82 },
    { label: 'No', amount: 1800, percentage: 18 },
  ],
  outcome: 'Yes',
  executedAt: new Date('2025-06-01T14:32:00Z'),
  auditRefs: [
    {
      label: 'Ethereum Foundation — Pectra Upgrade Announcement',
      url: 'https://blog.ethereum.org/2025/05/07/pectra-mainnet',
    },
    {
      label: 'On-chain execution transaction',
      url: 'https://etherscan.io/tx/0xabc123def456',
    },
  ],
  penaltyInfo: 'Stakers on the losing side forfeited their tokens. Winning stakers received proportional rewards.',
};

/** All five fixtures indexed by state for convenience */
export const mockDisputesByState = {
  none: mockNoneDispute,
  open: mockOpenDispute,
  voting: mockVotingDispute,
  ended: mockEndedDispute,
  executed: mockExecutedDispute,
} as const;
