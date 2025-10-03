"use client";

import { ConnectWalletModal } from "@/components/connect-wallet-modal";
import { Navbar } from "@/components/navbar/Navbar";
import { SearchInput } from "@/components/navbar/SearchInput";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    BarChart3,
    Calendar,
    CheckCircle,
    CreditCard,
    HelpCircle,
    Home,
    LayoutDashboard,
    List,
    LogOut,
    MessageCircle,
    Settings,
    Settings as SettingsIcon,
    User,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // Prevent hydration errors
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleLogout = () => {
    router.push("/login");
  };

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Prediction Events", href: "/events", icon: Calendar },
    { name: "Outcome Verification", href: "/verification", icon: CheckCircle },
    { name: "Dispute Resolution", href: "/disputes", icon: HelpCircle },
    { name: "Financial Overview", href: "/finances", icon: CreditCard },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  if (!isMounted) {
    return null;
  }

  const handleWalletConnect = (name: string, address: string) => {
    setIsConnected(true);
    setWalletName(name);
    setWalletAddress(address);
    setIsWalletModalOpen(false);
  };

  const handleWalletDisconnect = () => {
    setIsConnected(false);
    setWalletName(null);
    setWalletAddress(null);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <ConnectWalletModal
        isOpen={isWalletModalOpen}
        onOpenChange={setIsWalletModalOpen}
        onWalletConnect={handleWalletConnect}
        onWalletDisconnect={handleWalletDisconnect}
      />

      <div className="flex flex-1">
        {/* Sidebar for desktop (matches mobile offcanvas) */}
        <aside className="hidden w-80 flex-col lg:flex border-none bg-gradient-to-b from-[#11051D] via-[#150627] to-[#540D8D] text-white">
          <div className="p-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full border border-white/20 grid place-items-center">
                <Image src="/images/predictify-logo.png" alt="Predictify" width={30} height={30} />
              </div>
              <span className="text-lg font-semibold text-[#E3D365]">Predictify</span>
            </div>
            <div className="my-4 h-px w-full bg-white/10" />
            <div className="mt-4">
              <SearchInput variant="sidebar" className="w-full max-w-none" placeholder="Search" />
            </div>
          </div>
          <nav className="mt-2 grid gap-1 lg:gap-3 text-[15px] px-2">
            <Link href="/dashboard" className={`flex items-center justify-between rounded-md px-3 py-2 hover:bg-white/5 ${pathname === "/dashboard" ? "bg-white/5" : ""}`}>
              <span className="inline-flex items-center gap-3"><Home className="h-5 w-5 text-[#8AA0FF]" />Dashboard</span>
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-white text-[#1B0F2B] text-xs px-2">10</span>
            </Link>
            <Link href="/bets" className={`flex items-center rounded-md px-3 py-2 hover:bg-white/5 ${pathname === "/bets" ? "bg-white/5" : ""}`}>
              <List className="mr-3 h-5 w-5 text-[#8AA0FF]" />
              My Predictions
            </Link>
            <Link href="/profile" className={`flex items-center rounded-md px-3 py-2 hover:bg-white/5 ${pathname === "/profile" ? "bg-white/5" : ""}`}>
              <User className="mr-3 h-5 w-5 text-[#8AA0FF]" />
              Profile
            </Link>
            <Link href="/settings" className={`flex items-center rounded-md px-3 py-2 hover:bg-white/5 ${pathname === "/settings" ? "bg-white/5" : ""}`}>
              <SettingsIcon className="mr-3 h-5 w-5 text-[#8AA0FF]" />
              Settings
            </Link>
            <Link href="/help" className="flex items-center rounded-md px-3 py-2 hover:bg-white/5">
              <MessageCircle className="mr-3 h-5 w-5 text-[#8AA0FF]" strokeWidth={2.5} />
              Help & Support
            </Link>
          </nav>
          <div className="flex-1" />
          <div className="px-4 pb-4">
            <div className="h-px w-full bg-[#6366F1] mb-3" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="w-[40px] h-[40px] rounded-[76.88px] opacity-100">
                  <AvatarImage className="object-cover" src="/images/avatar2.png" alt="User" />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <div className="leading-tight">
                  <div className="text-sm font-semibold text-white">Azunyan U. Wu</div>
                  <div className="text-[14px] text-[#C7D2FE] leading-5">Basic Member</div>
                </div>
              </div>
              <button 
                type="button" 
                className="w-[40px] h-[40px] flex items-center justify-center rounded-[123px] bg-[#540D8D] hover:bg-[#6B1DAB] opacity-100"
                title="Logout"
                onClick={handleLogout}
              >
                <LogOut className="w-[28px] h-[28px] text-white" />
              </button>
            </div>
          </div>
        </aside>
        <main className="flex-1 overflow-auto">
          <Navbar />
          <div className="p-4 md:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
