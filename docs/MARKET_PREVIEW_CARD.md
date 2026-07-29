# Market Preview Card (`MarketPreviewCard`)

The `MarketPreviewCard` component provides an accessible, hover and focus-triggered preview card for prediction markets. It renders key market details including status, Yes/No odds, pool amount, time remaining, 24-hour activity heat strip, trend sparkline, betting allowance nudge, and quick actions ("Save for Later" and "View Market").

## Features

- **Hover & Focus Triggers**: Automatically displays preview content when hovering with a mouse or navigating via keyboard (`Tab` focus).
- **Keyboard & WCAG 2.1 AA Accessibility**: Built on Radix UI's `@radix-ui/react-hover-card` primitive with ARIA role attributes, screen reader text, focus indicators, and `Escape` key dismissal.
- **Key Details Overview**:
  - Category icon & title
  - Market status badge (`Active`, `Ended`, `Upcoming`)
  - Description summary
  - Visual probability bar & tabular Yes/No odds
  - Total pool size (USDC) & time remaining
  - Optional 7-day sparkline trend graph
  - Optional 24-hour activity heat strip
  - User daily betting allowance nudge
  - Quick actions ("Save for later" toggle & "View Market" link)
- **Design System Consistency**: Uses dark-mode glassmorphic styling (`bg-[#1B1A2E]/95`, `backdrop-blur-md`, `border-white/15`) with WCAG-compliant color contrast.

## Quick Start

```tsx
import { MarketPreviewCard } from "@/app/components/MarketPreviewCard";
import type { Market } from "@/content/markets.sample";

const sampleMarket: Market = {
  id: "btc-price",
  title: "Bitcoin Price",
  description: "Will BTC exceed $75K by Q3 2024?",
  icon: "TrendingUp",
  iconColor: "blue",
  yesOdds: 68,
  noOdds: 32,
  poolAmount: 1245,
  endsIn: "3 days",
  sparklineData: [45, 52, 48, 61, 68, 72, 68],
  activity24h: [12, 8, 5, 3, 2, 4, 10, 22, 45, 68, 82, 90, 95, 88, 92, 85, 72, 65, 58, 50, 42, 35, 28, 18],
  status: "active"
};

export function MarketPreviewExample() {
  return (
    <MarketPreviewCard market={sampleMarket}>
      <span className="font-semibold text-purple-300 underline hover:text-purple-200">
        Hover to preview Bitcoin market
      </span>
    </MarketPreviewCard>
  );
}
```

## API Reference

```tsx
interface MarketPreviewCardProps {
  /** The target market data object */
  market: Market;
  /** Trigger element that activates the hover/focus preview */
  children: React.ReactNode;
  /** Positioning side relative to trigger: 'top' | 'bottom' | 'left' | 'right' (default: 'top') */
  side?: "top" | "bottom" | "left" | "right";
  /** Alignment relative to trigger: 'start' | 'center' | 'end' (default: 'center') */
  align?: "start" | "center" | "end";
  /** Delay in ms before opening hover card on mouse enter (default: 300ms) */
  openDelay?: number;
  /** Delay in ms before closing hover card on mouse leave (default: 150ms) */
  closeDelay?: number;
  /** Whether to show quick action buttons in card footer (default: true) */
  showActions?: boolean;
  /** Whether to render 24h heat strip inside preview (default: true) */
  showHeatStrip?: boolean;
  /** Whether to render trend sparkline inside preview (default: true) */
  showSparkline?: boolean;
  /** Custom class name for popover content container */
  className?: string;
  /** Controlled open state (optional) */
  open?: boolean;
  /** Callback when open state changes (optional) */
  onOpenChange?: (open: boolean) => void;
}
```

## Keyboard & Accessibility

- **Keyboard Navigation**: The trigger element is focusable (`Tab` / `Shift+Tab`). Focusing the trigger reveals the preview card.
- **Escape Key**: Pressing `Escape` while the preview card is active closes it immediately.
- **Focus Preservation**: Focus remains accessible for screen readers and keyboard users when interacting with action buttons in the card footer.
- **ARIA Attributes**: Uses `aria-label`, `role="progressbar"` for odds, and `aria-hidden="true"` for decorative icons.

## Testing

Unit tests for `MarketPreviewCard` are located in `app/components/__tests__/MarketPreviewCard.test.tsx`.

Run tests:
```bash
npm test -- app/components/__tests__/MarketPreviewCard.test.tsx
```
