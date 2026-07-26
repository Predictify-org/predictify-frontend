import { render, screen } from '@testing-library/react';
import { DisputePanelSkeleton } from '../DisputePanelSkeleton';

describe('DisputePanelSkeleton', () => {
  describe('accessibility (WCAG 2.1 AA)', () => {
    it('announces a single loading status to assistive tech (role=status + aria-busy)', () => {
      render(<DisputePanelSkeleton />);

      // The Card root carries the loading announcement. Screen readers will
      // read this once rather than enumerating every shimmer shard.
      const status = screen.getByRole('status');
      expect(status).toBeInTheDocument();
      expect(status).toHaveAttribute('aria-busy', 'true');
    });

    it('exposes a sr-only "Loading dispute details…" message', () => {
      render(<DisputePanelSkeleton />);

      // The text node is in the DOM (queryable) but visually hidden —
      // jsdom does not implement CSS, so we assert the text + sr-only class
      // are both present.
      const srOnly = screen.getByText(/Loading dispute details…/);
      expect(srOnly).toBeInTheDocument();
      expect(srOnly).toHaveClass('sr-only');
    });

    it('does not set explicit aria-live (role=status already implies aria-live=polite)', () => {
      render(<DisputePanelSkeleton />);

      // role="status" implies aria-live="polite" — no need to set it
      // explicitly, and doing so can cause re-announcements when descendants
      // change. We assert it's absent to lock the decision in.
      const status = screen.getByRole('status');
      expect(status).not.toHaveAttribute('aria-live');
    });
  });

  describe('shape parity with DisputePanel', () => {
    it('renders exactly one !rounded-full badge pill (and no plain rounded-full)', () => {
      const { container } = render(<DisputePanelSkeleton />);

      // The badge uses `!rounded-full` (Tailwind v3 important modifier).
      // IMPORTANT: `!rounded-full` is a DIFFERENT class name from
      // `rounded-full` — the `!` makes the override order-independent
      // (it doesn't rely on Tailwind's generated CSS source order). So
      // we query `.\!rounded-full` (CSS-escaped `!`), not `.rounded-full`.
      // Buttons intentionally use rounded-md so they don't collapse to a
      // pill shape on narrow viewports.
      const badgePills = Array.from(
        container.querySelectorAll('.\\!rounded-full'),
      );
      expect(badgePills).toHaveLength(1);

      // The badge must NOT shrink horizontally — its pill width is the
      // critical shape signal.
      expect(badgePills[0]).toHaveClass('shrink-0');

      // No shard should use the plain `rounded-full` either — that's only
      // appropriate when an override is unconditional and order-independent
      // is irrelevant. The skeleton's `!rounded-full` important modifier is
      // the correct pattern.
      expect(container.querySelectorAll('.rounded-full')).toHaveLength(0);
    });

    it('action shard and other bottom shards are NOT pill-shaped (rounded-md only)', () => {
      const { container } = render(<DisputePanelSkeleton />);

      // The action shard (h-10) and the footer caption (h-3) must NOT be
      // pill-shaped — they should resolve into actual buttons / captions
      // which are rounded-md. If someone accidentally applies
      // `!rounded-full` here, the buttons become ovals on resolve →
      // visual jump.
      const actionShard = container.querySelector('.h-10');
      expect(actionShard).not.toBeNull();
      expect(actionShard?.className).not.toMatch(/!?rounded-full/);
    });

    it('renders a footer with a top border (parity with DisputePanel border-t pt-3)', () => {
      const { container } = render(<DisputePanelSkeleton />);

      // The skeleton's footer <div> must carry the border-t pt-3 classes
      // exactly like the populated card's <CardFooter>.
      const footer = container.querySelector('.border-t.pt-3');
      expect(footer).not.toBeNull();
    });

    it('header layout matches populated card (flex-row + justify-between + pb-3)', () => {
      const { container } = render(<DisputePanelSkeleton />);

      const header = container.querySelector(
        '.flex.flex-row.items-start.justify-between.gap-4.pb-3',
      );
      expect(header).not.toBeNull();
    });

    it('content block is state-agnostic (no state-specific child components)', () => {
      render(<DisputePanelSkeleton />);

      // No "Open Dispute", "Confirm Stake", "Confirm Vote", "How was this
      // decided?", or audit-reference copy should leak into the skeleton.
      expect(
        screen.queryByText(
          /Open Dispute|Confirm Stake|Confirm Vote|How was this decided|Audit references|Executed at/i,
        ),
      ).toBeNull();
    });
  });

  describe('design-token + dark-mode consistency', () => {
    it('uses the bg-muted token on individual shards', () => {
      const { container } = render(<DisputePanelSkeleton />);

      // At least one inner shard uses the design token (bg-muted), not
      // the legacy hardcoded `bg-white/10`.
      const mutedShards = container.querySelectorAll('.bg-muted');
      expect(mutedShards.length).toBeGreaterThan(0);

      // Guard rail: no shard leaks the old hardcoded white.
      expect(container.querySelector('.bg-white\\/10')).toBeNull();
    });

    it('honors the prefers-reduced-motion preference at the component level', () => {
      const { container } = render(<DisputePanelSkeleton />);

      // Every shard carries the motion-reduce:animate-none utility so the
      // shimmer stops when the user requests reduced motion.
      const reducedMotionShards = container.querySelectorAll(
        '.motion-reduce\\:animate-none',
      );
      expect(reducedMotionShards.length).toBeGreaterThan(0);
    });
  });

  describe('responsive parity', () => {
    it('no shard uses fixed width-px so widths reflow across breakpoints', () => {
      const { container } = render(<DisputePanelSkeleton />);

      // CSS attribute selectors do NOT accept regex, so we scan every
      // element's className ourselves looking for Tailwind arbitrary-value
      // width patterns like `w-[NNNpx]`. Other arbitrary units
      // (min-w-px, max-w-px, h-px) are out of scope for this test by name.
      const fixedPxWidthPattern = /\bw-\[\d+px\]/;
      const offenders: string[] = [];
      container.querySelectorAll<HTMLElement>('[class]').forEach((el) => {
        const cls = el.getAttribute('class') ?? '';
        if (fixedPxWidthPattern.test(cls)) offenders.push(cls);
      });
      expect(offenders).toEqual([]);
    });

    it('at least one shard carries a responsive-prefixed width class', () => {
      const { container } = render(<DisputePanelSkeleton />);

      // Identifies Tailwind responsive prefixes: sm: md: lg: xl: 2xl:
      // applied to w- utilities. The action shard uses `sm:w-2/3`,
      // and that's the positive signal we expect.
      const responsiveWidthPattern = /\b(?:sm|md|lg|xl|2xl):w-\S+/;
      let responsiveWidthCount = 0;
      container.querySelectorAll<HTMLElement>('[class]').forEach((el) => {
        const cls = el.getAttribute('class') ?? '';
        if (responsiveWidthPattern.test(cls)) responsiveWidthCount += 1;
      });
      expect(responsiveWidthCount).toBeGreaterThan(0);
    });
  });
});
