import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { MobileBottomTabs } from '@/components/navbar/MobileBottomTabs';
import { useRouter, usePathname } from 'next/navigation';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

const pushMock = jest.fn();
(useRouter as jest.Mock).mockReturnValue({ push: pushMock });

describe('MobileBottomTabs', () => {
  beforeEach(() => {
    pushMock.mockClear();
  });

  it('renders all tab labels', () => {
    (usePathname as jest.Mock).mockReturnValue('/');
    const { getByText } = render(<MobileBottomTabs />);
    expect(getByText('Home')).toBeInTheDocument();
    expect(getByText('Markets')).toBeInTheDocument();
    expect(getByText('Predictions')).toBeInTheDocument();
    expect(getByText('Wallet')).toBeInTheDocument();
    expect(getByText('More')).toBeInTheDocument();
  });

  it('marks active tab with aria-current="page"', () => {
    (usePathname as jest.Mock).mockReturnValue('/markets');
    const { getByLabelText } = render(<MobileBottomTabs />);
    const marketsBtn = getByLabelText('Markets (current page)');
    expect(marketsBtn).toHaveAttribute('aria-current', 'page');
  });

  it('inactive tabs do not have aria-current set', () => {
    (usePathname as jest.Mock).mockReturnValue('/markets');
    const { getByLabelText } = render(<MobileBottomTabs />);
    const homeBtn = getByLabelText('Home');
    expect(homeBtn).not.toHaveAttribute('aria-current');
  });

  it('navigates on tab click when not already active', () => {
    (usePathname as jest.Mock).mockReturnValue('/');
    const { getByLabelText } = render(<MobileBottomTabs />);
    fireEvent.click(getByLabelText('Markets'));
    expect(pushMock).toHaveBeenCalledWith('/markets');
  });

  it('does not navigate when clicking the already-active tab', () => {
    (usePathname as jest.Mock).mockReturnValue('/');
    const { getByLabelText } = render(<MobileBottomTabs />);
    fireEvent.click(getByLabelText('Home (current page)'));
    expect(pushMock).not.toHaveBeenCalled();
  });
});
