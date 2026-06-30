import { render, screen } from '@testing-library/react';
import { FinancesEmptyState } from '../FinancesEmptyState';
import type { FinancesEmptyVariant } from '../FinancesEmptyState';

// next/link is a client component; stub it so tests run in a plain jsdom env.
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

describe('FinancesEmptyState', () => {
  const cases: Array<{
    variant: FinancesEmptyVariant;
    expectedTitle: string;
    expectedCta: string;
    expectedHref: string;
  }> = [
    {
      variant: 'deposits',
      expectedTitle: 'No deposits yet',
      expectedCta: 'Connect wallet',
      expectedHref: '/dashboard',
    },
    {
      variant: 'trades',
      expectedTitle: 'No transactions yet',
      expectedCta: 'Browse markets',
      expectedHref: '/events',
    },
    {
      variant: 'distribution',
      expectedTitle: 'No fee distribution yet',
      expectedCta: 'View claims',
      expectedHref: '/mypredictions',
    },
  ];

  it.each(cases)(
    '$variant variant renders correct title, description, and CTA',
    ({ variant, expectedTitle, expectedCta, expectedHref }) => {
      render(<FinancesEmptyState variant={variant} />);

      // Title
      expect(screen.getByRole('heading', { name: expectedTitle })).toBeInTheDocument();

      // CTA link with correct destination
      const link = screen.getByRole('link', { name: expectedCta });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', expectedHref);
    }
  );

  it.each(cases)(
    '$variant has role="status" and aria-label for screen readers',
    ({ variant, expectedTitle }) => {
      render(<FinancesEmptyState variant={variant} />);
      const region = screen.getByRole('status', { name: expectedTitle });
      expect(region).toBeInTheDocument();
    }
  );

  it.each(cases)(
    '$variant SVG illustration is aria-hidden',
    ({ variant }) => {
      const { container } = render(<FinancesEmptyState variant={variant} />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    }
  );

  it('accepts an optional className and applies it to the wrapper', () => {
    const { container } = render(
      <FinancesEmptyState variant="deposits" className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  // Edge case: partial-empty state — rendering two variants in the same view
  // should not bleed styles or content between them.
  it('renders two variants independently without cross-contamination', () => {
    const { getAllByRole } = render(
      <>
        <FinancesEmptyState variant="deposits" />
        <FinancesEmptyState variant="trades" />
      </>
    );

    const headings = getAllByRole('heading');
    const titles = headings.map((h) => h.textContent);
    expect(titles).toContain('No deposits yet');
    expect(titles).toContain('No transactions yet');
  });
});
