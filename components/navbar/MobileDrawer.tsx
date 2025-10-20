"use client"

import { useEffect, useRef } from "react"
import { X, Wallet, Rocket } from "lucide-react"
import Link from "next/link"

type NavLink = { label: string; href: string }

interface MobileDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  links: NavLink[]
  onConnectClick?: () => void
  transparent?: boolean
}

export default function MobileDrawer({ open, onOpenChange, links, onConnectClick }: MobileDrawerProps) {
  const panelRef = useRef<HTMLDivElement | null>(null)

  // Close on ESC and basic focus trap
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false)
    }
    if (open) {
      document.addEventListener("keydown", onKey)
      // Move focus to panel on open
      const firstFocusable = panelRef.current?.querySelector<HTMLElement>(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
      )
      firstFocusable?.focus()
    }
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onOpenChange])

  // Trap focus while open
  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      if (!open) return
      if (panelRef.current && e.target instanceof Node && !panelRef.current.contains(e.target)) {
        const firstFocusable = panelRef.current.querySelector<HTMLElement>(
          "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
        )
        firstFocusable?.focus()
        e.preventDefault()
      }
    }
    if (open) document.addEventListener("focus", handleFocus, true)
    return () => document.removeEventListener("focus", handleFocus, true)
  }, [open])

  return (
    <div
      aria-hidden={!open}
      className={`fixed inset-0 z-50 transition ${open ? "pointer-events-auto" : "pointer-events-none"}`}
    >
      {/* backdrop */}
      <div
        aria-hidden
        onClick={() => onOpenChange(false)}
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
      />

      {/* panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
        className={`absolute right-0 top-0 h-full w-[88%] max-w-sm bg-white border-l border-black/10 shadow-xl transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-black/10">
          <span className="text-sm font-semibold text-slate-800">Menu</span>
          <button aria-label="Close menu" className="p-2 rounded-md hover:bg-slate-100" onClick={() => onOpenChange(false)}>
            <X className="w-5 h-5 text-slate-800" />
          </button>
        </div>

        <nav className="p-4 space-y-2">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => onOpenChange(false)}
              className="block rounded-md px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 mt-auto space-y-2">
          <button
            onClick={onConnectClick}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#48097b] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3f076c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#48097b]/30"
          >
            <Wallet className="w-4 h-4" /> Connect Wallet
          </button>
          
        </div>
      </div>
    </div>
  )
}