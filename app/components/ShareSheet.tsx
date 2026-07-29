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
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Share2,
  Link,
  Check,
  ExternalLink,
  Mail,
  MessageSquare,
  Copy,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export interface ShareSheetProps {
  title: string
  text: string
  url: string
  trigger?: React.ReactNode
  className?: string
  /** Optional QR code generator function */
  generateQrCode?: (url: string) => Promise<string> | string
}

interface SharePlatform {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  href: (text: string, url: string) => string
  ariaLabel?: string
}

const SOCIAL_PLATFORMS: SharePlatform[] = [
  {
    id: "x",
    name: "X",
    icon: ExternalLink,
    color: "text-[#1DA1F2]",
    href: (text: string, url: string) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${text}\n${url}`)}`,
    ariaLabel: "Share on X (Twitter)",
  },
  {
    id: "farcaster",
    name: "Farcaster",
    icon: ExternalLink,
    color: "text-[#855DCD]",
    href: (text: string, url: string) =>
      `https://warpcast.com/~/compose?text=${encodeURIComponent(`${text}\n${url}`)}`,
    ariaLabel: "Share on Farcaster",
  },
  {
    id: "bluesky",
    name: "Bluesky",
    icon: ExternalLink,
    color: "text-[#0085FF]",
    href: (text: string, url: string) =>
      `https://bsky.app/intent/compose?text=${encodeURIComponent(`${text}\n${url}`)}`,
    ariaLabel: "Share on Bluesky",
  },
  {
    id: "email",
    name: "Email",
    icon: Mail,
    color: "text-muted-foreground",
    href: (text: string, url: string) =>
      `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(`${text}\n\n${url}`)}`,
    ariaLabel: "Share via Email",
  },
  {
    id: "sms",
    name: "SMS",
    icon: MessageSquare,
    color: "text-muted-foreground",
    href: (text: string, url: string) =>
      `sms:?body=${encodeURIComponent(`${text}\n${url}`)}`,
    ariaLabel: "Share via SMS",
  },
]

