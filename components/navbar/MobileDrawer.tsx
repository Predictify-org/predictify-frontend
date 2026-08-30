"use client"

import { useState, useCallback } from "react"
import { Wallet, Bell } from "lucide-react"
import Link from "next/link"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { X } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import SwipeableRow from "@/components/ui/swipeable-row"

type NavLink = { label: string; href: string }

interface Notification {
  id: string
  title: string
  body: string
  read: boolean
}

interface MobileDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  links: NavLink[]
  onConnectClick?: () => void
  transparent?: boolean
}

const DEFAULT_NOTIFICATIONS: Notification[] = [
  { id: "n1", title: "Prediction settled", body: "Your prediction on BTC/USD was correct. +50 USDC credited.", read: false },
  { id: "n2", title: "New event live", body: "ETH options trading is now available.", read: false },
  { id: "n3", title: "Reward claimed", body: "You claimed 25 PRED tokens from the airdrop.", read: true },
]

export default function MobileDrawer({ open, onOpenChange, links, onConnectClick }: MobileDrawerProps) {
  const [notifications, setNotifications] = useState<Notification[]>(DEFAULT_NOTIFICATIONS)

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

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

        {notifications.length > 0 && (
          <section aria-labelledby="notifications-heading" className="border-b border-black/10">
            <div className="flex items-center gap-2 px-4 pt-4 pb-2">
              <Bell className="w-4 h-4 text-slate-600" aria-hidden="true" />
              <h2 id="notifications-heading" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-2 text-orange-500 font-bold">({unreadCount} unread)</span>
                )}
              </h2>
            </div>
            <ScrollArea className="max-h-[40vh]" role="list" aria-label="Notification list">
              {notifications.map((n) => (
                <SwipeableRow
                  key={n.id}
                  onSwipeLeft={() => dismissNotification(n.id)}
                  onSwipeRight={() => markRead(n.id)}
                  ariaLabel={`${n.title}: ${n.body}`}
                  className="border-b border-black/5 last:border-b-0"
                >
                  <div className="px-4 py-3 pr-12">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${n.read ? "text-slate-500" : "text-slate-800 font-medium"}`}>
                          {n.title}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{n.body}</p>
                      </div>
                      {!n.read && (
                        <span className="w-2 h-2 mt-1.5 rounded-full bg-orange-500 shrink-0" aria-label="Unread" />
                      )}
                    </div>
                  </div>
                </SwipeableRow>
              ))}
            </ScrollArea>
          </section>
        )}

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
