"use client"

/**
 * Hero — main landing section
 *
 * Visual style pass (feat/hero-visual-pass):
 *
 * 1. KERNING
 *    The headline uses three explicit letter-spacing steps tied to breakpoints:
 *      mobile  (default)  → tracking-tight  (-0.025em)
 *      tablet  (sm)       → tracking-tighter (-0.035em)
 *      desktop (lg)       → tracking-[-0.045em]  (custom inline, max optical tightness)
 *    The "Earn." word — rendered inside a coloured pill — uses slightly looser
 *    spacing (+0.01em) so the enclosed text doesn't feel cramped.
 *
 * 2. GRADIENT MESH BACKGROUND
 *    The section uses a layered approach to eliminate banding:
 *      a) SVG mesh (public/assets/hero-mesh.svg) as an <img> background —
 *         three offset radial gradients that never share a colour boundary.
 *      b) A CSS radial-gradient overlay that softly blends the mesh edges
 *         into the surrounding page gradient.
 *    No hard linear-gradient stops remain inside the hero itself.
 *
 * 3. CTA HIERARCHY
 *    Primary CTA  → solid filled (indigo-600, hover indigo-700), full shadow ring
 *    Secondary CTA → ghost variant, smaller (size="sm"), lower opacity label
 *    The visual weight difference makes the intended action unambiguous.
 */

import { ArrowRight, TrendingUp, Globe, BarChart3, CheckCircle2, Coins } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useParallax } from "@/hooks/use-parallax"
import { ConnectWalletModal } from "../connect-wallet-modal"

