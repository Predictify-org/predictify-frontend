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


export interface Transaction {
  date: string;
  type: 'deposit' | 'bet' | 'win' | 'withdraw' | 'refund';
  amount: string;
  status: 'completed' | 'pending';
  description: string;
  icon: 'down' | 'up' | 'refresh';
  amountColor: string;
  currency: 'XLM' | 'USDC';
  numericAmount: number;
}

export interface TransactionFilters {
  type: Array<'deposit' | 'bet' | 'win' | 'withdraw' | 'refund'>;
  status: Array<'completed' | 'pending'>;
  currency: Array<'XLM' | 'USDC'>;
  dateFrom: string;
  dateTo: string;
}