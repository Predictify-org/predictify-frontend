"use client"

import Link from "next/link"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface NavLink {
  label: string
  href: string
}

interface MobileDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  links: NavLink[]
  onConnectClick?: () => void
}

export default function MobileDrawer({
  open,
  onOpenChange,
  links,
  onConnectClick,
}: MobileDrawerProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="absolute right-0 top-0 h-full w-72 bg-[#060e20] border-l border-purple-900/40 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-purple-900/40">
          <span className="text-white font-semibold text-lg">Menu</span>
          <button
            onClick={() => onOpenChange(false)}
            className="text-gray-400 hover:text-white focus:outline-none rounded-md p-1"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1" aria-label="Mobile navigation">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => onOpenChange(false)}
              className="block px-4 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-purple-900/40 transition-colors text-sm font-medium"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Footer CTA */}
        <div className="p-4 border-t border-purple-900/40">
          <Button
            onClick={() => {
              onConnectClick?.()
              onOpenChange(false)
            }}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          >
            Connect Wallet
          </Button>
        </div>
      </div>
    </div>
  )
}