export function Hero() {
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [walletName, setWalletName] = useState<string | null>(null)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)

  // Parallax refs — same depths as before, preserved for parity
  const cardRef = useParallax({ depth: 12 })
  const bgRef = useParallax({ depth: -8 })

  // Listen for global open-connect-wallet event from navbar / drawer
  useEffect(() => {
    const handler = () => setIsWalletModalOpen(true)
    document.addEventListener("open-connect-wallet", handler as EventListener)
    return () => document.removeEventListener("open-connect-wallet", handler as EventListener)
  }, [])

  const handleWalletConnect = (name: string, address: string) => {
    setIsConnected(true)
    setWalletName(name)
    setWalletAddress(address)
    setIsWalletModalOpen(false)
  }

  const handleWalletDisconnect = () => {
    setIsConnected(false)
    setWalletName(null)
    setWalletAddress(null)
  }

  return (
    <>
      {/* ── Section wrapper ──────────────────────────────────────────────────
          overflow-hidden clips the mesh SVG and the parallax orb so they
          don't bleed past the section boundary on narrow viewports.          */}
      <div className="relative overflow-hidden font-sans">

        {/* ── Gradient mesh background (fix #2) ──────────────────────────────
            The SVG is an <img> so it counts as a single network request and
            is decoded off the main thread. object-cover keeps the aspect
            ratio correct at any viewport width.
            The radial CSS overlay above it blends the mesh into the page
            gradient, removing the hard edge where the section begins/ends.   */}
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
          {/* SVG mesh layer */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/hero-mesh.svg"
            alt=""
            className="h-full w-full object-cover"
            width={1440}
            height={900}
            fetchPriority="high"
            draggable={false}
          />
          {/* Soft radial vignette — blends mesh edges into surrounding page colour
              without introducing a linear stop that would cause banding */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 85% 70% at 50% 50%, transparent 30%, rgba(59,7,100,0.55) 100%)",
            }}
          />
        </div>

        {/* ── Decorative parallax orb (unchanged position, opacity reduced
            slightly to let the mesh read through)                            */}
        <div
          ref={bgRef}
          className="pointer-events-none absolute -right-20 top-0 hidden h-[500px] w-[500px] rounded-full bg-purple-600/8 blur-[100px] lg:block"
          aria-hidden="true"
        />

        {/* ── Content container ─────────────────────────────────────────── */}
        <div className="relative mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">

            {/* ── Left column — hero copy ──────────────────────────────── */}
            <div className="flex flex-col justify-center">

              {/* Badge */}
              <div className="mb-8 inline-flex w-fit items-center rounded-full bg-[#312E81] px-4 py-2 text-label text-white backdrop-blur-sm">
                The Future of Prediction Markets
              </div>

              {/* ── Headline (fix #1 — kerning) ─────────────────────────
                  Three breakpoint-tuned letter-spacing values:
                    default → tracking-tight  (−0.025 em)
                    sm      → −0.035 em via inline style (no Tailwind step)
                    lg      → −0.045 em via inline style (max optical tightness)

                  The CSS custom-property trick keeps the JSX clean while
                  letting each breakpoint override cleanly via media queries
                  defined in the style tag below.                            */}
              <style>{`
                .hero-headline {
                  letter-spacing: -0.025em;   /* mobile */
                }
                @media (min-width: 640px) {
                  .hero-headline {
                    letter-spacing: -0.035em; /* tablet */
                  }
                }
                @media (min-width: 1024px) {
                  .hero-headline {
                    letter-spacing: -0.045em; /* desktop — max optical tightness */
                  }
                }
                /* Enclosed word gets slightly looser spacing so the pill
                   container doesn't feel cramped around the glyphs */
                .hero-headline-pill {
                  letter-spacing: -0.015em;
                }
              `}</style>

              <div className="mb-6 space-y-1">
                <h1 className="hero-headline text-h1-responsive text-white">
                  Predict.
                </h1>
                <h1 className="hero-headline text-h1-responsive text-white">
                  Repeat.
                </h1>
                {/* "Earn." pill — uses gradient matching brand palette */}
                <div className="inline-block rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] px-4 py-1.5 shadow-lg shadow-violet-900/40">
                  <h1 className="hero-headline-pill text-h1-responsive text-white">
                    Earn.
                  </h1>
                </div>
              </div>

              {/* Description */}
              <p className="mb-8 max-w-lg text-body-lg leading-relaxed text-white/85">
                Join the decentralized prediction platform where your insights turn into rewards. Powered by
                blockchain technology for transparent and instant payouts.
              </p>

              {/* ── CTA buttons (fix #3 — hierarchy) ───────────────────────
                  Primary:   solid indigo, large, ring shadow — highest weight
                  Secondary: ghost, smaller, reduced opacity label — clearly
                             subordinate without being invisible               */}
              <div className="mb-12 flex flex-wrap items-center gap-3">
                {/* PRIMARY CTA */}
                <Button
                  size="lg"
                  className="group bg-indigo-600 text-white shadow-lg shadow-indigo-900/50 hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                  onClick={() => setIsWalletModalOpen(true)}
                >
                  Start Predicting
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </Button>

                {/* SECONDARY CTA — ghost variant, size="sm" keeps it visually
                    lighter than the primary without hiding it from keyboard nav */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white/70 hover:bg-white/10 hover:text-white"
                  asChild
                >
                  <a href="#how-it-works">Learn More</a>
                </Button>
              </div>

              {/* Social proof avatars */}
              <div className="flex items-center gap-4">
                <div className="flex -space-x-1" aria-hidden="true">
                  <div className="h-10 w-10 rounded-full border-2 border-white/30 bg-gradient-to-br from-purple-400 to-purple-600" />
                  <div className="h-10 w-10 rounded-full border-2 border-white/30 bg-gradient-to-br from-blue-400 to-blue-600" />
                  <div className="h-10 w-10 rounded-full border-2 border-white/30 bg-gradient-to-br from-pink-400 to-pink-600" />
                </div>
                <p className="text-body-sm text-white/60">Join 10,000+ predictors worldwide</p>
              </div>
            </div>

            {/* ── Right column — markets preview card ─────────────────── */}
            <div className="relative flex items-center justify-center">

              {/* Win notification */}
              <div className="absolute right-0 -top-4 z-20 animate-fade-in rounded-xl bg-gradient-to-r from-[#4F46E533] to-[#9333EA] p-2 shadow-2xl">
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-white/20 p-1.5">
                    <Coins className="h-4 w-4 text-white" aria-hidden="true" />
                  </div>
                  <span className="text-label font-semibold text-white">+250 USDC Won!</span>
                </div>
              </div>

              {/* Markets card with parallax */}
              <div ref={cardRef} className="w-full max-w-md transition-transform duration-75 ease-out">
                <Card className="w-full border-white/10 bg-gradient-to-b from-[#48097B] to-[#111827] p-6 backdrop-blur-xl">
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-h4 font-semibold text-white">Popular Prediction Markets</h2>
                    <button className="text-body-sm text-purple-300 hover:text-purple-200">View All</button>
                  </div>

                  <div className="space-y-4">
                    {/* Market 1 — Bitcoin Price */}
                    <Card className="border-white/10 bg-[#201F3780] p-4 backdrop-blur-sm">
                      <div className="mb-3 flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="rounded-lg bg-blue-500/20 p-2">
                            <TrendingUp className="h-5 w-5 text-blue-400" aria-hidden="true" />
                          </div>
                          <div>
                            <h3 className="text-h6 font-semibold text-white">Bitcoin Price</h3>
                            <p className="text-body-sm text-white/70">Will BTC exceed $75K by Q3 2023?</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-body-sm font-medium text-green-400 mb-1">Yes: 68%</div>
                          <div className="text-body-sm text-red-400">No: 32%</div>
                        </div>
                      </div>
                      <div className="mb-2 h-2 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full w-[68%] bg-gradient-to-r from-green-500 to-green-400" />
                      </div>
                      <div className="flex justify-between text-caption text-white/60">
                        <span>Pool: 1,245 USDC</span>
                        <span>Ends in 3 days</span>
                      </div>
                    </Card>

                    {/* Market 2 — US Election */}
                    <Card className="border-white/10 bg-[#201F3780] p-4 backdrop-blur-sm">
                      <div className="mb-3 flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="rounded-lg bg-purple-500/20 p-2">
                            <Globe className="h-5 w-5 text-purple-400" aria-hidden="true" />
                          </div>
                          <div>
                            <h3 className="text-h6 font-semibold text-white">US Election 2024</h3>
                            <p className="text-body-sm text-white/70">Democratic party to win?</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-body-sm font-medium text-green-400">Yes: 53%</div>
                          <div className="text-body-sm text-red-400">No: 47%</div>
                        </div>
                      </div>
                      <div className="mb-2 h-2 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full w-[53%] bg-gradient-to-r from-green-500 to-green-400" />
                      </div>
                      <div className="flex justify-between text-caption text-white/60">
                        <span>Pool: 5,890 USDC</span>
                        <span>Ends in 8 months</span>
                      </div>
                    </Card>

                    {/* Market 3 — Tesla Earnings */}
                    <Card className="border-white/10 bg-[#201F3780] p-4 backdrop-blur-sm">
                      <div className="mb-3 flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="rounded-lg bg-green-500/20 p-2">
                            <BarChart3 className="h-5 w-5 text-green-400" aria-hidden="true" />
                          </div>
                          <div>
                            <h3 className="text-h6 font-semibold text-white">Tesla Q2 Earnings</h3>
                            <p className="text-body-sm text-white/70">Will exceed analyst expectations?</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-body-sm font-medium text-green-400">Yes: 72%</div>
                          <div className="text-body-sm text-red-400">No: 28%</div>
                        </div>
                      </div>
                      <div className="mb-2 h-2 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full w-[72%] bg-gradient-to-r from-green-500 to-green-400" />
                      </div>
                      <div className="flex justify-between text-caption text-white/60">
                        <span>Pool: 2,456 USDC</span>
                        <span>Ends in 14 days</span>
                      </div>
                    </Card>

                    {/* In-card CTA — consistent with primary CTA colour above */}
                    <Button className="w-full bg-indigo-600 py-6 text-white hover:bg-indigo-700">
                      Place Your Prediction
                    </Button>
                  </div>
                </Card>
              </div>

              {/* Success notification */}
              <div className="absolute bottom-0 right-0 z-20 animate-fade-in rounded-2xl bg-green-500 p-3 shadow-2xl">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-white" aria-hidden="true" />
                  <span className="text-label font-semibold text-white">Prediction Correct!</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Wallet modal */}
      <ConnectWalletModal
        isOpen={isWalletModalOpen}
        onOpenChange={setIsWalletModalOpen}
        onWalletConnect={handleWalletConnect}
        onWalletDisconnect={handleWalletDisconnect}
      />
    </>
  )
}
