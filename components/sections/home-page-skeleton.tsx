"use client";

/**
 * HomePageSkeleton — shape-parity loading placeholder for /home.
 *
 * Each sub-skeleton mirrors the real section's grid layout, border-radius
 * vocabulary, and element dimensions so there is no layout shift when the
 * real content loads.
 *
 * Sections covered:
 *   HeroSkeleton       → two-column hero (copy + markets card preview)
 *   KpiStripSkeleton   → 2×2 / 1×4 animated-metric grid
 *   FeaturesSkeleton   → 1/2/3-column feature-card grid
 *   HowItWorksSkeleton → 3-column step-card grid + CTA button
 */

import { Skeleton } from "@/components/ui/skeleton";

// ── Hero ─────────────────────────────────────────────────────────────────────

/** Matches the two-column hero layout (copy left, markets card right). */
export function HeroSkeleton() {
  return (
    <div
      data-testid="hero-skeleton"
      className="relative mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-24"
      aria-hidden="true"
    >
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Left: badge + heading lines + body + CTAs + avatars */}
        <div className="flex flex-col justify-center gap-6">
          {/* Badge pill */}
          <Skeleton className="h-8 w-56 rounded-full" />

          {/* Heading lines (3 lines — "Predict / Repeat / Earn") */}
          <div className="space-y-3">
            <Skeleton className="h-12 w-48 rounded-md" />
            <Skeleton className="h-12 w-40 rounded-md" />
            <Skeleton className="h-12 w-32 rounded-lg" />
          </div>

          {/* Body paragraph */}
          <div className="space-y-2 max-w-lg">
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-4 w-5/6 rounded-md" />
            <Skeleton className="h-4 w-4/6 rounded-md" />
          </div>

          {/* CTA buttons */}
          <div className="flex flex-wrap gap-4">
            <Skeleton className="h-11 w-40 rounded-xl" />
            <Skeleton className="h-11 w-32 rounded-xl" />
          </div>

          {/* Avatar stack + label */}
          <div className="flex items-center gap-4">
            <div className="flex -space-x-1">
              <Skeleton className="h-12 w-12 rounded-full" />
              <Skeleton className="h-12 w-12 rounded-full" />
              <Skeleton className="h-12 w-12 rounded-full" />
            </div>
            <Skeleton className="h-4 w-44 rounded-md" />
          </div>
        </div>

        {/* Right: markets preview card */}
        <div className="relative flex items-center justify-center">
          {/* Win-notification badge (top-right) */}
          <Skeleton className="absolute right-0 -top-4 z-20 h-10 w-40 rounded-xl" />

          {/* Markets card */}
          <div className="w-full max-w-md space-y-4">
            <Skeleton className="h-8 w-56 rounded-md" />

            {/* Three market rows */}
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3"
              >
                <div className="flex items-start gap-3">
                  {/* Icon box */}
                  <Skeleton className="h-9 w-9 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32 rounded-md" />
                    <Skeleton className="h-3 w-48 rounded-md" />
                  </div>
                  {/* Odds */}
                  <div className="space-y-1 text-right">
                    <Skeleton className="h-3 w-14 rounded-md" />
                    <Skeleton className="h-3 w-14 rounded-md" />
                  </div>
                </div>
                {/* Progress bar */}
                <Skeleton className="h-2 w-full rounded-full" />
                {/* Meta line */}
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-24 rounded-md" />
                  <Skeleton className="h-3 w-20 rounded-md" />
                </div>
              </div>
            ))}

            {/* CTA button inside card */}
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>

          {/* Success badge (bottom-right) */}
          <Skeleton className="absolute bottom-0 right-0 z-20 h-10 w-36 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

// ── KPI Strip ────────────────────────────────────────────────────────────────

/** Matches the 2×2 (mobile) / 1×4 (desktop) KPI metric grid. */
export function KpiStripSkeleton() {
  return (
    <section
      data-testid="kpi-strip-skeleton"
      className="pt-0 pb-8 md:pb-16"
      aria-hidden="true"
    >
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col items-center justify-center rounded-xl p-4 md:p-6 gap-2"
            >
              {/* Value block — matches w-[166px] h-[40px] of real metric */}
              <Skeleton className="h-10 w-[166px] rounded-md" />
              {/* Label caption */}
              <Skeleton className="h-6 w-28 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Features ─────────────────────────────────────────────────────────────────

/** Matches the 1/2/3-column features grid with badge + heading + body. */
export function FeaturesSkeleton() {
  return (
    <section
      data-testid="features-skeleton"
      className="py-20"
      aria-hidden="true"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-12 space-y-4">
          <Skeleton className="mx-auto h-7 w-44 rounded-full" />
          <Skeleton className="mx-auto h-10 w-2/3 rounded-md" />
          <Skeleton className="mx-auto h-6 w-1/2 rounded-md" />
        </div>

        {/* Feature cards grid */}
        <div className="grid gap-10 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-3"
            >
              {/* Icon */}
              <Skeleton className="h-12 w-12 rounded-xl" />
              {/* Title */}
              <Skeleton className="h-5 w-3/4 rounded-md" />
              {/* Body */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-5/6 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── How It Works ─────────────────────────────────────────────────────────────

/** Matches the 3-column step-card grid + centred CTA button. */
export function HowItWorksSkeleton() {
  return (
    <section
      data-testid="how-it-works-skeleton"
      className="relative py-20 sm:py-24 px-6 lg:px-8 lg:py-40"
      aria-hidden="true"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section header */}
        <div className="text-center mb-20 sm:mb-24 space-y-4">
          <Skeleton className="mx-auto h-9 w-36 rounded-full" />
          <Skeleton className="mx-auto h-10 w-72 rounded-md" />
          <Skeleton className="mx-auto h-6 w-2/3 rounded-md" />
        </div>

        {/* Step cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4"
            >
              {/* Step number badge */}
              <Skeleton className="h-8 w-8 rounded-full" />
              {/* Icon */}
              <Skeleton className="h-12 w-12 rounded-xl" />
              {/* Title */}
              <Skeleton className="h-5 w-3/4 rounded-md" />
              {/* Description */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-5/6 rounded-md" />
              </div>
              {/* Bullet lines */}
              <div className="space-y-1 pt-1">
                {Array.from({ length: 3 }).map((_, j) => (
                  <Skeleton key={j} className="h-3 w-4/5 rounded-md" />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* CTA button */}
        <div className="flex justify-center">
          <Skeleton className="h-14 w-72 rounded-xl" />
        </div>
      </div>
    </section>
  );
}

// ── Composite ────────────────────────────────────────────────────────────────

/**
 * HomePageSkeleton — full /home loading state.
 *
 * Compose all section skeletons in the same order as the real page:
 * Hero → KpiStrip → Features → HowItWorks
 */
export function HomePageSkeleton() {
  return (
    <div
      data-testid="home-page-skeleton"
      className="min-h-screen bg-gradient-to-br from-[#5B21B6] via-[#6B21A8] to-[#7C3AED] relative overflow-hidden"
      aria-label="Loading home page content"
      aria-busy="true"
    >
      <HeroSkeleton />
      <KpiStripSkeleton />
      <FeaturesSkeleton />
      <HowItWorksSkeleton />
    </div>
  );
}