export function ShareSheet({
  title,
  text,
  url,
  trigger,
  className,
  generateQrCode,
}: ShareSheetProps) {
  const [open, setOpen] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const [qrCode, setQrCode] = React.useState<string | null>(null)
  const [isLoadingQr, setIsLoadingQr] = React.useState(false)
  const [shareError, setShareError] = React.useState<string | null>(null)
  const { toast } = useToast()

  const copyTimeoutRef = React.useRef<ReturnType<typeof setTimeout>>()

  React.useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
    }
  }, [])

  // Load QR code when sheet opens (desktop fallback)
  React.useEffect(() => {
    if (open && !hasNativeShare && generateQrCode && !qrCode && !isLoadingQr) {
      setIsLoadingQr(true)
      Promise.resolve(generateQrCode(url))
        .then((data) => {
          setQrCode(data)
          setIsLoadingQr(false)
        })
        .catch(() => {
          setIsLoadingQr(false)
        })
    }
  }, [open, generateQrCode, url, qrCode, isLoadingQr])

  const handleNativeShare = React.useCallback(async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        setShareError(null)
        await navigator.share({ title, text, url })
        setOpen(false)
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          const errorMessage = (err as Error).message || "Failed to share"
          setShareError(errorMessage)
          toast({
            title: "Share failed",
            description: errorMessage,
            variant: "destructive",
          })
          console.error("Share error:", err)
        }
      }
    }
  }, [title, text, url, toast])

  const handleCopyLink = React.useCallback(async () => {
    try {
      setShareError(null)
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast({
        title: "Link copied!",
        description: "The link has been copied to your clipboard.",
        duration: 2000,
      })
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      try {
        const textarea = document.createElement("textarea")
        textarea.value = url
        textarea.style.position = "fixed"
        textarea.style.opacity = "0"
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand("copy")
        document.body.removeChild(textarea)
        setCopied(true)
        toast({
          title: "Link copied!",
          description: "The link has been copied to your clipboard.",
          duration: 2000,
        })
        copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000)
      } catch (fallbackErr) {
        setShareError("Unable to copy link")
        toast({
          title: "Copy failed",
          description: "Unable to copy link. Please try again.",
          variant: "destructive",
        })
      }
    }
  }, [url, toast])

  const handlePlatformShare = React.useCallback(
    (platform: SharePlatform) => {
      try {
        setShareError(null)
        window.open(platform.href(text, url), "_blank", "noopener,noreferrer")
      } catch {
        setShareError(`Failed to open ${platform.name}`)
        toast({
          title: "Share failed",
          description: `Unable to open ${platform.name}. Please try again.`,
          variant: "destructive",
        })
      }
    },
    [text, url, toast]
  )

  const hasNativeShare =
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof window !== "undefined"

  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button
            variant="outline"
            className={cn("gap-2 transition-all duration-200 hover:scale-105", className)}
            aria-label="Share"
          >
            <Share2 className="h-4 w-4" />
            <span>Share</span>
          </Button>
        )}
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className={cn(
          "sm:max-w-xl mx-auto rounded-t-[32px] border-t-primary/20 bg-card/95 backdrop-blur-xl",
          "p-6 pb-12 shadow-2xl overflow-y-auto max-h-[90vh]",
          "animate-in slide-in-from-bottom duration-300"
        )}
      >
        <SheetHeader className="space-y-2 mb-6">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-2xl font-bold flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Share2 className="w-5 h-5" />
              </div>
              Share
            </SheetTitle>
            <Badge variant="secondary" className="text-xs">
              {hasNativeShare ? "Native" : "Web"}
            </Badge>
          </div>
          <SheetDescription className="text-base">
            Share this prediction market with your community.
          </SheetDescription>
        </SheetHeader>

        {shareError && (
          <div
            className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            role="alert"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{shareError}</span>
          </div>
        )}

        <div className="space-y-6">
          {/* Preview Card */}
          <div
            className="rounded-2xl border border-border/50 bg-muted/30 p-4 space-y-2 transition-all hover:border-border"
            role="presentation"
          >
            <p className="text-sm font-medium text-foreground line-clamp-2">{title}</p>
            <p className="text-xs text-muted-foreground truncate select-all" title={url}>
              {url}
            </p>
          </div>

          {/* QR Code (Desktop fallback) */}
          {isDesktop && !hasNativeShare && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-border/50 bg-background/50 p-4">
              <p className="text-sm font-medium text-muted-foreground">Scan to open on mobile</p>
              {isLoadingQr ? (
                <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-border/30 bg-muted/20">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : qrCode ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrCode}
                  alt="QR code for this market"
                  className="h-24 w-24 rounded-lg"
                  width={96}
                  height={96}
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-border/30 bg-muted/20 text-muted-foreground">
                  <Link className="h-8 w-8" />
                </div>
              )}
            </div>
          )}

          <Separator className="opacity-50" />

          {/* Share Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {hasNativeShare && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="default"
                      className="rounded-xl gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={handleNativeShare}
                    >
                      <Share2 className="h-4 w-4 shrink-0" />
                      <span className="text-sm">Share</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Use your device's native share</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className="rounded-xl border-border/50 bg-background/50 hover:bg-background/80 gap-2 transition-all hover:border-primary/50"
                    onClick={handleCopyLink}
                  >
                    {copied ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4 shrink-0" />
                    )}
                    <span className="text-sm">{copied ? "Copied!" : "Copy Link"}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{copied ? "Link copied successfully" : "Copy link to clipboard"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {SOCIAL_PLATFORMS.map((platform) => {
              const Icon = platform.icon
              return (
                <TooltipProvider key={platform.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        className="rounded-xl border-border/50 bg-background/50 hover:bg-background/80 gap-2 transition-all hover:border-primary/50"
                        onClick={() => handlePlatformShare(platform)}
                        aria-label={platform.ariaLabel || `Share on ${platform.name}`}
                      >
                        <Icon className={cn("h-4 w-4 shrink-0", platform.color)} />
                        <span className="text-sm">{platform.name}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Share on {platform.name}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
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
