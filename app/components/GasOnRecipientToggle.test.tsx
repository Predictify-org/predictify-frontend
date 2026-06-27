/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GasOnRecipientToggle, GAS_ON_RECIPIENT_FEE_XLM } from '../GasOnRecipientToggle';

describe('GasOnRecipientToggle', () => {
  it('renders the toggle and description', () => {
    render(<GasOnRecipientToggle enabled={false} onChange={jest.fn()} />);
    expect(screen.getByRole('switch', { name: /recipient pays gas/i })).toBeInTheDocument();
    expect(screen.getByText(/recipient pays gas/i)).toBeInTheDocument();
  });

  it('shows sender-pays copy when disabled', () => {
    render(<GasOnRecipientToggle enabled={false} onChange={jest.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent(/you \(the sender\) will cover/i);
    expect(screen.getByRole('status')).toHaveTextContent(GAS_ON_RECIPIENT_FEE_XLM);
  });

  it('shows recipient-pays copy when enabled', () => {
    render(<GasOnRecipientToggle enabled onChange={jest.fn()} />);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(GAS_ON_RECIPIENT_FEE_XLM);
    expect(status).toHaveTextContent(/deducted from the recipient/i);
  });

  it('adds token note for non-XLM streams when enabled', () => {
    render(<GasOnRecipientToggle enabled token="USDC" onChange={jest.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent(/USDC/);
    expect(screen.getByRole('status')).toHaveTextContent(/always in XLM/i);
  });

  it('does not show token note for XLM streams', () => {
    render(<GasOnRecipientToggle enabled token="XLM" onChange={jest.fn()} />);
    expect(screen.getByRole('status')).not.toHaveTextContent(/always in XLM/i);
  });

  it('calls onChange with true when toggled on', () => {
    const onChange = jest.fn();
    render(<GasOnRecipientToggle enabled={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('calls onChange with false when toggled off', () => {
    const onChange = jest.fn();
    render(<GasOnRecipientToggle enabled onChange={onChange} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('does not call onChange when disabled', () => {
    const onChange = jest.fn();
    render(<GasOnRecipientToggle enabled={false} onChange={onChange} disabled />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('toggle has aria-checked matching enabled prop', () => {
    const { rerender } = render(<GasOnRecipientToggle enabled={false} onChange={jest.fn()} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');

    rerender(<GasOnRecipientToggle enabled onChange={jest.fn()} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('cost callout is aria-live polite', () => {
    render(<GasOnRecipientToggle enabled={false} onChange={jest.fn()} />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('GAS_ON_RECIPIENT_FEE_XLM constant is 0.00001', () => {
    expect(GAS_ON_RECIPIENT_FEE_XLM).toBe('0.00001');
  });
});
