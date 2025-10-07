"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  BarChart3,
  Calendar,
  CheckCircle,
  CreditCard,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Settings,
  ChevronDown,
  ChevronRight,
  BookOpen,
  PlayCircle,
  MessageSquare,
} from "lucide-react";
import Image from "next/image";
import { SearchInput } from "@/components/navbar/SearchInput";
import {
  Home,
  List,
  Settings as SettingsIcon,
  MessageCircle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ConnectWalletModal } from "@/components/connect-wallet-modal";
import { Navbar } from "@/components/navbar/Navbar";

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
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

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

  const handleLogout = () => {
    router.push("/login");
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
        {/* Sidebar */}
        <aside className="hidden w-80 flex-col lg:flex border-none bg-gradient-to-b from-[#11051D] via-[#150627] to-[#540D8D] text-white">
          <div className="p-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full border border-white/20 grid place-items-center">
                <Image
                  src="/images/predictify-logo.png"
                  alt="Predictify"
                  width={30}
                  height={30}
                />
              </div>
              <span className="text-lg font-semibold text-[#E3D365]">Predictify</span>
              <span
                className="text-lg font-semibold"
                style={{ color: "#E3D365" }}
              >
                Predictify
              </span>
            </div>
            <div className="my-4 h-px w-full bg-white/10" />
            <div className="mt-4">
              <SearchInput
                variant="sidebar"
                className="w-full max-w-none"
                placeholder="Search"
              />
            </div>
          </div>

          {/* Navigation */}
          <nav className="mt-2 grid gap-1 lg:gap-3 text-[15px] px-2">
            <Link
              href="/dashboard"
              className={`flex items-center justify-between rounded-md px-3 py-2 hover:bg-white/5 ${
                pathname === "/dashboard" ? "bg-white/5" : ""
              }`}
            >
              <span className="inline-flex items-center gap-3">
                <Home className="h-5 w-5 text-[#8AA0FF]" /> Dashboard
                <Home className="h-5 w-5 text-[#8AA0FF]" />
                Dashboard
              </span>
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-white text-[#1B0F2B] text-xs px-2">
                10
              </span>
            </Link>

            <Link
              href="/bets"
              className={`flex items-center rounded-md px-3 py-2 hover:bg-white/5 ${
                pathname === "/bets" ? "bg-white/5" : ""
            <Link
              href="/mypredictions"
              className={`flex items-center rounded-md px-3 py-2 hover:bg-white/5 ${
                pathname === "/mypredictions" ? "bg-white/5" : ""
              }`}
            >
              <List className="mr-3 h-5 w-5 text-[#8AA0FF]" />
              My Predictions
            </Link>

            <Link
              href="/settings"
              className={`flex items-center rounded-md px-3 py-2 hover:bg-white/5 ${
                pathname === "/settings" ? "bg-white/5" : ""
              }`}
            >
              <SettingsIcon className="mr-3 h-5 w-5 text-[#8AA0FF]" />
              Settings
            </Link>

            {/* Help & Support Dropdown */}
            <div className="px-1">
              <button
                type="button"
                onClick={() => setIsHelpOpen(!isHelpOpen)}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 hover:bg-white/5 ${
                  isHelpOpen ? "bg-white/5" : ""
                }`}
              >
                <span className="inline-flex items-center gap-3">
                  <MessageCircle className="h-5 w-5 text-[#8AA0FF]" strokeWidth={2.5} />
                  Help & Support
                </span>
                {isHelpOpen ? (
                  <ChevronDown className="h-4 w-4 text-[#8AA0FF]" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-[#8AA0FF]" />
                )}
              </button>

              {isHelpOpen && (
                <div className="mt-3 ml-3 mr-2 flex flex-col gap-3">
                  {/* Search Input */}
                  <div className="px-2">
                    <input
                      type="text"
                      placeholder="Search"
                      className="w-full rounded-md bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 focus:outline-none focus:ring-1 focus:ring-white/20"
                    />
                  </div>

                  {/* Main Links */}
                  <div className="flex flex-col gap-1 px-2 text-[14px]">
                    <Link
                      href="/help/faqs"
                      className={`py-1.5 hover:text-white transition-colors ${
                        pathname === "/help/faqs" ? "text-white" : "text-[#C7D2FE]"
                      }`}
                    >
                      FAQs
                    </Link>

                    <Link
                      href="/help/troubleshooting"
                      className={`py-1.5 hover:text-white transition-colors ${
                        pathname === "/help/troubleshooting" ? "text-white" : "text-[#C7D2FE]"
                      }`}
                    >
                      Troubleshooting
                    </Link>

                    <Link
                      href="/help/contact"
                      className={`py-1.5 hover:text-white transition-colors ${
                        pathname === "/help/contact" ? "text-white" : "text-[#C7D2FE]"
                      }`}
                    >
                      Contact Support
                    </Link>
                  </div>

                  {/* Divider and Helpful Resources */}
                  <div className="px-2">
                    <div className="h-px w-full bg-white/10 mb-3" />
                    <div className="text-[11px] uppercase tracking-wider text-[#9CA3AF] mb-2 font-medium">
                      Helpful Resources
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 px-2 text-[14px]">
                    <Link
                      href="/help/user-guide"
                      className={`flex items-center gap-2 py-1.5 hover:text-white transition-colors ${
                        pathname === "/help/user-guide" ? "text-white" : "text-[#C7D2FE]"
                      }`}
                    >
                      <BookOpen className="h-4 w-4 text-[#8AA0FF]" /> User Guide
                    </Link>

                    <Link
                      href="/help/video-tutorials"
                      className={`flex items-center gap-2 py-1.5 hover:text-white transition-colors ${
                        pathname === "/help/video-tutorials" ? "text-white" : "text-[#C7D2FE]"
                      }`}
                    >
                      <PlayCircle className="h-4 w-4 text-[#8AA0FF]" /> Video Tutorials
                    </Link>

                    <Link
                      href="/help/community"
                      className={`flex items-center gap-2 py-1.5 hover:text-white transition-colors ${
                        pathname === "/help/community" ? "text-white" : "text-[#C7D2FE]"
                      }`}
                    >
                      <MessageSquare className="h-4 w-4 text-[#8AA0FF]" /> Community Forum
                    </Link>
                  </div>
                </div>
              )}
            </div>
            <Link
              href="/help"
              className="flex items-center rounded-md px-3 py-2 hover:bg-white/5"
            >
              <MessageCircle
                className="mr-3 h-5 w-5 text-[#8AA0FF]"
                strokeWidth={2.5}
              />
              Help & Support
            </Link>
          </nav>

          {/* Footer */}
          <div className="flex-1" />
          <div className="px-4 pb-4">
            <div className="h-px w-full bg-[#6366F1] mb-3" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="w-[40px] h-[40px] rounded-[76.88px] opacity-100">
                  <AvatarImage
                    className="object-cover"
                    src="/images/avatar2.png"
                    alt="User"
                  />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <div className="leading-tight">
                  <div className="text-sm font-semibold text-white">
                    Azunyan U. Wu
                  </div>
                  <div className="text-[14px] text-[#C7D2FE] leading-5">
                    Basic Member
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="w-[40px] h-[40px] flex items-center justify-center rounded-[123px] bg-[#540D8D] hover:bg-[#6B1DAB] opacity-100"
              >
                <LogOut className="w-[28px] h-[28px] text-white" />
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <Navbar />
          <div className="">{children}</div>
        </main>
      </div>
    </div>
  );
}
