"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SearchInput } from "./SearchInput";
import { NetworkSwitcher } from "./NetworkSwitcher";
import { WalletMenu } from "./WalletMenu";
import { ConnectWalletAction } from "./ConnectWalletAction";
import { NavItem } from "./NavItem";
import { usePathname } from "next/navigation";
import { Bell, Moon, Sun, Plus, Info, Home, List, Settings as SettingsIcon, LifeBuoy, LogOut, MessageCircle } from "lucide-react";
import { ConnectWalletModal } from "@/components/connect-wallet-modal";
import { useWalletContext } from "@/context/WalletContext";
import { ArrowDown, Notification, Chat } from "../icons";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from "next/image";
import { mockNavbarState as navbarState, mockUser as user } from "./navbar.mock";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Events", href: "/events" },
  { name: "Verification", href: "/verification" },
  { name: "Disputes", href: "/disputes" },
  { name: "Finances", href: "/finances" },
  { name: "Settings", href: "/settings" },
];

export function Navbar() {
  const pathname = usePathname();
  const [network, setNetwork] = React.useState(navbarState.networkName);
  const { theme, setTheme } = useTheme();
  const [isWalletModalOpen, setIsWalletModalOpen] = React.useState(false);
  const { address, connected } = useWalletContext();

  function truncateMiddle(value: string, visible = 4) {
    if (!value) return "";
    return value.length <= visible * 2
      ? value
      : `${value.slice(0, visible)}…${value.slice(-visible)}`;
  }

  function toggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  const currentTitle = React.useMemo(() => {
    const found = NAV_ITEMS.find((i) => i.href === pathname);
    if (found) return found.name;
    try {
      const segment = pathname?.split("/").filter(Boolean)[0];
      return segment ? segment[0]?.toUpperCase() + segment.slice(1) : "Dashboard";
    } catch {
      return "Dashboard";
    }
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b px-4 backdrop-blur md:px-6" style={{ background: 'linear-gradient(180deg, #170427 69.23%, #540D8D 100%)' }}>
      {/* Top row (mobile) */}
      <div className="flex items-center justify-between py-3 lg:hidden">
        {/* Mobile: nav drawer */}
        <div className="-ml-2 lg:ml-0 flex items-center gap-0">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="lg:hidden bg-transparent border-0 justify-start px-2" aria-label="Open navigation">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="!h-[24px] !w-[24px]">
                  <line x1="4" x2="20" y1="12" y2="12" />
                  <line x1="4" x2="20" y1="6" y2="6" />
                  <line x1="4" x2="20" y1="18" y2="18" />
                </svg>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-80 sm:max-w-sm border-none bg-gradient-to-b from-[#11051D] via-[#150627] to-[#540D8D] text-white p-4"
              closeClassName="grid place-items-center h-6 w-6 rounded-full border border-white text-white opacity-90 bg-transparent hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/70 focus:ring-offset-2 focus:ring-offset-transparent"
              closeIconClassName="h-3 w-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full border border-white/20 grid place-items-center">
                    <Image src="/images/predictify-logo.png" alt="Predictify" width={30} height={30} />
                  </div>
                  <span className="text-lg font-semibold" style={{ color: "#E3D365" }}>Predictify</span>
                </div>
              </div>
              <div className="my-4 h-px w-full bg-white/10" />
              <div className="mt-4">
                <SearchInput variant="sidebar" className="w-full max-w-none" placeholder="Search" />
              </div>
              <nav className="mt-6 grid gap-3 text-[15px]">
                <NavItem href="/dashboard" label="Dashboard" icon={<Home className="h-5 w-5 text-[#A5B4FC]" />} isActive={pathname === "/dashboard"} endBadgeText={`${navbarState.notificationCount}`} />
                <NavItem href="/events" label="My Predictions" icon={<List className="h-5 w-5 text-[#A5B4FC]" />} isActive={pathname === "/events"} />
                <NavItem href="/settings" label="Settings" icon={<SettingsIcon className="h-5 w-5 text-[#A5B4FC]" />} isActive={pathname === "/settings"} />
                <NavItem href="/help" label="Help & Support" icon={<MessageCircle className="h-5 w-5 text-[#8AA0FF]" strokeWidth={2.5} />} />
                <button type="button" className="flex items-center rounded-md px-3 py-2 hover:bg-white/5 text-left">
                  <LogOut className="mr-3 h-5 w-5 text-[#A5B4FC]" />
                  Logout
                </button>
              </nav>
            </SheetContent>
          </Sheet>
          <span className="text-xl font-semibold text-white">{currentTitle}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="p-0 relative text-white" aria-label="Notifications">
            <Notification className="!h-[22px] !w-[22px]" />
            {navbarState.notificationCount > 0 && (
              <div className="h-[12px] w-[12px] bg-[#EB6945] z-10 rounded-full absolute top-[10px] right-[8px]" />
            )}
          </Button>
          <div>

          <div className="border-[0.24px] border-[#FFFFFF] p-1 bg-[#67289A] rounded-full">
            <Avatar className="h-8 w-8 border-[0.86px] border-[#E8EAED]">
              <AvatarImage className="object-cover" src={user.avatarUrl} alt={user.name} />
              <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
            </Avatar>
          </div>
          </div>
        </div>
      </div>

      {/* Second row (mobile): network + wallet */}
      <div className="lg:hidden flex justify-end lg:justify-start items-center gap-3 py-3">
        <NetworkSwitcher network={network} onChange={setNetwork} />
        {connected ? (
          <WalletMenu />
        ) : (
          <ConnectWalletAction compact onOpenModal={() => setIsWalletModalOpen(true)} />
        )}
      </div>

      {/* Third row (mobile): search */}
      <div className="lg:hidden pb-3">
        <SearchInput className="w-full max-w-none" />
      </div>

      {/* Desktop layout */}
      <div className="hidden h-16 items-center gap-3 lg:flex">
        {/* Mobile: nav drawer */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="lg:hidden" aria-label="Open navigation">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 sm:max-w-sm">
          <nav className="grid gap-2 text-lg font-medium">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.name} href={item.href} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
        {/* Search */}
        <div className="flex w-full items-center gap-3 md:gap-4">
          <div className="flex-1">
            <SearchInput />
          </div>
          {/* Right group (desktop) */}
          <div className="items-center gap-2 hidden lg:flex">
            <NetworkSwitcher network={network} onChange={setNetwork} />
            <WalletMenu />
            <Button variant="ghost" size="icon" className="relative text-white" aria-label="Notifications">
              <Notification />
              {navbarState.notificationCount > 0 && (
                <div className="absolute top-[10px] right-[8px] h-2.5 w-2.5 rounded-full bg-[#EB6945]" />
              )}
            </Button>
            <Button variant="ghost" className="bg-transparent hover:bg-transparent" size="icon" onClick={toggleTheme} aria-label="Toggle theme" title="Toggle theme">
              <Sun className="h-5 w-5 hidden dark:block" />
              <Moon className="h-5 w-5 dark:hidden" />
            </Button>
          </div>
        </div>
      </div>
      {/* Mobile: connect wallet modal */}
      <ConnectWalletModal
        isOpen={isWalletModalOpen}
        onOpenChange={setIsWalletModalOpen}
      />
    </header>
  );
}


