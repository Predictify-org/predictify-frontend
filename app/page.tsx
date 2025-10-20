
"use client"

import { Navbar } from "@/components/navbar/Navbar"
import { Hero } from "@/components/sections/hero"
import Features from "@/components/sections/features"
import { HowItWorks } from "@/components/sections/how-it-work"
import WalletsTokens from "@/components/sections/wallets-token"
import { Footer } from "@/components/sections/footer"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#540D8D] relative overflow-hidden">
      <Navbar transparent />
      <Hero />
      <Features />
      <HowItWorks />
      <WalletsTokens />
      <Footer />
    </div>
  )
}
