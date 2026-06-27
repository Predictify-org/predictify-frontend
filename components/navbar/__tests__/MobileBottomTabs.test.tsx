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
  it('renders active label for current route', () => {
    (usePathname as jest.Mock).mockReturnValue('/');
    const { getByText } = render(<MobileBottomTabs />);
    expect(getByText('Home')).toBeInTheDocument();
  });

  it('navigates on tab click', () => {
    (usePathname as jest.Mock).mockReturnValue('/');
    const { getByLabelText } = render(<MobileBottomTabs />);
    fireEvent.click(getByLabelText('Markets'));
    expect(pushMock).toHaveBeenCalledWith('/markets');
  });
});
