"use client";

import { StepCard } from "../_components/step-card";
import { Wallet, BarChart3, CircleDollarSign } from "lucide-react";

const STEPS = [
  {
    number: "1",
    title: "Connect Your Wallet",
    description: "Link your cryptocurrency wallet to securely access the platform and manage your funds.",
    bullets: [
      "Multiple wallet options supported",
      "One-click connection process",
      "Secure and private",
    ],
    icon: <Wallet className="w-12 h-12 text-blue-400" strokeWidth={2.92} />,
    iconBg: "bg-blue-500/20",
  },
  {
    number: "2",
    title: "Make Your Prediction",
    description: "Browse prediction markets and place your prediction with your desired amount.",
    bullets: [
      "Wide range of markets to choose from",
      "Set your prediction amount",
      "Real-time odds calculation",
    ],
    icon: <BarChart3 className="w-12 h-12 text-purple-400" strokeWidth={2.92} />,
    iconBg: "bg-purple-500/20",
  },
  {
    number: "3",
    title: "Collect Your Winnings",
    description: "When the event concludes and you've predicted correctly, winnings are automatically sent to your wallet.",
    bullets: [
      "Automatic payouts via smart contracts",
      "No withdrawal delays",
      "Track your earnings history",
    ],
    icon: <CircleDollarSign className="w-12 h-12 text-emerald-400" strokeWidth={2.92} />,
    iconBg: "bg-emerald-500/20",
  },
];

export function HowItWorks() {
  const handleCTAClick = () => {
    const heroSection = document.querySelector("#hero");
    if (heroSection) {
      heroSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section
      id="how-it-works"
      className="relative py-20 sm:py-24 lg:py-40 backdrop-blur-[12px]"
      aria-labelledby="how-it-works-heading"
      style={{
        background: 'linear-gradient(180deg, rgba(45, 27, 105, 0.6) 0%, rgba(17, 24, 39, 0.8) 50%, rgba(0, 0, 0, 0.6) 100%)',
      }}
    >
      {/* Decorative Background Pattern */}
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage: `url('/images/Container.png')`,
          backgroundSize: '800px 1618.26px',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-20 sm:mb-24">
          <div className="inline-flex items-center justify-center mb-8">
            <span className="px-6 py-2 rounded-full bg-indigo-900 text-white text-[17.38px] leading-[29.21px] font-medium">
              Simple Process
            </span>
          </div>

          <h2
            id="how-it-works-heading"
            className="text-[44.69px] leading-[58.42px] font-bold text-white mb-8"
          >
            How Predictify Works
          </h2>

          <p className="text-[24.83px] leading-[40.89px] text-slate-300 max-w-4xl mx-auto">
            Making predictions and earning rewards has never been easier. Follow these simple
            steps to get started.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {STEPS.map((step) => (
            <StepCard key={step.number} {...step} />
          ))}
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleCTAClick}
            className="px-12 py-4 bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            Start Your First Prediction
          </button>
        </div>
      </div>
    </section>
  );
}
