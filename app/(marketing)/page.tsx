// import { CTA } from "@/components/sections/cta"
import KpiStrip from "@/app/(marketing)/_sections/kpi-strip";
import Features from "@/components/sections/features";
import { Footer } from "@/components/sections/footer";
import { Hero } from "@/components/sections/hero";
import { HowItWorks } from "@/app/(marketing)/_sections/how-it-works";
import WalletsTokens from "@/components/sections/wallets-token";
import { AnimatedBackground } from "@/components/ui/animated-background";

export default function MarketingRoute() {
  return (
    <div className="min-h-screen bg-[#540D8D] relative overflow-hidden">
      <AnimatedBackground />
      <Hero />
      <KpiStrip />
      <Features />
      <HowItWorks />
      <WalletsTokens />
      {/* <CTA/> */}
      <Footer />
    </div>
  );
}
