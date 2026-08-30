"use client"

import { useState, useRef, type ReactNode, type PointerEvent as ReactPointerEvent } from "react"
import { cn } from "@/lib/utils"
import { Check, X, MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

const SWIPE_THRESHOLD = 64

interface SwipeableRowProps {
  children: ReactNode
  onSwipeLeft: () => void
  onSwipeRight: () => void
  ariaLabel?: string
  className?: string
}

function rubberBandOffset(offset: number, threshold: number): number {
  if (Math.abs(offset) <= threshold) return offset
  const sign = offset > 0 ? 1 : -1
  const excess = Math.abs(offset) - threshold
  return sign * (threshold + excess * 0.4)
}

export default function SwipeableRow({
  children,
  onSwipeLeft,
  onSwipeRight,
  ariaLabel = "Notification item",
  className,
}: SwipeableRowProps) {
  const [translateX, setTranslateX] = useState(0)
  const [committing, setCommitting] = useState(false)
  const startX = useRef(0)
  const startY = useRef(0)
  const isDragging = useRef(false)
  const committed = useRef(false)
  const rowRef = useRef<HTMLDivElement>(null)

  function resetPosition(animate = true) {
    setCommitting(animate)
    if (animate) {
      setTranslateX(0)
    }
    committed.current = false
    isDragging.current = false
  }

  function commitAction(direction: "left" | "right") {
    if (committed.current) return
    committed.current = true
    setCommitting(true)
    const targetX = direction === "left" ? -SWIPE_THRESHOLD * 1.5 : SWIPE_THRESHOLD * 1.5
    setTranslateX(targetX)
    setTimeout(() => {
      if (direction === "left") {
        onSwipeLeft()
      } else {
        onSwipeRight()
      }
      resetPosition(false)
    }, 250)
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (committed.current) return
    startX.current = e.clientX
    startY.current = e.clientY
    isDragging.current = false
    setCommitting(false)

    const el = rowRef.current
    if (!el) return
    el.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!isDragging.current) {
      const dx = e.clientX - startX.current
      const dy = e.clientY - startY.current
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
      if (Math.abs(dy) > Math.abs(dx)) return
      isDragging.current = true
    }

    if (committed.current) return
    const rawDelta = e.clientX - startX.current
    const banded = rubberBandOffset(rawDelta, SWIPE_THRESHOLD)
    setTranslateX(banded)
  }

  function handlePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (!isDragging.current || committed.current) {
      resetPosition()
      return
    }
    isDragging.current = false
    const finalDelta = e.clientX - startX.current
    if (Math.abs(finalDelta) >= SWIPE_THRESHOLD) {
      commitAction(finalDelta > 0 ? "right" : "left")
    } else {
      resetPosition()
    }
  }

  return (
    <div
      ref={rowRef}
      className={cn("relative overflow-hidden touch-pan-y", className)}
      aria-label={ariaLabel}
      role="listitem"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ touchAction: "pan-y" }}
    >
      <div
        className="absolute inset-y-0 left-0 flex items-center justify-start pl-4 pr-8 bg-green-500/90 text-white"
        style={{
          width: Math.max(0, translateX),
          opacity: Math.min(1, Math.max(0, translateX / SWIPE_THRESHOLD)),
          transition: committing ? "opacity 0.2s ease" : "none",
        }}
        aria-hidden="true"
      >
        <Check className="w-5 h-5" />
        <span className="ml-2 text-sm font-medium whitespace-nowrap">Mark read</span>
      </div>

      <div
        className="absolute inset-y-0 right-0 flex items-center justify-end pr-4 pl-8 bg-red-500/90 text-white"
        style={{
          width: Math.max(0, -translateX),
          right: 0,
          opacity: Math.min(1, Math.max(0, -translateX / SWIPE_THRESHOLD)),
          transition: committing ? "opacity 0.2s ease" : "none",
        }}
        aria-hidden="true"
      >
        <span className="mr-2 text-sm font-medium whitespace-nowrap">Dismiss</span>
        <X className="w-5 h-5" />
      </div>

      <div
        className={cn(
          "relative bg-white z-10",
          committing && "transition-transform duration-200 ease-out"
        )}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: committing ? "transform 0.2s ease-out" : "none",
        }}
      >
        <div className="relative">
          {children}

          <div className="absolute top-2 right-2 z-20">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full hover:bg-slate-100"
                  aria-label="Notification actions"
                >
                  <MoreHorizontal className="w-4 h-4 text-slate-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[140px]">
                <DropdownMenuItem
                  onClick={onSwipeRight}
                  className="cursor-pointer gap-2"
                >
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Mark as read</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onSwipeLeft}
                  className="cursor-pointer gap-2 text-red-600 focus:text-red-600"
                >
                  <X className="w-4 h-4" />
                  <span>Dismiss</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  )
}
