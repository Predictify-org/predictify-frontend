"use client"

import * as React from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Share2, Link, Check, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ShareSheetProps {
  title: string
  text: string
  url: string
  trigger?: React.ReactNode
  className?: string
}

const SOCIAL_PLATFORMS = [
  { id: "x", name: "X", icon: ExternalLink, color: "text-[#1DA1F2]", href: (text: string, url: string) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${text}\n${url}`)}` },
  { id: "farcaster", name: "Farcaster", icon: ExternalLink, color: "text-[#855DCD]", href: (text: string, url: string) => `https://warpcast.com/~/compose?text=${encodeURIComponent(`${text}\n${url}`)}` },
  { id: "bluesky", name: "Bluesky", icon: ExternalLink, color: "text-[#0085FF]", href: (text: string, url: string) => `https://bsky.app/intent/compose?text=${encodeURIComponent(`${text}\n${url}`)}` },
]

export function ShareSheet({ title, text, url, trigger, className }: ShareSheetProps) {
  const [open, setOpen] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  const copyTimeoutRef = React.useRef<ReturnType<typeof setTimeout>>()

  React.useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
    }
  }, [])

  const handleNativeShare = React.useCallback(async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url })
        setOpen(false)
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Share error:", err)
        }
      }
    }
  }, [title, text, url])

  const handleCopyLink = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      const textarea = document.createElement("textarea")
      textarea.value = url
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
      setCopied(true)
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000)
    }
  }, [url])

  const hasNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function"

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button variant="outline" className={cn("gap-2", className)} aria-label="Share">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="bottom" className="sm:max-w-xl mx-auto rounded-t-[32px] border-t-primary/20 bg-card/95 backdrop-blur-xl p-6 pb-12 shadow-2xl overflow-y-auto max-h-[90vh]">
        <SheetHeader className="space-y-1 mb-6">
          <SheetTitle className="text-2xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Share2 className="w-5 h-5" />
            </div>
            Share
          </SheetTitle>
          <SheetDescription className="text-base">
            Share this prediction market with others.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border/50 bg-muted/30 p-4 space-y-2">
            <p className="text-sm font-medium text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground truncate">{url}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {hasNativeShare && (
              <Button
                variant="outline"
                className="rounded-xl border-border/50 bg-background/50 hover:bg-background/80 gap-2"
                onClick={handleNativeShare}
              >
                <Share2 className="h-4 w-4 shrink-0" />
                <span className="text-sm">Share</span>
              </Button>
            )}

            <Button
              variant="outline"
              className="rounded-xl border-border/50 bg-background/50 hover:bg-background/80 gap-2"
              onClick={handleCopyLink}
            >
              {copied ? <Check className="h-4 w-4 shrink-0 text-green-500" /> : <Link className="h-4 w-4 shrink-0" />}
              <span className="text-sm">{copied ? "Copied" : "Copy Link"}</span>
            </Button>

            {SOCIAL_PLATFORMS.map((platform) => {
              const Icon = platform.icon
              return (
                <Button
                  key={platform.id}
                  variant="outline"
                  className="rounded-xl border-border/50 bg-background/50 hover:bg-background/80 gap-2"
                  onClick={() => {
                    window.open(platform.href(text, url), "_blank", "noopener,noreferrer")
                  }}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", platform.color)} />
                  <span className="text-sm">{platform.name}</span>
                </Button>
              )
            })}
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Share via your preferred platform or copy the direct link.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
