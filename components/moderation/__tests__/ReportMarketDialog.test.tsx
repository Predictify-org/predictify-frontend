import * as React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReportMarketDialog } from '../ReportMarketDialog';

describe('ReportMarketDialog', () => {
  const originalFetch = global.fetch;

  beforeAll(() => {
    // JSDOM pointer capture and scroll mocks for Radix UI primitives
    if (!Element.prototype.hasPointerCapture) {
      Element.prototype.hasPointerCapture = () => false;
    }
    if (!Element.prototype.setPointerCapture) {
      Element.prototype.setPointerCapture = () => {};
    }
    if (!Element.prototype.releasePointerCapture) {
      Element.prototype.releasePointerCapture = () => {};
    }
    if (!Element.prototype.scrollIntoView) {
      Element.prototype.scrollIntoView = () => {};
    }
  });

  afterEach(() => {
    jest.clearAllMocks();
    global.fetch = originalFetch;
  });

  it('renders trigger button and opens dialog on click', async () => {
    const user = userEvent.setup();
    render(<ReportMarketDialog marketId="market-42" marketTitle="Test Market" />);

    const trigger = screen.getByRole('button', { name: /Report market/i });
    expect(trigger).toBeInTheDocument();

    await user.click(trigger);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Report Market/i })).toBeInTheDocument();
    expect(screen.getByText(/Submit a report for "Test Market"/i)).toBeInTheDocument();
  });

  it('validates required fields: missing reason prevents network call and displays error', async () => {
    const user = userEvent.setup();
    const mockFetch = jest.fn();
    global.fetch = mockFetch;

    render(<ReportMarketDialog marketId="market-42" />);
    const trigger = screen.getByRole('button', { name: /Report market/i });
    await user.click(trigger);

    const submitBtn = screen.getByRole('button', { name: /Submit Report/i });
    await user.click(submitBtn);

    // No network call made
    expect(mockFetch).not.toHaveBeenCalled();

    // Error message displayed
    expect(
      screen.getByText(/Please select a reason for reporting this market/i)
    ).toBeInTheDocument();
  });

  it('validates 1001-character details: displays character counter, field error, and prevents network call', async () => {
    const user = userEvent.setup();
    const mockFetch = jest.fn();
    global.fetch = mockFetch;

    render(<ReportMarketDialog marketId="market-42" />);
    const trigger = screen.getByRole('button', { name: /Report market/i });
    await user.click(trigger);

    const textarea = screen.getByPlaceholderText(/Provide details or context/i);
    const longText = 'a'.repeat(1001);

    fireEvent.change(textarea, { target: { value: longText } });

    // Live character counter shows 1001 / 1000
    expect(screen.getByText('1001 / 1000')).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Submit Report/i });
    await user.click(submitBtn);

    expect(mockFetch).not.toHaveBeenCalled();
    expect(
      screen.getByText(/Details must not exceed 1000 characters/i)
    ).toBeInTheDocument();
  });

  it('validates javascript: evidence URL: displays field error and prevents network call', async () => {
    const user = userEvent.setup();
    const mockFetch = jest.fn();
    global.fetch = mockFetch;

    render(<ReportMarketDialog marketId="market-42" />);
    const trigger = screen.getByRole('button', { name: /Report market/i });
    await user.click(trigger);

    const urlInput = screen.getByPlaceholderText('https://example.com/evidence');
    fireEvent.change(urlInput, { target: { value: 'javascript:alert("pwned")' } });

    const submitBtn = screen.getByRole('button', { name: /Submit Report/i });
    await user.click(submitBtn);

    expect(mockFetch).not.toHaveBeenCalled();
    expect(
      screen.getByText(/Evidence URL must be a valid http or https URL/i)
    ).toBeInTheDocument();
  });

  it('submits a valid report, displays success confirmation, and invokes callback', async () => {
    const user = userEvent.setup();
    const onSubmitted = jest.fn();

    global.fetch = jest.fn().mockResolvedValue({
      status: 202,
      json: async () => ({
        success: true,
        reportId: 'rep_123456_abc',
        message: 'Report received and queued for review.',
      }),
    });

    render(
      <ReportMarketDialog
        marketId="market-99"
        marketTitle="Presidential Election 2026"
        onReportSubmitted={onSubmitted}
      />
    );

    const trigger = screen.getByRole('button', { name: /Report market/i });
    await user.click(trigger);

    // Open select dropdown and choose "Spam"
    const selectTrigger = screen.getByRole('combobox');
    fireEvent.click(selectTrigger);

    const spamOption = await screen.findByRole('option', { name: /Spam/i });
    fireEvent.keyDown(spamOption, { key: 'Enter' });

    // Enter details and evidence
    const textarea = screen.getByPlaceholderText(/Provide details or context/i);
    fireEvent.change(textarea, { target: { value: 'Duplicate market with nonsense title' } });

    const urlInput = screen.getByPlaceholderText('https://example.com/evidence');
    fireEvent.change(urlInput, { target: { value: 'https://example.com/proof' } });

    const submitBtn = screen.getByRole('button', { name: /Submit Report/i });
    await user.click(submitBtn);

    // Verify fetch call payload
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/reports',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketId: 'market-99',
          reason: 'spam',
          details: 'Duplicate market with nonsense title',
          evidenceUrl: 'https://example.com/proof',
        }),
      })
    );

    // Verify success UI
    expect(await screen.findByText(/Report Submitted/i)).toBeInTheDocument();
    expect(screen.getByText('rep_123456_abc')).toBeInTheDocument();
    expect(onSubmitted).toHaveBeenCalledWith('rep_123456_abc');
  });

  it('prevents double submission while request is in flight', async () => {
    const user = userEvent.setup();
    let resolvePromise: (value: any) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    const mockFetch = jest.fn().mockReturnValue(pendingPromise);
    global.fetch = mockFetch;

    render(<ReportMarketDialog marketId="market-99" />);
    const trigger = screen.getByRole('button', { name: /Report market/i });
    await user.click(trigger);

    // Select reason
    const selectTrigger = screen.getByRole('combobox');
    fireEvent.click(selectTrigger);
    const reasonOption = await screen.findByRole('option', { name: /Spam/i });
    fireEvent.keyDown(reasonOption, { key: 'Enter' });

    const submitBtn = screen.getByRole('button', { name: /Submit Report/i });
    // First click
    fireEvent.click(submitBtn);

    // Second click immediately
    fireEvent.click(submitBtn);

    // Only one call should have been made
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Resolve promise
    resolvePromise!({
      status: 202,
      json: async () => ({ success: true, reportId: 'rep_single' }),
    });

    await waitFor(() => {
      expect(screen.getByText(/Report Submitted/i)).toBeInTheDocument();
    });
  });

  it('handles 429 rate limit errors with descriptive banner', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn().mockResolvedValue({
      status: 429,
      json: async () => ({
        error: 'Too Many Requests: Rate limit exceeded. Please try again later.',
      }),
    });

    render(<ReportMarketDialog marketId="market-99" />);
    const trigger = screen.getByRole('button', { name: /Report market/i });
    await user.click(trigger);

    const selectTrigger = screen.getByRole('combobox');
    fireEvent.click(selectTrigger);
    const reasonOption = await screen.findByRole('option', { name: /Illegal/i });
    fireEvent.keyDown(reasonOption, { key: 'Enter' });

    const submitBtn = screen.getByRole('button', { name: /Submit Report/i });
    await user.click(submitBtn);

    expect(
      await screen.findByText(/Too Many Requests: Rate limit exceeded/i)
    ).toBeInTheDocument();
  });

  it('focus management: returns focus to trigger upon close', async () => {
    const user = userEvent.setup();
    render(<ReportMarketDialog marketId="market-focus" />);

    const trigger = screen.getByRole('button', { name: /Report market/i });
    trigger.focus();
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Cancel dialog
    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    await user.click(cancelBtn);

    // Dialog closes and focus returns to trigger
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });
  });
});
