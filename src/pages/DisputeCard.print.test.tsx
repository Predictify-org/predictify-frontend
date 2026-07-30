import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DisputeCard } from './DisputeCard';
import type { DisputeData } from '@/types/disputes';

describe('DisputeCard print presentation', () => {
  const data: DisputeData = {
    id: 'test-001',
    eventTitle: 'Will ETH reach $5,000 by end of Q4 2025?',
    state: 'ended',
    openCost: 50,
    auditRefs: [{ label: 'Vote tx', url: 'https://example.com/tx/1' }],
  };

  it('expands the audit-ref accordion on beforeprint and restores it on afterprint', () => {
    render(<DisputeCard data={data} />);

    expect(screen.queryByText('Vote tx')).not.toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new Event('beforeprint'));
    });
    expect(screen.getByText('Vote tx')).toBeVisible();

    act(() => {
      window.dispatchEvent(new Event('afterprint'));
    });
    expect(screen.queryByText('Vote tx')).not.toBeInTheDocument();
  });

  it('does not re-close an accordion the reader had already opened before printing', async () => {
    const user = userEvent.setup();
    render(<DisputeCard data={data} />);

    await user.click(screen.getByText(/show details/i));
    expect(screen.getByText('Vote tx')).toBeVisible();

    act(() => {
      window.dispatchEvent(new Event('beforeprint'));
    });
    act(() => {
      window.dispatchEvent(new Event('afterprint'));
    });

    // Still open: print only restores state it changed itself.
    expect(screen.getByText('Vote tx')).toBeVisible();
  });

  it('hides the footer action button when printing via the dispute-card-chrome class', () => {
    render(<DisputeCard data={data} />);
    expect(screen.getByRole('link', { name: /view dispute details/i })).toHaveClass(
      'dispute-card-chrome',
    );
  });
});
