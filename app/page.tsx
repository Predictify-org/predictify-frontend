import { CTA } from "@/components/sections/cta";
import Features from "../components/sections/features";
import { Footer } from "@/components/sections/footer";
import { Header } from "@/components/sections/header";
import { Hero } from "@/components/sections/hero";
import { HowItWorks } from "@/components/sections/how-it-work";
import { WalletsTokens } from "@/components/sections/wallets-token";
// import { AnimatedBackground } from "@/components/ui/animated-background";

export default function Home() {
  // redirect("/dashboard")
  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      {/* <AnimatedBackground /> */}
      <Header />
      <Hero />
      <Features />
      <HowItWorks />
      <WalletsTokens />
      <CTA />
      <Footer />
    </div>
  );
}
