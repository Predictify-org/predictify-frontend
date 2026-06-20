"use client"

import { Wallet } from "lucide-react"
import Link from "next/link"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { X } from "lucide-react"

type NavLink = { label: string; href: string }

interface MobileDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  links: NavLink[]
  onConnectClick?: () => void
  transparent?: boolean
}

export default function MobileDrawer({ open, onOpenChange, links, onConnectClick }: MobileDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        aria-label="Mobile navigation"
        className="w-[88%] max-w-sm bg-white p-0 border-l border-black/10 shadow-xl"
        closeClassName="hidden"
      >
        <SheetHeader className="flex flex-row items-center justify-between p-4 border-b border-black/10 space-y-0">
          <SheetTitle className="text-sm font-semibold text-slate-800">Menu</SheetTitle>
          <SheetClose
            aria-label="Close menu"
            className="p-2 rounded-md hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
          >
            <X className="w-5 h-5 text-slate-800" aria-hidden="true" />
          </SheetClose>
        </SheetHeader>

        <nav aria-label="Mobile navigation links" className="p-4 space-y-2">
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
            onClick={() => { onConnectClick?.(); onOpenChange(false) }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#48097b] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3f076c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#48097b]/30"
          >
            <Wallet className="w-4 h-4" aria-hidden="true" />
            Connect Wallet
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
