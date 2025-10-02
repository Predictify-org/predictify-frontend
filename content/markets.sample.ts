export interface Market {
  id: string;
  title: string;
  description: string;
  icon: string;
  iconColor: string;
  yesOdds: number;
  noOdds: number;
  poolAmount: number;
  endsIn: string;
  sparklineData: number[];
  status: 'active' | 'ended' | 'upcoming';
}

export interface TrustBadge {
  id: string;
  label: string;
  count: string;
  avatars: string[];
}

export const sampleMarkets: Market[] = [
  {
    id: 'btc-price',
    title: 'Bitcoin Price',
    description: 'Will BTC exceed $75K by Q3 2024?',
    icon: 'TrendingUp',
    iconColor: 'blue',
    yesOdds: 68,
    noOdds: 32,
    poolAmount: 1245,
    endsIn: '3 days',
    sparklineData: [45, 52, 48, 61, 68, 72, 68],
    status: 'active'
  },
  {
    id: 'us-election',
    title: 'US Election 2024',
    description: 'Democratic party to win?',
    icon: 'Globe',
    iconColor: 'purple',
    yesOdds: 53,
    noOdds: 47,
    poolAmount: 5890,
    endsIn: '8 months',
    sparklineData: [60, 58, 55, 52, 50, 53, 53],
    status: 'active'
  },
  {
    id: 'tesla-earnings',
    title: 'Tesla Q2 Earnings',
    description: 'Will exceed analyst expectations?',
    icon: 'BarChart3',
    iconColor: 'emerald',
    yesOdds: 72,
    noOdds: 28,
    poolAmount: 2456,
    endsIn: '14 days',
    sparklineData: [65, 68, 70, 72, 71, 73, 72],
    status: 'active'
  }
];

export const trustBadges: TrustBadge[] = [
  {
    id: 'predictors',
    label: 'Join',
    count: '10,000+ predictors worldwide',
    avatars: [
      '/images/avatar.jpg',
      '/images/avatar2.png',
      '/images/avatar.jpg'
    ]
  }
];

export const winNotifications = [
  {
    id: 'win-notification-1',
    amount: 250,
    currency: 'USDC',
    position: 'top-right'
  },
  {
    id: 'success-notification',
    message: 'Prediction Correct!',
    position: 'bottom-left'
  }
];