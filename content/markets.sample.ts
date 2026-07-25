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
  /** 24-hour activity level per hour (0–100). Used by HeatStrip. */
  activity24h: number[];
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
    activity24h: [12, 8, 5, 3, 2, 4, 10, 22, 45, 68, 82, 90, 95, 88, 92, 85, 72, 65, 58, 50, 42, 35, 28, 18],
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
    activity24h: [30, 25, 20, 18, 15, 18, 25, 35, 50, 55, 58, 60, 62, 65, 68, 70, 72, 68, 60, 52, 48, 42, 38, 35],
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
    activity24h: [5, 3, 2, 1, 1, 2, 8, 20, 40, 60, 75, 85, 95, 98, 92, 88, 80, 72, 55, 40, 28, 18, 12, 8],
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