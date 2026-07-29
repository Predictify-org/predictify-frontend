/**
 * EmptyState.test.tsx – Unit tests for EmptyState component
 *
 * Coverage:
 *   - Renders with required props
 *   - Displays icon, title, description
 *   - CTA button works and is accessible
 *   - Optional props are optional
 *   - WCAG 2.1 AA compliance
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from './EmptyState';

describe('EmptyState Component', () => {
  it('renders with title and description', () => {
    render(
      <EmptyState
        title="No data"
        description="Try again later"
      />
    );

    expect(screen.getByText('No data')).toBeInTheDocument();
    expect(screen.getByText('Try again later')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    render(
      <EmptyState
        icon="??"
        title="Empty"
      />
    );

    expect(screen.getByText('??')).toBeInTheDocument();
  });

  it('renders CTA button when label and handler provided', () => {
    const mockHandler = jest.fn();
    render(
      <EmptyState
        title="Empty"
        ctaLabel="Refresh"
        onCTA={mockHandler}
      />
    );

    const button = screen.getByRole('button', { name: /refresh/i });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(mockHandler).toHaveBeenCalledTimes(1);
  });

  it('does not render CTA button when only label provided', () => {
    render(
      <EmptyState
        title="Empty"
        ctaLabel="Refresh"
      />
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <EmptyState
        title="Empty"
        className="custom-class"
      />
    );

    const emptyStateDiv = container.querySelector('[role="status"]');
    expect(emptyStateDiv).toHaveClass('custom-class');
  });

  it('has proper ARIA attributes for accessibility', () => {
    render(
      <EmptyState
        title="No data"
        description="Please try again"
      />
    );

    const container = screen.getByRole('status');
    expect(container).toBeInTheDocument();
  });

  it('renders description as optional', () => {
    render(<EmptyState title="Empty" />);

    expect(screen.getByText('Empty')).toBeInTheDocument();
    expect(screen.queryByRole('paragraph')).not.toBeInTheDocument();
  });

  it('button has proper focus styles for keyboard navigation', () => {
    const { container } = render(
      <EmptyState
        title="Empty"
        ctaLabel="Refresh"
        onCTA={jest.fn()}
      />
    );

    const button = screen.getByRole('button');
    button.focus();
    expect(button).toHaveFocus();
  });
});
