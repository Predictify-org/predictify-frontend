import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ErrorRecoveryScreen } from './ErrorRecoveryScreen';
import '@testing-library/jest-dom';
import { useToast } from '@/components/ui/use-toast';

// Mock the toast hook
jest.mock('@/components/ui/use-toast', () => ({
  useToast: jest.fn(),
}));

describe('ErrorRecoveryScreen', () => {
  const mockReset = jest.fn();
  const mockToast = jest.fn();
  
  beforeEach(() => {
    (useToast as jest.Mock).mockReturnValue({ toast: mockToast });
    
    // Mock window location
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true
    });
    
    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockImplementation(() => Promise.resolve()),
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the incident ID and elements correctly', () => {
    render(<ErrorRecoveryScreen error={new Error('Test error')} incidentId="test-id-123" resetErrorBoundary={mockReset} />);
    expect(screen.getByText('Oops, something went wrong')).toBeInTheDocument();
    expect(screen.getByText('test-id-123')).toBeInTheDocument();
  });

  it('calls resetErrorBoundary when Retry is clicked', () => {
    render(<ErrorRecoveryScreen error={new Error('Test error')} incidentId="test-id-123" resetErrorBoundary={mockReset} />);
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it('copies incident ID and shows toast', async () => {
    render(<ErrorRecoveryScreen error={new Error('Test error')} incidentId="test-id-123" resetErrorBoundary={mockReset} />);
    
    const copyButton = screen.getByLabelText('Copy Incident ID');
    fireEvent.click(copyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test-id-123');
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Incident ID Copied'
      }));
    });
  });

  it('navigates home when Go Home is clicked', () => {
    render(<ErrorRecoveryScreen error={new Error('Test error')} incidentId="test-id-123" resetErrorBoundary={mockReset} />);
    fireEvent.click(screen.getByRole('button', { name: /go home/i }));
    expect(window.location.href).toBe('/');
  });

  it('navigates to help when Report Issue is clicked', () => {
    render(<ErrorRecoveryScreen error={new Error('Test error')} incidentId="test-id-123" resetErrorBoundary={mockReset} />);
    fireEvent.click(screen.getByRole('button', { name: /report issue/i }));
    expect(window.location.href).toBe('/help');
  });
});
