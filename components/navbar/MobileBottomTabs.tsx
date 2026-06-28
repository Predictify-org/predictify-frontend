
import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Home, TrendingUp, Lightbulb, Wallet, MoreHorizontal, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

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

export const MobileBottomTabs: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();

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
        return (
          <button
            key={tab.href}
            onClick={() => handleClick(tab.href)}
            className="flex flex-col items-center text-gray-400 hover:text-white focus:outline-none"
            aria-current={isActive ? 'page' : undefined}
            aria-label={isActive ? undefined : tab.label}
          >
            <tab.Icon
              size={24}
              className={cn(isActive ? 'text-purple-400' : 'text-gray-400')}
            />
            {isActive && <span className="text-xs mt-1">{tab.label}</span>}
          </button>
        );
      })}
    </nav>
  );
};
