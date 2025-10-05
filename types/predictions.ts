
export type PredictionStatus = 'active' | 'pending' | 'won' | 'lost';

export interface Prediction {
  id: string;
  eventTitle: string;
  eventId: string;
  category: string;
  stake: number;
  odds: number;
  potentialWinnings: number;
  status: PredictionStatus;
  date: string;
  outcome?: string;
  resolved?: string;
}

export interface PredictionStats {
  totalWagered: number;
  totalWon: number;
  totalLost: number;
  netProfit: number;
}

export type PredictionFilterTab = 'all' | 'active' | 'pending' | 'completed';