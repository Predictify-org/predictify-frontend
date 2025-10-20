"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react"
import { Menu, Wallet, Bell, Sun, Moon, ChevronDown } from "lucide-react"
import MobileDrawer from "./mobile-drawer"
import Image from "next/image"
import { SearchInput } from "@/components/navbar/SearchInput"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useTheme } from "next-themes"

interface NavbarProps {
  transparent?: boolean
}

const LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it Works", href: "#how-it-works" },
  { label: "Wallets", href: "#wallets" },
  { label: "FAQ", href: "#faq" },
] as const

export default function Navbar({ transparent }: NavbarProps) {
  const [activeHash, setActiveHash] = useState<string>("#features")
  const [drawerOpen, setDrawerOpen] = useState(false)
  const headerRef = useRef<HTMLDivElement | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const { theme, setTheme } = useTheme()
  const [notificationCount] = useState(2) // Mock notification count

  // Sticky translucent header with gradient/blur and subtle border on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 2)
    onScroll()
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // IntersectionObserver to highlight active section
  useEffect(() => {
    const ids = LINKS.map((l) => l.href.replace("#", ""))
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveHash(`#${entry.target.id}`)
          }
        })
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0.01 }
    )

    ids.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  const navLinks = useMemo(() => LINKS.map((l) => ({ ...l })), [])

  const handleSmoothScroll = (href: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (href.startsWith("#")) {
      e.preventDefault()
      const id = href.slice(1)
      const el = document.getElementById(id)
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
      history.replaceState(null, "", href)
    }
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <div
      ref={headerRef}
      className={
        `sticky top-0 z-40 ${
          transparent ? "bg-transparent" : "bg-[#261646]"
        } ${scrolled ? "border-b border-white/10" : "border-b border-transparent"}`
      }
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Desktop Layout */}
        <div className="hidden lg:flex items-center justify-between h-16">
          {/* Left: Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <Image src="/Frame.svg" alt="Predictify" width={120} height={24} priority />
            </Link>
          </div>

          {/* Center: Search Bar */}
          <div className="flex-1 max-w-md mx-8">
            <SearchInput 
              placeholder="Search for token, event, wallet address"
              className="w-full"
            />
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {/* Stellar Network Switcher */}
            <Button
              variant="ghost"
              className="flex items-center gap-2 text-white hover:bg-white/10 px-3 py-2"
            >
              <div className="w-4 h-4 rounded-full bg-gradient-to-r from-blue-400 to-purple-500"></div>
              <span className="text-sm font-medium">Stellar</span>
              <ChevronDown className="w-4 h-4" />
            </Button>

            {/* Connect Wallet */}
            <Button
              onClick={() => document.dispatchEvent(new CustomEvent("open-connect-wallet"))}
              className="bg-[#48097b] hover:bg-[#3f076c] text-white px-4 py-2 text-sm font-semibold"
            >
              <Wallet className="w-4 h-4 mr-2" />
              Connect Wallet
            </Button>

            {/* Notifications */}
            <Button
              variant="ghost"
              size="icon"
              className="relative text-white hover:bg-white/10"
            >
              <Bell className="w-5 h-5" />
              {notificationCount > 0 && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-bold">{notificationCount}</span>
                </div>
              )}
            </Button>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="text-white hover:bg-white/10"
            >
              <Sun className="w-5 h-5 dark:hidden" />
              <Moon className="w-5 h-5 hidden dark:block" />
            </Button>

            {/* User Avatar */}
            <Avatar className="w-8 h-8">
              <AvatarImage src="/images/avatar.jpg" alt="User" />
              <AvatarFallback className="bg-[#48097b] text-white">U</AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="lg:hidden">
          {/* Top row */}
          <div className="flex items-center justify-between py-3">
            <Link href="/" className="flex items-center">
              <Image src="/Frame.svg" alt="Predictify" width={100} height={20} priority />
            </Link>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="relative text-white"
              >
                <Bell className="w-5 h-5" />
                {notificationCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full"></div>
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDrawerOpen(true)}
              >
                <Menu className="w-5 h-5 text-white" />
              </Button>
            </div>
          </div>

          {/* Search row */}
          <div className="pb-3">
            <SearchInput 
              placeholder="Search for token, event, wallet address"
              className="w-full"
            />
          </div>

          {/* Actions row */}
          <div className="flex items-center justify-between pb-3">
            <Button
              variant="ghost"
              className="flex items-center gap-2 text-white hover:bg-white/10 px-3 py-2"
            >
              <div className="w-4 h-4 rounded-full bg-gradient-to-r from-blue-400 to-purple-500"></div>
              <span className="text-sm font-medium">Stellar</span>
              <ChevronDown className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => document.dispatchEvent(new CustomEvent("open-connect-wallet"))}
              className="bg-[#48097b] hover:bg-[#3f076c] text-white px-4 py-2 text-sm font-semibold"
            >
              <Wallet className="w-4 h-4 mr-2" />
              Connect Wallet
            </Button>
          </div>
        </div>
      </div>

      <MobileDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        links={navLinks}
        onConnectClick={() => document.dispatchEvent(new CustomEvent("open-connect-wallet"))}
      />
    </div>
  )
}