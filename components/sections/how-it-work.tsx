import { SectionHeader } from "../ui/section-header";

const steps = [
  {
    step: "1",
    title: "Connect Wallet",
    description: "Connect your Web3 wallet to get started",
    gradient: "from-cyan-500 to-blue-500",
  },
  {
    step: "2", 
    title: "Browse Markets",
    description: "Explore live prediction markets across sports, crypto, politics, and more",
    gradient: "from-blue-500 to-purple-500",
  },
  {
    step: "3",
    title: "Make Predictions", 
    description: "Place your bets using supported tokens. All transactions are secured on-chain",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    step: "4",
    title: "Earn Rewards",
    description: "Win big when your predictions are correct. Payouts are instant and automatic",
    gradient: "from-pink-500 to-emerald-500",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-16 sm:py-20 lg:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="How It"
          highlight="Works"
          description="Get started in minutes with our simple 4-step process"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 lg:gap-12">
          {steps.map((step, index) => (
            <div key={index} className="text-center">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r ${step.gradient} flex items-center justify-center text-white font-bold text-xl`}>
                {step.step}
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{step.title}</h3>
              <p className="text-gray-300">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
