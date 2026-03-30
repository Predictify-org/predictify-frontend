import { render, screen } from '@testing-library/react';
import { WarningBanner } from '../WarningBanner';

describe('WarningBanner', () => {
  it('renders title and description', () => {
    render(<WarningBanner title="Heads up" description="This action cannot be undone." />);
    expect(screen.getByText('Heads up')).toBeInTheDocument();
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
  });

  it('defaults to warning variant with amber styling', () => {
    const { container } = render(
      <WarningBanner title="Warning" description="Cost: 10 tokens" />
    );
    const alert = container.firstChild as HTMLElement;
    expect(alert).toHaveClass('border-amber-500/50');
  });

  it('applies destructive variant classes when variant is destructive', () => {
    const { container } = render(
      <WarningBanner variant="destructive" title="Danger" description="Irreversible action." />
    );
    const alert = container.firstChild as HTMLElement;
    expect(alert).toHaveClass('text-destructive');
    expect(alert).not.toHaveClass('border-amber-500/50');
  });

  it('renders the AlertTriangle icon', () => {
    const { container } = render(
      <WarningBanner title="Warning" description="Some warning text." />
    );
    // lucide-react renders an svg
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('has role="alert" for accessibility', () => {
    render(<WarningBanner title="Alert" description="Pay attention." />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
