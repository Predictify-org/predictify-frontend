'use client';

/**
 * FinancesEmptyState
 *
 * Category-aware empty state for the three /finances tabs:
 *   - "deposits"     → no wallet activity yet  → CTA: connect wallet
 *   - "trades"       → no trade history yet    → CTA: browse markets
 *   - "distribution" → no payouts/fees yet     → CTA: view claims
 *
 * Design decisions
 * ─────────────────
 * • Uses design tokens (muted, foreground, primary) for dark-mode consistency.
 * • Illustrations are decorative SVGs, aria-hidden; all meaning is in the text.
 * • CTA buttons are plain <a> tags (asChild on Button) so they work as real
 *   deep-links without a JS router dependency — swap to <Link> if preferred.
 * • WCAG 2.1 AA: minimum 4.5:1 contrast via token colours; focus-visible rings
 *   are inherited from the global Button styles.
 */

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { NoDepositsIllustration } from './NoDepositsIllustration';
import { NoTradesIllustration } from './NoTradesIllustration';
import { NoPayoutsIllustration } from './NoPayoutsIllustration';

// ─── Types ───────────────────────────────────────────────────────────────────

export type FinancesEmptyVariant = 'deposits' | 'trades' | 'distribution';

interface FinancesEmptyStateProps {
  /** Which finances tab this empty state belongs to */
  variant: FinancesEmptyVariant;
  className?: string;
}

// ─── Per-variant copy & routing config ───────────────────────────────────────

const CONFIG: Record<
  FinancesEmptyVariant,
  {
    Illustration: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
    cta: string;
    href: string;
  }
> = {
  deposits: {
    Illustration: NoDepositsIllustration,
    title: 'No deposits yet',
    description:
      'Connect your wallet to fund your account and start participating in prediction markets.',
    cta: 'Connect wallet',
    href: '/dashboard',     // wallet-connect flow is triggered from the dashboard
  },
  trades: {
    Illustration: NoTradesIllustration,
    title: 'No transactions yet',
    description:
      "You haven't made any trades in this period. Browse open markets to place your first prediction.",
    cta: 'Browse markets',
    href: '/events',
  },
  distribution: {
    Illustration: NoPayoutsIllustration,
    title: 'No fee distribution yet',
    description:
      'Platform fees are distributed once markets resolve. Check your pending claims to see what you may be owed.',
    cta: 'View claims',
    href: '/mypredictions',
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

export function FinancesEmptyState({ variant, className }: FinancesEmptyStateProps) {
  const { Illustration, title, description, cta, href } = CONFIG[variant];

  return (
    <div
      role="status"
      aria-label={title}
      className={cn(
        'flex flex-col items-center justify-center gap-5 py-16 px-6 text-center',
        className
      )}
    >
      {/* 2× illustration — renders crisply on retina via SVG viewBox */}
      <Illustration className="w-[120px] h-[80px] sm:w-[180px] sm:h-[120px]" />

      <div className="space-y-2 max-w-xs">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>

      <Button asChild size="sm">
        <Link href={href}>{cta}</Link>
      </Button>
    </div>
  );
}
