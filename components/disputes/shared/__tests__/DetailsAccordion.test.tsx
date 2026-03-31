import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DetailsAccordion } from '../DetailsAccordion';

describe('DetailsAccordion', () => {
  it('renders "Show details" toggle by default', () => {
    render(<DetailsAccordion><p>Hidden content</p></DetailsAccordion>);
    expect(screen.getByText(/show details/i)).toBeInTheDocument();
  });

  it('hides children by default', () => {
    render(<DetailsAccordion><p>Hidden content</p></DetailsAccordion>);
    // Radix CollapsibleContent removes content from DOM when closed
    expect(screen.queryByText('Hidden content')).not.toBeInTheDocument();
  });

  it('reveals children after clicking "Show details"', async () => {
    render(<DetailsAccordion><p>Hidden content</p></DetailsAccordion>);
    await userEvent.click(screen.getByText(/show details/i));
    expect(screen.getByText('Hidden content')).toBeVisible();
  });

  it('shows "Hide details" after expanding', async () => {
    render(<DetailsAccordion><p>Content</p></DetailsAccordion>);
    await userEvent.click(screen.getByText(/show details/i));
    expect(screen.getByText(/hide details/i)).toBeInTheDocument();
  });

  it('collapses back after toggling twice', async () => {
    render(<DetailsAccordion><p>Content</p></DetailsAccordion>);
    await userEvent.click(screen.getByText(/show details/i));
    await userEvent.click(screen.getByText(/hide details/i));
    // Radix removes content from DOM when collapsed
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
    expect(screen.getByText(/show details/i)).toBeInTheDocument();
  });
});
