import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CopyableText } from '../CopyableText';
import { ToastProvider } from '@/components/ui/toast';

const renderWithToast = (ui: React.ReactElement) => {
  return render(
    <ToastProvider>
      {ui}
    </ToastProvider>
  );
};

// Mock clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
});

describe('CopyableText', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders truncated text by default', () => {
    renderWithToast(<CopyableText text="0x1234567890abcdef" />);
    expect(screen.getByText('0x12…cdef')).toBeInTheDocument();
  });

  it('renders full text when truncateMiddle is false', () => {
    renderWithToast(<CopyableText text="0x1234567890abcdef" truncateMiddle={false} />);
    expect(screen.getByText('0x1234567890abcdef')).toBeInTheDocument();
  });

  it('copies text to clipboard on click', async () => {
    renderWithToast(<CopyableText text="test-copy" />);
    
    const copyButton = screen.getByRole('button');
    await userEvent.click(copyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test-copy');
  });

  it('copies text to clipboard on Enter key press', async () => {
    renderWithToast(<CopyableText text="test-copy" />);
    
    const copyButton = screen.getByRole('button');
    copyButton.focus();
    await userEvent.keyboard('{Enter}');

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test-copy');
  });

  it('updates live region on copy', async () => {
    renderWithToast(<CopyableText text="test-copy" />);
    
    const liveRegion = screen.getByText('', { selector: '[aria-live="polite"]' });
    expect(liveRegion).toBeEmptyDOMElement();

    const copyButton = screen.getByRole('button');
    await userEvent.click(copyButton);

    expect(liveRegion).toHaveTextContent('Copied');
  });
});
