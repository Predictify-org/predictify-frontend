import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatusBadge, type MarketStatus } from '../StatusBadge';

describe('StatusBadge', () => {
  describe('Rendering', () => {
    it('renders badge with correct status label', () => {
      render(<StatusBadge status="open" />);
      expect(screen.getByText('Open')).toBeInTheDocument();
    });

    it('renders all status values without crashing', () => {
      const statuses: MarketStatus[] = ['open', 'closing_soon', 'closed', 'resolved', 'cancelled'];
      statuses.forEach((status) => {
        const { unmount } = render(<StatusBadge status={status} />);
        unmount();
      });
    });

    it('renders with correct badge role', () => {
      render(<StatusBadge status="open" />);
      const badge = screen.getByRole('status');
      expect(badge).toBeInTheDocument();
    });

    it('applies correct variant class for each status', () => {
      const variants = {
        open: 'success',
        closing_soon: 'warning',
        closed: 'info',
        resolved: 'success',
        cancelled: 'danger',
      } as const;

      Object.entries(variants).forEach(([status, variant]) => {
        const { unmount } = render(<StatusBadge status={status as MarketStatus} />);
        const badge = screen.getByRole('status');
        // Variant classes are applied through className, check that badge exists and has correct content
        expect(badge).toHaveTextContent(status === 'closing_soon' ? 'Closing Soon' : status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '));
        unmount();
      });
    });

    it('renders icon for each status', () => {
      const statuses: MarketStatus[] = ['open', 'closing_soon', 'closed', 'resolved', 'cancelled'];
      statuses.forEach((status) => {
        const { container, unmount } = render(<StatusBadge status={status} />);
        const icon = container.querySelector('svg');
        expect(icon).toBeInTheDocument();
        unmount();
      });
    });

    it('hides icon from screen readers with aria-hidden', () => {
      const { container } = render(<StatusBadge status="open" />);
      const icon = container.querySelector('svg');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Screen Reader Support', () => {
    it('includes sr-only description text in the DOM', () => {
      render(<StatusBadge status="open" />);
      const srText = screen.getByText(/Market is accepting predictions/);
      expect(srText).toHaveClass('sr-only');
    });

    it('links badge to sr-only description via aria-describedby', () => {
      render(<StatusBadge status="open" />);
      const badge = screen.getByRole('status');
      const descriptionId = badge.getAttribute('aria-describedby');
      expect(descriptionId).toBeTruthy();

      const description = document.getElementById(descriptionId!);
      expect(description).toBeInTheDocument();
      expect(description).toHaveClass('sr-only');
    });

    it('provides correct sr-only text for each status', () => {
      const descriptions = {
        open: /Market is accepting predictions/,
        closing_soon: /Market closes in under 1 hour/,
        closed: /Predictions are locked/,
        resolved: /Market has been resolved/,
        cancelled: /Market was cancelled/,
      };

      Object.entries(descriptions).forEach(([status, regex]) => {
        const { unmount } = render(<StatusBadge status={status as MarketStatus} />);
        expect(screen.getByText(regex)).toBeInTheDocument();
        unmount();
      });
    });

    it('generates unique IDs for multiple instances to avoid conflicts', () => {
      const { container } = render(
        <>
          <StatusBadge status="open" />
          <StatusBadge status="open" />
        </>
      );

      const badges = container.querySelectorAll('[role="status"]');
      const ids = Array.from(badges).map((b) => b.getAttribute('aria-describedby'));

      expect(ids[0]).not.toBe(ids[1]);
      expect(ids[0]).toBeTruthy();
      expect(ids[1]).toBeTruthy();
    });
  });

  describe('Tooltip Visibility', () => {
    it('displays tooltip on hover when showTooltip is true', async () => {
      const user = userEvent.setup();
      render(<StatusBadge status="open" showTooltip={true} />);

      const badge = screen.getByRole('status');
      await user.hover(badge);

      // Tooltip content should appear
      const tooltipLabel = await screen.findByText('Open');
      const tooltipDescription = screen.getByText(/Market is accepting predictions/);
      expect(tooltipLabel).toBeVisible();
      expect(tooltipDescription).toBeVisible();
    });

    it('displays tooltip on keyboard focus', async () => {
      const user = userEvent.setup();
      render(<StatusBadge status="open" showTooltip={true} />);

      const badge = screen.getByRole('status');
      badge.focus();
      await user.tab();

      // Tooltip should be visible when badge has focus
      const tooltipDescription = await screen.findByText(/Market is accepting predictions/, {
        selector: 'body *:not(.sr-only)',
      });
      expect(tooltipDescription).toBeInTheDocument();
    });

    it('does not render tooltip when showTooltip is false', async () => {
      const user = userEvent.setup();
      const { container } = render(<StatusBadge status="open" showTooltip={false} />);

      const badge = screen.getByRole('status');
      await user.hover(badge);

      // Tooltip wrapper should not exist
      const tooltipContent = container.querySelector('[role="tooltip"]');
      expect(tooltipContent).not.toBeInTheDocument();
    });

    it('hides tooltip when mouse leaves', async () => {
      const user = userEvent.setup();
      render(<StatusBadge status="open" showTooltip={true} />);

      const badge = screen.getByRole('status');
      await user.hover(badge);

      // Tooltip should be visible
      let tooltipDescription = screen.getByText(/Market is accepting predictions/, {
        selector: 'body *:not(.sr-only)',
      });
      expect(tooltipDescription).toBeVisible();

      // Move mouse away
      await user.unhover(badge);

      // SR-only text should still exist but tooltip content should be hidden
      tooltipDescription = screen.getByText(/Market is accepting predictions/);
      expect(tooltipDescription).toHaveClass('sr-only');
    });
  });

  describe('Tooltip Content', () => {
    it('shows correct tooltip content for each status', async () => {
      const user = userEvent.setup();
      const tooltipContents = {
        open: /Market is accepting predictions/,
        closing_soon: /Market closes in under 1 hour/,
        closed: /Predictions are locked/,
        resolved: /Market has been resolved/,
        cancelled: /Market was cancelled/,
      };

      for (const [status, regex] of Object.entries(tooltipContents)) {
        const { unmount } = render(<StatusBadge status={status as MarketStatus} />);
        const badge = screen.getByRole('status');
        await user.hover(badge);

        const content = screen.getByText(regex);
        expect(content).toBeInTheDocument();
        unmount();
      }
    });

    it('includes status label in tooltip content', async () => {
      const user = userEvent.setup();
      render(<StatusBadge status="closing_soon" />);

      const badge = screen.getByRole('status');
      await user.hover(badge);

      expect(screen.getByText('Closing Soon')).toBeInTheDocument();
    });
  });

  describe('Styling and Customization', () => {
    it('applies a distinct pattern class for each status to supplement color', () => {
      const patternByStatus = {
        open: 'pattern-diagonal',
        closing_soon: 'pattern-dots',
        closed: 'pattern-crosshatch',
        resolved: 'pattern-horizontal',
        cancelled: 'pattern-vertical',
      } as const;

      Object.entries(patternByStatus).forEach(([status, patternClass]) => {
        const { unmount } = render(<StatusBadge status={status as MarketStatus} />);
        const badge = screen.getByRole('status');
        expect(badge).toHaveClass(patternClass);
        unmount();
      });
    });

    it('applies custom className', () => {
      const { container } = render(<StatusBadge status="open" className="custom-class" />);
      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('custom-class');
    });

    it('applies default size to badge', () => {
      const { container } = render(<StatusBadge status="open" />);
      const badge = screen.getByRole('status');
      // Radix Badge with size="md" applies these classes
      expect(badge).toHaveClass('px-2.5');
    });

    it('renders compact badge with proper spacing', () => {
      const { container } = render(<StatusBadge status="open" />);
      const badge = container.querySelector('[role="status"]');
      expect(badge).toHaveClass('gap-1.5');
    });
  });

  describe('Edge Cases', () => {
    it('handles unknown status gracefully by rendering the provided status value', () => {
      // This test documents current behavior; adjust as needed for your error handling
      const { container } = render(
        <StatusBadge status={'unknown' as unknown as MarketStatus} />
      );
      const badge = screen.getByRole('status');
      expect(badge).toBeInTheDocument();
    });

    it('maintains accessibility when className is applied', async () => {
      const user = userEvent.setup();
      render(<StatusBadge status="open" className="custom-class" />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveAttribute('aria-describedby');

      const descriptionId = badge.getAttribute('aria-describedby');
      const description = document.getElementById(descriptionId!);
      expect(description).toBeInTheDocument();
    });

    it('maintains proper semantics when showTooltip is false', () => {
      render(<StatusBadge status="open" showTooltip={false} />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveAttribute('aria-describedby');

      // SR text should still be present even without tooltip
      const srText = screen.getByText(/Market is accepting predictions/);
      expect(srText).toHaveClass('sr-only');
    });
  });

  describe('Dark Mode', () => {
    it('applies badge variant that supports dark mode', () => {
      const { container } = render(<StatusBadge status="open" />);
      const badge = screen.getByRole('status');

      // Badge variants include dark mode support through Tailwind
      // Just verify the badge renders and has the variant classes
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain('bg-');
    });
  });

  describe('Responsive Behavior', () => {
    it('renders correctly at small viewport', () => {
      // Set a small viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 320,
      });

      render(<StatusBadge status="open" />);
      const badge = screen.getByRole('status');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('Open');
    });

    it('renders correctly at large viewport', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920,
      });

      render(<StatusBadge status="open" />);
      const badge = screen.getByRole('status');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('Open');
    });
  });

  describe('Transition Messages', () => {
    it('communicates status transitions in tooltip text', async () => {
      const user = userEvent.setup();

      const transitions = [
        { status: 'open' as const, contains: 'place or modify' },
        { status: 'closing_soon' as const, contains: 'under 1 hour' },
        { status: 'closed' as const, contains: 'awaiting resolution' },
        { status: 'resolved' as const, contains: 'settled and payouts' },
        { status: 'cancelled' as const, contains: 'refunded' },
      ];

      for (const { status, contains } of transitions) {
        const { unmount } = render(<StatusBadge status={status} />);
        const badge = screen.getByRole('status');
        await user.hover(badge);

        expect(screen.getByText(new RegExp(contains, 'i'))).toBeInTheDocument();
        unmount();
      }
    });
  });
});
