"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SearchInput } from "./SearchInput";
import { NetworkSwitcher } from "./NetworkSwitcher";
import { WalletMenu } from "./WalletMenu";
import { ConnectWalletAction } from "./ConnectWalletAction";
import { ConnectWalletModal } from "@/components/connect-wallet-modal";
import { useWalletContext } from "@/context/WalletContext";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from "next/image";
import { mockUser as user, mockNavbarState as navbarState } from "./navbar.mock";
import { WhatsNewDrawer } from "@/components/changelog/WhatsNewDrawer";
import { getNetworkTint } from "@/lib/network-tint";
import { useEffect } from "react";

const NAV_ITEMS = [
  { name: "Markets", href: "/markets", icon: "trending_up" },
  { name: "Portfolio", href: "/portfolio", icon: "pie_chart" },
  { name: "Analytics", href: "/analytics", icon: "bar_chart" },
  { name: "Admin", href: "/admin", icon: "admin_panel_settings" },
];

export function Navbar() {
  const pathname = usePathname();
  const [network, setNetwork] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("predictify_network") || navbarState.networkName;
    }
    return navbarState.networkName;
  });
  const { theme, setTheme } = useTheme();
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("predictify_network", network);
  }, [network]);

  const activeTint = getNetworkTint(network);
  const { connected, isLoading } = useWalletContext();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <>
      {/* Desktop Top Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-xl shadow-[0_0_40px_-5px_rgba(105,218,255,0.08)] hidden md:block border-b border-slate-800/15">
        <div className="flex justify-between items-center px-6 h-20 w-full max-w-none">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-2xl font-bold tracking-tighter text-cyan-400 font-headline">
              Predictify
            </Link>
            <div className="flex gap-6 items-center">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href || (pathname === '/' && item.href === '/markets');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`text-sm transition-all duration-300 font-medium ${
                      isActive
                        ? "pb-1"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                    style={isActive ? { 
                      color: activeTint.tint,
                      borderBottom: `2px solid ${activeTint.tint}`
                    } : {}}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative group hidden lg:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg" aria-hidden="true">search</span>
              <input
                id="navbar-search"
                className="bg-[#192540] border-none rounded-xl pl-10 pr-4 py-2 text-sm w-64 focus:ring-1 focus:ring-cyan-400 transition-all bg-opacity-40 text-white placeholder-slate-400"
                placeholder="Search markets..."
                type="search"
                aria-label="Search markets"
              />
            </div>
            
            <NetworkSwitcher network={network} onChange={setNetwork} />

            <WhatsNewDrawer />

            {isLoading ? (
              <button disabled aria-busy="true" aria-label="Connecting wallet, please wait" className="bg-[#69daff]/50 text-[#004a5d] px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-[#69daff]/10">
                Loading...
              </button>
            ) : connected ? (
              <WalletMenu network={network} />
            ) : (
              <button 
                onClick={() => setIsWalletModalOpen(true)}
                className="bg-gradient-to-br from-[#69daff] to-[#00cffc] text-[#004a5d] font-bold px-6 py-2.5 rounded-xl text-sm active:scale-95 duration-150 transition-all shadow-lg shadow-[#69daff]/10"
              >
                Connect Wallet
              </button>
            )}
            
            <button
              onClick={toggleTheme}
              className="text-slate-400 hover:text-white transition-colors flex items-center justify-center p-2 rounded-lg hover:bg-slate-800"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <span className="material-symbols-outlined" aria-hidden="true">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Top Header */}
      <header className="fixed top-0 w-full z-40 bg-slate-950/80 backdrop-blur-xl h-20 flex justify-between items-center px-6 shadow-[0_0_40px_-5px_rgba(105,218,255,0.08)] border-b border-slate-800/15 md:hidden">
        <Link href="/" className="text-2xl font-bold tracking-tighter text-cyan-400 font-headline">
          Predictify
        </Link>
        <div className="flex items-center gap-2">
          <WhatsNewDrawer />
          {isLoading ? (
            <button disabled aria-busy="true" aria-label="Connecting wallet, please wait" className="bg-[#69daff]/50 text-[#004a5d] px-4 py-2 rounded-md text-xs font-bold">
              <span aria-hidden="true">...</span>
            </button>
          ) : connected ? (
             <Avatar className="h-8 w-8 border border-slate-600">
               <AvatarImage src={user?.avatarUrl} alt={user?.name} />
               <AvatarFallback>{user?.name?.[0] || "U"}</AvatarFallback>
             </Avatar>
          ) : (
            <button
              onClick={() => setIsWalletModalOpen(true)}
              aria-label="Connect wallet"
              className="bg-gradient-to-br from-[#69daff] to-[#00cffc] text-[#004a5d] px-4 py-2 rounded-md font-bold text-xs"
            >
              Connect
            </button>
          )}
        </div>
      </header>

      {/* Mobile Bottom Navbar */}
      <nav aria-label="Mobile navigation" className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center min-h-[72px] px-4 pb-safe bg-slate-950/90 backdrop-blur-lg shadow-2xl border-t border-slate-800/15">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (pathname === '/' && item.href === '/markets');
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={
                isActive
                  ? "flex flex-col items-center justify-center rounded-xl px-3 min-h-[44px] min-w-[44px] py-1 transition-all"
                  : "flex flex-col items-center justify-center text-slate-500 hover:text-cyan-200 min-h-[44px] min-w-[44px] py-1 transition-all"
              }
              style={isActive ? {
                backgroundColor: activeTint.bg,
                color: activeTint.tint
              } : {}}
            >
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-[20px]"
                style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
              >
                {item.icon}
              </span>
              <span className="text-[10px] font-medium font-body mt-0.5">
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      <ConnectWalletModal
        isOpen={isWalletModalOpen}
        onOpenChange={setIsWalletModalOpen}
        onWalletConnect={() => {}}
        onWalletDisconnect={() => {}}
      />
    </>
  );
}
