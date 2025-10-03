import { Bet } from './types';

// User statistics mock data
export const mockUserStats = {
  totalBets: 47,
  totalWins: 28,
  totalLosses: 19,
  winRate: 59.6,
  rank: 1247,
  totalWinnings: 2847.50,
  totalLossesAmount: 1923.25,
  netProfit: 924.25,
  membershipTier: 'Premium',
  joinDate: '2023-08-15',
  performanceHistory: [
    { month: 'Jan', wins: 3, losses: 2, profit: 125.50 },
    { month: 'Feb', wins: 5, losses: 1, profit: 287.25 },
    { month: 'Mar', wins: 4, losses: 3, profit: 98.75 },
    { month: 'Apr', wins: 6, losses: 2, profit: 345.80 },
    { month: 'May', wins: 3, losses: 4, profit: -67.30 },
    { month: 'Jun', wins: 7, losses: 1, profit: 456.90 },
  ]
};

// Connected wallets mock data
export const mockConnectedWallets = [
  {
    id: '1',
    name: 'Freighter',
    address: 'GABC123...XYZ789',
    isConnected: true,
    balance: '1,247.50 XLM',
    lastUsed: '2024-01-15T10:30:00Z'
  },
  {
    id: '2', 
    name: 'Rabet',
    address: 'GDEF456...UVW012',
    isConnected: true,
    balance: '892.75 XLM',
    lastUsed: '2024-01-14T15:45:00Z'
  }
];

// Notification preferences mock data
export const mockNotificationPreferences = {
  emailNotifications: {
    betResults: true,
    newEvents: true,
    promotions: false,
    security: true,
    weeklyReport: true
  },
  pushNotifications: {
    betResults: true,
    newEvents: false,
    promotions: false,
    security: true
  },
  smsNotifications: {
    security: true,
    betResults: false
  }
};

export const mockActiveBets: Bet[] = [
  {
    id: '1',
    title: 'Barca vs Madrid',
    category: {
      name: 'Football',
      color: 'football'
    },
    thumbnail: '/images/barca-madrid.jpg', // Placeholder for the thumbnail
    startDate: new Date('2025-12-12T20:00:00'),
    endDate: new Date('2025-12-12T22:00:00'),
    timeRemaining: '90:09:32:55',
    progress: 85,
    status: 'active',
    odds: 2.5,
    amount: 100,
    currency: 'XLM'
  },
  {
    id: '2',
    title: 'Arsenal vs Liverpool',
    category: {
      name: 'Football',
      color: 'football'
    },
    thumbnail: '/images/arsenal-liverpool.jpg',
    startDate: new Date('2025-12-15T15:00:00'),
    endDate: new Date('2025-12-15T17:00:00'),
    timeRemaining: '00:02:32:55',
    progress: 95,
    status: 'active',
    odds: 1.8,
    amount: 250,
    currency: 'XLM'
  },
  {
    id: '3',
    title: 'Trump vs Kamala',
    category: {
      name: 'Politics',
      color: 'politics'
    },
    thumbnail: '/images/trump-kamala.jpg',
    startDate: new Date('2025-11-05T08:00:00'),
    endDate: new Date('2025-11-06T08:00:00'),
    timeRemaining: '29:06:32:55',
    progress: 60,
    status: 'active',
    odds: 3.2,
    amount: 500,
    currency: 'XLM'
  },
  {
    id: '4',
    title: 'Bitcoin Price',
    category: {
      name: 'Crypto',
      color: 'crypto'
    },
    thumbnail: '/images/bitcoin.jpg',
    startDate: new Date('2025-01-01T00:00:00'),
    endDate: new Date('2025-12-31T23:59:59'),
    timeRemaining: '00:01:32:55',
    progress: 98,
    status: 'active',
    odds: 2.1,
    amount: 1000,
    currency: 'XLM'
  },
  {
    id: '5',
    title: 'Tesla Stocks',
    category: {
      name: 'Stocks',
      color: 'stocks'
    },
    thumbnail: '/images/tesla.jpg',
    startDate: new Date('2025-03-15T09:30:00'),
    endDate: new Date('2025-03-15T16:00:00'),
    timeRemaining: '00:00:32:55',
    progress: 99,
    status: 'active',
    odds: 1.5,
    amount: 750,
    currency: 'XLM'
  }
];

// Category color mappings for consistent styling
export const categoryColors = {
  football: {
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    progress: 'bg-blue-500'
  },
  politics: {
    bg: 'bg-green-500/20',
    text: 'text-green-400',
    border: 'border-green-500/30',
    progress: 'bg-green-500'
  },
  crypto: {
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-400',
    border: 'border-yellow-500/30',
    progress: 'bg-yellow-500'
  },
  stocks: {
    bg: 'bg-cyan-500/20',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
    progress: 'bg-cyan-500'
  },
  entertainment: {
    bg: 'bg-purple-500/20',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
    progress: 'bg-purple-500'
  },
  sports: {
    bg: 'bg-orange-500/20',
    text: 'text-orange-400',
    border: 'border-orange-500/30',
    progress: 'bg-orange-500'
  }
} as const;
