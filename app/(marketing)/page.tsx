//import { CTA } from "@/components/sections/cta"
import Features from "@/components/sections/features"
import { Footer } from "./_components/footer"
import { Hero } from "@/components/sections/hero"
import { HowItWorks } from "./_sections/how-it-works"
import { WalletsTokens } from "@/components/sections/wallets-token"
import { AnimatedBackground } from "@/components/ui/animated-background"
import Navbar from "./_components/navbar"
import KpiStrip from "./_sections/kpi-strip"
import { CTA } from "./_sections/cta"

export default function MarketingRoute() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#5B21B6] via-[#6B21A8] to-[#7C3AED] relative overflow-hidden">
          {/* Gradient Orbs */}
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute left-0 top-0 h-[600px] w-[600px] rounded-full bg-[#C397EB33] blur-[120px]" />
      <div className="absolute bottom-0 right-0 h-[600px] w-[600px] rounded-full bg-[#4F46E533] blur-[120px]" />
    </div>
      <AnimatedBackground />
      <Navbar />
      <Hero />
      <KpiStrip />
      <Features />
      <HowItWorks />
     <WalletsTokens />
      <CTA />
      <Footer />
    </div>
  )
}