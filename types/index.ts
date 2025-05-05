export interface Bet {
    id: string;
    eventName: string;
    betAmount: number;
    outcome: 'win' | 'loss' | 'push';
    odds: number;
    payout: number;
    fees: number;
    date: string;
    category: string;
  }
  
  export interface WithdrawalHistory {
    id: string;
    amount: number;
    date: string;
    status: 'completed' | 'pending' | 'failed';
  }
  
  export interface UserBalance {
    available: number;
    pending: number;
    totalWinnings: number;
    totalWithdrawn: number;
  }