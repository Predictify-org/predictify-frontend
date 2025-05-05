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
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import ConnectWalletButton from "@/components/ui/connectWalletButton";
import { ConnectWalletModal } from "@/components/connect-wallet-modal";

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
    { name: "Betting History", href: "/history", icon: User },
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
      {/* Mobile header */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static md:px-6">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden">
              <span className="sr-only">Toggle navigation menu</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <line x1="4" x2="20" y1="12" y2="12" />
                <line x1="4" x2="20" y1="6" y2="6" />
                <line x1="4" x2="20" y1="18" y2="18" />
              </svg>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 sm:max-w-sm">
            <nav className="grid gap-2 text-lg font-medium">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 ${isActive
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                      }`}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-semibold"
          >
            <span className="hidden md:inline-block">
              Prediction Platform Admin
            </span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-end gap-4">
          <ConnectWalletButton
            isConnected={isConnected}
            walletName={walletName}
            walletAddress={walletAddress}
            onConnectClick={() => setIsWalletModalOpen(true)}
            onOpenModal={() => setIsWalletModalOpen(true)}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src="/placeholder.svg?height=32&width=32"
                    alt="Avatar"
                  />
                  <AvatarFallback>AD</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <ConnectWalletModal
        isOpen={isWalletModalOpen}
        onOpenChange={setIsWalletModalOpen}
        onWalletConnect={handleWalletConnect}
        onWalletDisconnect={handleWalletDisconnect}
      />

      <div className="flex flex-1">
        {/* Sidebar for desktop */}
        <aside className="hidden w-64 flex-col border-r bg-muted/40 md:flex">
          <nav className="grid gap-2 p-4 text-sm font-medium">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 ${isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                    }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
