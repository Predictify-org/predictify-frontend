export type PredictionStatus = "active" | "pending" | "won" | "lost";
export type FilterTab = "All" | "Active" | "Pending" | "Completed";
export type MainTab = "My Predictions" | "Transaction history";
export type Token = "XLM" | "USDC";

export interface Prediction {
  id: string;
  title: string;
  description: string;
  stakeAmount: number;
  stakeToken: Token;
  odds: number;
  potentialWinnings: number;
  winningsToken: Token;
  eventDate: string;
  resolvedDate?: string;
  status: PredictionStatus;
}
