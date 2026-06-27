import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { MdHome, MdShowChart, MdInsights, MdAccountBalanceWallet, MdMoreHoriz } from 'react-icons/md';

interface TabItem {
  label: string;
  href: string;
  icon: React.ReactElement;
}

const tabs: TabItem[] = [
  { label: 'Home', href: '/', icon: <MdHome size={24} /> },
  { label: 'Markets', href: '/markets', icon: <MdShowChart size={24} /> },
  { label: 'Predictions', href: '/mypredictions', icon: <MdInsights size={24} /> },
  { label: 'Wallet', href: '/wallet', icon: <MdAccountBalanceWallet size={24} /> },
  { label: 'More', href: '/more', icon: <MdMoreHoriz size={24} /> },
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
            {React.cloneElement(tab.icon, { className: isActive ? 'text-primary-500' : '' })}
            {isActive && <span className="text-xs mt-1">{tab.label}</span>}
          </button>
        );
      })}
    </nav>
  );
};
