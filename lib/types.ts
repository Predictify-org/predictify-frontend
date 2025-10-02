export interface Bet {
  id: string;
  title: string;
  category: BetCategory;
  thumbnail: string;
  startDate: Date;
  endDate: Date;
  timeRemaining: string;
  progress: number; // 0-100 percentage
  status: BetStatus;
  odds?: number;
  amount?: number;
  currency?: string;
}

export interface BetCategory {
  name: string;
  color: CategoryColor;
}

export type CategoryColor = 
  | 'football' 
  | 'politics' 
  | 'crypto' 
  | 'stocks' 
  | 'entertainment'
  | 'sports';

export type BetStatus = 
  | 'active' 
  | 'pending' 
  | 'completed' 
  | 'cancelled';

export interface ActiveBetsProps {
  bets: Bet[];
  isLoading?: boolean;
  onAddBet?: () => void;
  onLearnMore?: () => void;
}

export interface ActiveBetCardProps {
  bet: Bet;
  className?: string;
}
