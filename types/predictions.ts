export type PredictionStatus = 'active' | 'pending' | 'won' | 'lost';
export type FilterTab = 'All' | 'Active' | 'Pending' | 'Completed';
export type Token = 'XLM' | 'USDC';

export interface Prediction {
  id: string;
  title: string;
  description: string;
  stakeAmount: number;
  stakeToken: Token;
  odds: number;
  potentialWinnings: number;
  winningsToken: Token;
  eventDate: string; // MM/DD/YYYY
  resolvedDate?: string; // MM/DD/YYYY - Only for 'won' or 'lost'
  status: PredictionStatus;
}