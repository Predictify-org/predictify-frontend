import {
  Wallet,
  Shield,
  Zap,
  TrendingUp,
  Users,
  CheckCircle,
  Twitter,
  Github,
  MessageCircle,
  Globe,
  Smartphone,
  CreditCard,
  CircleDot,
  Linkedin,
  Search,
  Target,
  Trophy
} from "lucide-react";
import type {
  Feature,
  Step,
  WalletToken,
  Stat,
  SocialLink,
  NavLink,
} from "@/types/index";

export const NAVIGATION_LINKS: NavLink[] = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "/dashboard", label: "Dashboard" },
];

export const HERO_STATS: Stat[] = [
  { value: "$2.5M+", label: "Total Volume" },
  { value: "15K+", label: "Active Users" },
  { value: "99.9%", label: "Uptime" },
];

export const FEATURES: Feature[] = [
  {
    icon: Shield,
    title: "Decentralized & Transparent",
    description:
      "All predictions are recorded on-chain with complete transparency. No central authority controls the outcomes.",
    gradient: "from-cyan-500 to-blue-500",
    shadow: "shadow-cyan-500/25",
  },
  {
    icon: Zap,
    title: "Instant Payouts",
    description:
      "Smart contracts automatically distribute winnings immediately after event resolution. No waiting periods.",
    gradient: "from-emerald-500 to-green-500",
    shadow: "shadow-emerald-500/25",
  },
  {
    icon: TrendingUp,
    title: "Real-Time Markets",
    description:
      "Access live prediction markets on sports, crypto, politics, and more. Updated in real-time with live odds.",
    gradient: "from-purple-500 to-pink-500",
    shadow: "shadow-purple-500/25",
  },
  {
    icon: Users,
    title: "Community Driven",
    description:
      "Join a thriving community of predictors. Share insights, strategies, and compete on leaderboards.",
    gradient: "from-orange-500 to-red-500",
    shadow: "shadow-orange-500/25",
  },
  {
    icon: CheckCircle,
    title: "Verified Oracles",
    description:
      "Multiple oracle sources ensure accurate and tamper-proof event outcomes for fair resolution.",
    gradient: "from-teal-500 to-cyan-500",
    shadow: "shadow-teal-500/25",
  },
  {
    icon: Wallet,
    title: "Multi-Chain Support",
    description:
      "Support for Ethereum, Polygon, BSC, and more. Use your favorite tokens across multiple networks.",
    gradient: "from-indigo-500 to-purple-500",
    shadow: "shadow-indigo-500/25",
  },
];

export const HOW_IT_WORKS_STEPS_DATA = [
  {
    number: "1",
    title: "Connect Wallet",
    description: "Connect your Web3 wallet to get started with Predictify",
    bullets: [
      "Secure wallet connection",
      "Multi-chain support",
      "Instant verification"
    ],
    iconComponent: Wallet,
    iconBg: "bg-cyan-900/30"
  },
  {
    number: "2", 
    title: "Browse Markets",
    description: "Explore live prediction markets across sports, crypto, politics, and more",
    bullets: [
      "Real-time market data",
      "Multiple categories",
      "Live odds updates"
    ],
    iconComponent: Search,
    iconBg: "bg-blue-900/30"
  },
  {
    number: "3",
    title: "Make Predictions", 
    description: "Place your bets using supported tokens. All transactions are secured on-chain",
    bullets: [
      "Secure transactions",
      "Multiple tokens",
      "Smart contract protection"
    ],
    iconComponent: Target,
    iconBg: "bg-purple-900/30"
  },
  {
    number: "4",
    title: "Earn Rewards",
    description: "Win big when your predictions are correct. Payouts are instant and automatic",
    bullets: [
      "Instant payouts",
      "Automatic distribution",
      "Transparent results"
    ],
    iconComponent: Trophy,
    iconBg: "bg-emerald-900/30"
  },
];

export const SUPPORTED_WALLETS: WalletToken[] = [
  { name: "Lobster", icon: Wallet, color: "text-orange-400" },
  { name: "XBull", icon: Smartphone, color: "text-blue-400" },
  { name: "Albedo", icon: Globe, color: "text-purple-400" },
  { name: "Rabet", icon: CreditCard, color: "text-emerald-400" },
  { name: "Frieghter", icon: Wallet, color: "text-pink-400" },
  { name: "Trust wallet", icon: Smartphone, color: "text-cyan-400" },
];

export const SUPPORTED_TOKENS: WalletToken[] = [
  { name: "Ethereum", symbol: "ETH", color: "bg-blue-500" },
  { name: "Bitcoin", symbol: "BTC", color: "bg-orange-500" },
  { name: "USD Coin", symbol: "USDC", color: "bg-emerald-500" },
  { name: "Tether", symbol: "USDT", color: "bg-green-600" },
  { name: "Polygon", symbol: "MATIC", color: "bg-purple-500" },
  { name: "Binance", symbol: "BNB", color: "bg-yellow-500" },
];

// export const SOCIAL_LINKS: SocialLink[] = [
//   { icon: Twitter, href: "#" },
//   { icon: MessageCircle, href: "#" },
//   { icon: Github, href: "#" },
// ];

export const PLATFORM_LINKS = ["Markets", "Leaderboard", "Analytics", "API"];
export const LEGAL_LINKS = [
  "Terms of Service",
  "Privacy Policy",
  "Risk Disclosure",
  "Compliance",
];

export const SOCIAL_LINKS = [
  {
    name: 'Twitter',
    href: '#',
    icon: Twitter,
    ariaLabel: 'Follow us on Twitter'
  },
  {
    name: 'Discord',
    href: '#',
    icon: CircleDot,
    ariaLabel: 'Join our Discord community'
  },
  {
    name: 'GitHub',
    href: '#',
    icon: Github,
    ariaLabel: 'Visit our GitHub repository'
  },
  {
    name: 'LinkedIn',
    href: '#',
    icon: Linkedin,
    ariaLabel: 'Connect with us on LinkedIn'
  }
];

export const PRODUCT_LINKS = [
  { name: 'Features', href: '#' },
  { name: 'How It Works', href: '#' },
  { name: 'Supported Wallets', href: '#' },
  { name: 'Tokenomics', href: '#' },
  { name: 'API', href: '#' }
];

export const RESOURCES_LINKS = [
  { name: 'Documentation', href: '#' },
  { name: 'Blog', href: '#' },
  { name: 'Community', href: '#' },
  { name: 'FAQ', href: '#' },
  { name: 'Support', href: '#' }
];

export const COMPANY_LINKS = [
  { name: 'About', href: '#' },
  { name: 'Careers', href: '#' },
  { name: 'Contact', href: '#' },
  { name: 'Privacy Policy', href: '#' },
  { name: 'Terms of Service', href: '#' }
];
