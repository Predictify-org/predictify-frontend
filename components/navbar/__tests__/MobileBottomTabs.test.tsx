import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { MobileBottomTabs, getUnreadCountForTab } from '@/components/navbar/MobileBottomTabs';
import { useRouter, usePathname } from 'next/navigation';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

let mockNotifications: any[] = [];

jest.mock('@/app/state/notifications', () => ({
  useNotificationsStore: () => ({
    notifications: mockNotifications,
  }),
}));

const pushMock = jest.fn();
(useRouter as jest.Mock).mockReturnValue({ push: pushMock });

describe('MobileBottomTabs', () => {
  beforeEach(() => {
    pushMock.mockClear();
    mockNotifications = [];
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

  describe('Unread Notification Badges', () => {
    it('does not display any badges when there are no unread notifications', () => {
      (usePathname as jest.Mock).mockReturnValue('/');
      mockNotifications = [
        { id: '1', userId: 'current-user', category: 'payout', title: 'Claimed', read: true, href: '/mypredictions', timestamp: new Date() },
      ];
      const { queryByText } = render(<MobileBottomTabs />);
      // No visual badges should show '1' or '9+'
      expect(queryByText('1')).not.toBeInTheDocument();
    });

    it('displays unread badges on correct tabs with appropriate counts', () => {
      (usePathname as jest.Mock).mockReturnValue('/');
      mockNotifications = [
        // 2 for Predictions
        { id: '1', userId: 'current-user', category: 'payout', title: 'Claimed 1', read: false, href: '/mypredictions', timestamp: new Date() },
        { id: '2', userId: 'current-user', category: 'payout', title: 'Claimed 2', read: false, href: '/mypredictions/subpath', timestamp: new Date() },
        // 1 for Markets
        { id: '3', userId: 'current-user', category: 'market', title: 'Closing soon', read: false, href: '/events', timestamp: new Date() },
        // 1 for More (disputes)
        { id: '4', userId: 'current-user', category: 'dispute', title: 'Dispute review', read: false, href: '/disputes', timestamp: new Date() },
      ];

      const { getByText, getAllByText, getByLabelText } = render(<MobileBottomTabs />);
      
      // Verify visual badges are rendered
      expect(getByText('2')).toBeInTheDocument(); // Predictions badge
      expect(getAllByText('1')).toHaveLength(2); // Markets and More badges both show '1'
      
      // Verify accessible labels are enriched with unread count
      expect(getByLabelText('Predictions, 2 unread items')).toBeInTheDocument();
      expect(getByLabelText('Markets, 1 unread item')).toBeInTheDocument();
      expect(getByLabelText('More, 1 unread item')).toBeInTheDocument();
      expect(getByLabelText('Home (current page)')).toBeInTheDocument(); // 0 unread
    });

    it('caps the visual badge text at 9+ when unread count exceeds 9', () => {
      (usePathname as jest.Mock).mockReturnValue('/mypredictions');
      mockNotifications = Array.from({ length: 12 }, (_, i) => ({
        id: `notif-${i}`,
        userId: 'current-user',
        category: 'payout',
        title: `Notif ${i}`,
        read: false,
        href: '/mypredictions',
        timestamp: new Date(),
      }));

      const { getByText, getByLabelText } = render(<MobileBottomTabs />);

      // Visual badge should show '9+'
      expect(getByText('9+')).toBeInTheDocument();
      
      // Accessible label should announce full count '12 unread items'
      expect(getByLabelText('Predictions (current page), 12 unread items')).toBeInTheDocument();
    });
  });

  describe('getUnreadCountForTab helper', () => {
    it('correctly maps notifications to Predictions', () => {
      const notifs = [
        { id: '1', userId: 'u', category: 'payout', title: 't', read: false, href: '/mypredictions' },
        { id: '2', userId: 'u', category: 'payout', title: 't', read: false, href: '/mypredictions/123' },
        { id: '3', userId: 'u', category: 'payout', title: 't', read: true, href: '/mypredictions' },
        { id: '4', userId: 'u', category: 'payout', title: 't', read: false, href: '/markets' },
      ] as any[];

      expect(getUnreadCountForTab('/mypredictions', notifs)).toBe(2);
    });

    it('correctly maps notifications to Markets', () => {
      const notifs = [
        { id: '1', userId: 'u', category: 'market', title: 't', read: false, href: '/markets' },
        { id: '2', userId: 'u', category: 'market', title: 't', read: false, href: '/events' },
        { id: '3', userId: 'u', category: 'market', title: 't', read: false, href: '/events/123' },
        { id: '4', userId: 'u', category: 'market', title: 't', read: false, href: '/mypredictions' },
      ] as any[];

      expect(getUnreadCountForTab('/markets', notifs)).toBe(3);
    });

    it('correctly maps notifications to More', () => {
      const notifs = [
        { id: '1', userId: 'u', category: 'dispute', title: 't', read: false, href: '/disputes' },
        { id: '2', userId: 'u', category: 'system', title: 't', read: false, href: '/more' },
        { id: '3', userId: 'u', category: 'account', title: 't', read: false, href: '/settings' },
        { id: '4', userId: 'u', category: 'market', title: 't', read: false, href: '/mypredictions' },
      ] as any[];

      expect(getUnreadCountForTab('/more', notifs)).toBe(3);
    });
  });
});
