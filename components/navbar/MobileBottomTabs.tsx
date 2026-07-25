import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Home, TrendingUp, Lightbulb, Wallet, MoreHorizontal, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotificationsStore } from '@/app/state/notifications';
import { NotificationItem } from '@/types/notifications';

interface TabItem {
  label: string;
  href: string;
  Icon: LucideIcon;
}

const tabs: TabItem[] = [
  { label: 'Home', href: '/', Icon: Home },
  { label: 'Markets', href: '/markets', Icon: TrendingUp },
  { label: 'Predictions', href: '/mypredictions', Icon: Lightbulb },
  { label: 'Wallet', href: '/wallet', Icon: Wallet },
  { label: 'More', href: '/more', Icon: MoreHorizontal },
];

/**
 * Computes the number of unread notifications matching a specific tab href.
 * Maps notification target destinations to bottom nav items:
 * - Predictions tab (/mypredictions) matches predictions-related URLs.
 * - Markets tab (/markets) matches markets and events URLs.
 * - More tab (/more) matches disputes, settings, or other helper URLs.
 */
export function getUnreadCountForTab(tabHref: string, notifications: NotificationItem[]): number {
  return notifications.filter((n) => {
    if (n.read) return false;
    if (!n.href) return false;

    if (tabHref === '/mypredictions') {
      return n.href.startsWith('/mypredictions');
    }
    if (tabHref === '/markets') {
      return n.href.startsWith('/markets') || n.href.startsWith('/events');
    }
    if (tabHref === '/more') {
      return n.href.startsWith('/more') || n.href.startsWith('/disputes') || n.href.startsWith('/settings');
    }
    if (tabHref === '/') {
      return n.href === '/';
    }
    if (tabHref === '/wallet') {
      return n.href.startsWith('/wallet');
    }
    return false;
  }).length;
}

export const MobileBottomTabs: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { notifications } = useNotificationsStore();

  const handleClick = (href: string) => {
    if (href !== pathname) {
      router.push(href);
    }
  };

  return (
    <nav
      className="fixed bottom-0 inset-x-0 flex justify-around items-center bg-[#060e20]/90 backdrop-blur-md border-t border-gray-700 md:hidden min-h-[44px] pb-[env(safe-area-inset-bottom)]"
      aria-label="Mobile bottom navigation"
    >
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        const unreadCount = getUnreadCountForTab(tab.href, notifications);
        
        // Build accessible announcement for screen-readers (WCAG 2.1 AA)
        const ariaLabel = `${tab.label}${isActive ? ' (current page)' : ''}${unreadCount > 0 ? `, ${unreadCount} unread item${unreadCount === 1 ? '' : 's'}` : ''}`;

        return (
          <button
            key={tab.href}
            onClick={() => handleClick(tab.href)}
            className={cn(
              'flex flex-col items-center justify-center flex-1 py-2 px-1 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-1 focus-visible:ring-offset-[#060e20]',
              isActive
                ? 'text-purple-400'
                : 'text-gray-400 hover:text-gray-200'
            )}
            aria-current={isActive ? 'page' : undefined}
            aria-label={ariaLabel}
          >
            {/* Active indicator pill above the icon */}
            <span
              className={cn(
                'block h-[3px] w-6 rounded-full mb-1 transition-all duration-150',
                isActive ? 'bg-purple-400' : 'bg-transparent'
              )}
              aria-hidden="true"
            />
            <div className="relative">
              <tab.Icon
                size={22}
                aria-hidden="true"
                className={cn(
                  'transition-transform duration-150',
                  isActive ? 'scale-110' : 'scale-100'
                )}
              />
              {unreadCount > 0 && (
                <span
                  className="absolute -top-1 -right-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white leading-none ring-1 ring-[#060e20] shadow-sm"
                  aria-hidden="true"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            {/* Always render label; visually prominent when active */}
            <span
              className={cn(
                'text-[10px] mt-0.5 font-medium leading-none transition-colors duration-150',
                isActive ? 'text-purple-400' : 'text-gray-500'
              )}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
