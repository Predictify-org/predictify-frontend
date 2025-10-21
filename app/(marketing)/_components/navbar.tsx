"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react"
import { Menu, Wallet } from "lucide-react"
import MobileDrawer from "./mobile-drawer"
import Image from "next/image"

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

  return (
    <div
      ref={headerRef}
      className={
        `sticky top-0 z-40 ${
          transparent ? "bg-transparent" : "bg-[#261646]"
        } ${scrolled ? "border-b border-white/10" : "border-b border-transparent"}`
      }
    >
      <div className="mx-auto max-w-7xl px-2 sm:px-4">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-3 -ml-1 md:-ml-2">
            <Link href="/" className="flex items-center">
              <Image src="/images/predictify-logo.png" alt="Predictify" width={120} height={24} priority />
            </Link>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={handleSmoothScroll(l.href)}
                aria-current={activeHash === l.href ? "page" : undefined}
                className={`text-sm font-medium tracking-wide transition-colors hover:text-white ${
                  activeHash === l.href ? "text-white" : "text-slate-300"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* CTA group */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => document.dispatchEvent(new CustomEvent("open-connect-wallet"))}
              className="inline-flex items-center gap-2 rounded-lg bg-[#48097b] text-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-[#3f076c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 mr-1 sm:mr-2"
            >
              <Wallet className="w-4 h-4" />
              Connect Wallet
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            aria-label="Open menu"
            className="md:hidden inline-flex items-center justify-center rounded-md p-2 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setDrawerOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
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