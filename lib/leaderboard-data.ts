export interface LeaderboardUser {
  rank: number;
  name: string;
  avatarUrl?: string;
  profit: number;
  winRate: number;
  predictions: number;
  isCurrentUser?: boolean;
}

export const mockLeaderboardData: LeaderboardUser[] = Array.from({ length: 100 }, (_, i) => ({
  rank: i + 1,
  name: i === 42 ? "You (User)" : `Predictor_${i + 1}`,
  avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`,
  profit: Math.floor(Math.random() * 50000) / 100,
  winRate: Math.floor(Math.random() * 40) + 50, // 50-90%
  predictions: Math.floor(Math.random() * 500) + 10,
  isCurrentUser: i === 42,
}));
