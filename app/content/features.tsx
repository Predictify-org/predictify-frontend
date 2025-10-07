import { ReactNode } from "react";

const ShieldIcon = () => (
  <div className="w-[71px] h-[71px] rounded-lg bg-[#312E814D] flex items-center justify-center">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#818CF8"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-shield-check-icon lucide-shield-check"
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  </div>
);

const ZapIcon = () => (
  <div className="w-[71px] h-[71px] rounded-lg bg-[#581C874D] flex items-center justify-center">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#C084FC"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-badge-dollar-sign-icon lucide-badge-dollar-sign"
    >
      <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
      <path d="M12 18V6" />
    </svg>
  </div>
);

const Lightbulb = () => (
  <div className="w-[71px] h-[71px] rounded-lg bg-[#1E3A8A4D] flex items-center justify-center">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      color="#60A5FA"
      className="w-4 h-4"
    >
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6" />
      <path d="M10 22h4" />
    </svg>
  </div>
);

const BarChartIcon = () => (
  <div className="w-[71px] h-[71px] rounded-lg bg-[#14532D4D] flex items-center justify-center">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#4ADE80"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-6 h-6"
    >
      <path d="M12 20V10M18 20V4M6 20v-4" />
    </svg>
  </div>
);

const WalletIcon = () => (
  <div className="w-[71px] h-[71px] rounded-lg bg-[#78350F4D] flex items-center justify-center">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#FBBF24"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-wallet-icon lucide-wallet"
    >
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
    </svg>
  </div>
);

const TrendingUpIcon = () => (
  <div className="w-[71px] h-[71px] rounded-lg bg-[#7F1D1D4D] flex items-center justify-center">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#F87171"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-trending-up-icon lucide-trending-up"
    >
      <path d="M16 7h6v6" />
      <path d="m22 7-8.5 8.5-5-5L2 17" />
    </svg>
  </div>
);

export type Feature = {
  icon: ReactNode;
  title: string;
  body: string;
};

export const features: Feature[] = [
  {
    icon: <ShieldIcon />,
    title: "Decentralized & Transparent",
    body: "Built on blockchain technology, all predictions and outcomes are transparently recorded and cannot be manipulated.",
  },
  {
    icon: <ZapIcon />,
    title: "Instant Payouts",
    body: "Smart contracts automatically distribute winnings immediately when outcomes are confirmed, with no delays or manual processing.",
  },
  {
    icon: <Lightbulb />,
    title: "Create Your Markets",
    body: "Anyone can create prediction markets on virtually any verifiable future event, from sports to politics to financial outcomes.",
  },
  {
    icon: <BarChartIcon />,
    title: "Advanced Analytics",
    body: "Track your prediction performance with detailed analytics and insights to improve your future predictions.",
  },
  {
    icon: <WalletIcon />,
    title: "Multi-Wallet Support",
    body: "Connect with your preferred wallet including MetaMask, Coinbase Wallet, WalletConnect and more.",
  },
  {
    icon: <TrendingUpIcon />,
    title: "Real-Time Market Data",
    body: "Watch prediction markets evolve in real-time with live updates on odds, stakes, and participant activity.",
  },
];
