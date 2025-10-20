"use client"

// import { CTA } from "@/components/sections/cta"
import Features from "@/components/sections/features"
import { Footer } from "@/components/sections/footer"
import { Hero } from "@/components/sections/hero"
import { HowItWorks } from "@/app/(marketing)/_sections/how-it-works"
import WalletsTokens from "@/components/sections/wallets-token"
import { AnimatedBackground } from "@/components/ui/animated-background"

export default function MarketingContent() {
  return (
    <>
      <AnimatedBackground />
      <Hero />
      <Features />
      <HowItWorks />
      <WalletsTokens />
      {/* <CTA/> */}
      <Footer />
    </>
  )
}
