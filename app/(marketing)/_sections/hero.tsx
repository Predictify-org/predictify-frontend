"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketsWidget } from "../_components/markets-widget";
import { trustBadges } from "@/content/markets.sample";
import { useState, useEffect } from "react";

export function Hero() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#5B21B6] via-[#6B21A8] to-[#7C3AED] font-sans">
      {/* Gradient Orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-0 h-[600px] w-[600px] rounded-full bg-[#C397EB33] blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[600px] w-[600px] rounded-full bg-[#4F46E533] blur-[120px]" />
      </div>

      {/* Soft Vignette */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10" />

      {/* Content Container */}
      <div className="relative mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left Column - Hero Content */}
          <div className="flex flex-col justify-center">
            {/* Badge */}
            <div 
              className={`mb-8 inline-flex w-fit items-center rounded-full bg-[#312E81] px-4 py-2 text-sm text-white backdrop-blur-sm ${
                reducedMotion ? '' : 'animate-fade-in'
              }`}
              style={{ animationDelay: reducedMotion ? '0ms' : '200ms' }}
            >
              The Future of Prediction Markets
            </div>

            {/* Main Heading */}
            <div 
              className={`mb-6 space-y-2 ${
                reducedMotion ? '' : 'animate-fade-in'
              }`}
              style={{ animationDelay: reducedMotion ? '0ms' : '400ms' }}
            >
              <h1 className="text-6xl font-bold leading-tight text-white lg:text-7xl">
                Predict.
              </h1>
              <h1 className="text-6xl font-bold leading-tight text-white lg:text-7xl">
                Repeat.
              </h1>
              <div className="inline-block bg-gradient-to-r from-[#818CF8] to-[#A855F7] px-4 py-2">
                <h1 className="text-6xl font-bold leading-tight text-white lg:text-7xl">
                  Earn.
                </h1>
              </div>
            </div>

            {/* Description */}
            <p 
              className={`mb-8 max-w-lg text-lg leading-relaxed text-white/90 ${
                reducedMotion ? '' : 'animate-fade-in'
              }`}
              style={{ animationDelay: reducedMotion ? '0ms' : '600ms' }}
            >
              Join the decentralized prediction platform where your insights turn into rewards. 
              Powered by blockchain technology for transparent and instant payouts.
            </p>

            {/* CTA Buttons */}
            <div 
              className={`mb-12 flex flex-wrap gap-4 ${
                reducedMotion ? '' : 'animate-fade-in'
              }`}
              style={{ animationDelay: reducedMotion ? '0ms' : '800ms' }}
            >
              <Button 
                size="lg" 
                className="group bg-[#48097B] text-white hover:bg-[#48097B]/90 transition-all duration-300 hover:scale-105"
              >
                Start Predicting
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 transition-all duration-300"
              >
                Learn More
              </Button>
            </div>

            {/* Trust Badges */}
            <TrustBadges reducedMotion={reducedMotion} />
          </div>

          {/* Right Column - Markets Widget */}
          <div 
            className={`relative flex items-center justify-center ${
              reducedMotion ? '' : 'animate-fade-in'
            }`}
            style={{ animationDelay: reducedMotion ? '0ms' : '1000ms' }}
          >
            <MarketsWidget />
          </div>
        </div>
      </div>
    </div>
  );
}

interface TrustBadgesProps {
  reducedMotion: boolean;
}

function TrustBadges({ reducedMotion }: TrustBadgesProps) {
  const badge = trustBadges[0];
  
  return (
    <div 
      className={`flex items-center gap-3 ${
        reducedMotion ? '' : 'animate-fade-in'
      }`}
      style={{ animationDelay: reducedMotion ? '0ms' : '1000ms' }}
    >
      <div className="flex -space-x-2">
        {badge.avatars.map((avatar, index) => (
          <div
            key={index}
            className={`h-10 w-10 rounded-full border-2 border-purple-600 bg-gradient-to-br ${
              index === 0 ? 'from-purple-400 to-pink-400' :
              index === 1 ? 'from-blue-400 to-purple-400' :
              'from-pink-400 to-purple-400'
            } ${
              reducedMotion ? '' : 'animate-bounce'
            }`}
            style={{ 
              animationDelay: reducedMotion ? '0ms' : `${1200 + index * 200}ms`,
              animationDuration: '2s',
              animationIterationCount: 'infinite'
            }}
          />
        ))}
      </div>
      <p className="text-sm text-white/80">
        {badge.label} {badge.count}
      </p>
    </div>
  );
}
