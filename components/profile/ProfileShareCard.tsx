"use client"

import { useCallback, useEffect, useRef, useState, createContext, useContext } from "react"
import { useTheme } from "next-themes"
import { toPng } from "html-to-image"
import QRCode from "qrcode"
import { Download, Share2, Loader2, Image } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface ProfileData {
  displayName: string
  handle: string
  avatarUrl: string
  winRate: number
  totalPredictions: number
  topCategory: string
  publicProfileUrl: string
}

interface ProfileShareCardProps {
  profile: ProfileData
  trigger?: React.ReactNode
}

type CardSize = "social" | "square"

const CARD_DIMENSIONS: Record<CardSize, { width: number; height: number }> = {
  social: { width: 1200, height: 630 },
  square: { width: 1080, height: 1080 },
}

function formatHandle(address: string): string {
  if (address.length <= 10) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

const IsDarkCtx = createContext(false)

export function ProfileShareCard({ profile, trigger }: ProfileShareCardProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  const [size, setSize] = useState<CardSize>("social")
  const [qrDataUrl, setQrDataUrl] = useState<string>("")
  const [exporting, setExporting] = useState<CardSize | null>(null)
  const [open, setOpen] = useState(false)

  const previewRef = useRef<HTMLDivElement>(null)
  const exportRef = useRef<HTMLDivElement>(null)
  const qrGenerated = useRef(false)

  const dims = CARD_DIMENSIONS[size]

  useEffect(() => {
    if (open && !qrGenerated.current) {
      QRCode.toDataURL(profile.publicProfileUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: isDark ? "#e2e8f0" : "#0f172a",
          light: "transparent",
        },
      })
        .then(setQrDataUrl)
        .catch(() => {
          QRCode.toDataURL(profile.publicProfileUrl, { width: 200, margin: 2 })
            .then(setQrDataUrl)
            .catch(() => {})
        })
      qrGenerated.current = true
    }
  }, [open, profile.publicProfileUrl, isDark])

  useEffect(() => {
    if (!open) {
      qrGenerated.current = false
      setQrDataUrl("")
    }
  }, [open])

  const handleExport = useCallback(
    async (targetSize: CardSize) => {
      setExporting(targetSize)
      setSize(targetSize)

      await new Promise((resolve) => setTimeout(resolve, 150))

      const target = exportRef.current || previewRef.current
      if (!target) {
        setExporting(null)
        return
      }

      try {
        const dataUrl = await toPng(target, {
          width: CARD_DIMENSIONS[targetSize].width,
          height: CARD_DIMENSIONS[targetSize].height,
          pixelRatio: 2,
          cacheBust: true,
        })

        const link = document.createElement("a")
        link.download = `predictify-profile-${targetSize}.png`
        link.href = dataUrl
        link.click()
      } catch (err) {
        console.error("Failed to export card image:", err)
      } finally {
        setExporting(null)
      }
    },
    [],
  )

  const winRateDisplay = `${(profile.winRate * 100).toFixed(0)}%`
  const avatarInitial = profile.displayName?.charAt(0)?.toUpperCase() || "?"

  return (
    <IsDarkCtx.Provider value={isDark}>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button className="gap-2">
              <Share2 className="h-4 w-4" />
              Share my profile
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Share your Predictify profile</DialogTitle>
            <DialogDescription>
              Choose a layout and download a PNG image to share on X, Telegram, or
              anywhere.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button
                variant={size === "social" ? "default" : "outline"}
                size="sm"
                onClick={() => setSize("social")}
                className="gap-2"
              >
              <Image className="h-4 w-4" />
              1200 × 630
              </Button>
              <Button
                variant={size === "square" ? "default" : "outline"}
                size="sm"
                onClick={() => setSize("square")}
                className="gap-2"
              >
              <Image className="h-4 w-4" />
              1080 × 1080
              </Button>
            </div>

            <div
              ref={previewRef}
              className="flex items-start justify-center overflow-hidden rounded-xl border bg-card"
              style={{ minHeight: 280, maxHeight: 420 }}
            >
              <div
                className={cn(
                  "relative shrink-0",
                  isDark ? "text-white" : "text-slate-900",
                )}
                style={{
                  width: dims.width,
                  height: dims.height,
                  transformOrigin: "top left",
                  transform: `scale(${Math.min(1, 600 / dims.width)})`,
                }}
              >
                <CardContent
                  qrDataUrl={qrDataUrl}
                  winRateDisplay={winRateDisplay}
                  avatarInitial={avatarInitial}
                  size={size}
                  dims={dims}
                  profile={profile}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Downloads as PNG · {dims.width} × {dims.height}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport("social")}
                  disabled={exporting !== null}
                  className="gap-2"
                >
                  {exporting === "social" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  1200×630
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport("square")}
                  disabled={exporting !== null}
                  className="gap-2"
                >
                  {exporting === "square" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  1080×1080
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div
        ref={exportRef}
        className="fixed left-[-9999px] top-0"
        style={{ width: dims.width, height: dims.height }}
      >
        <div
          className={cn(isDark ? "text-white" : "text-slate-900")}
          style={{ width: dims.width, height: dims.height }}
        >
          <CardContent
            qrDataUrl={qrDataUrl}
            winRateDisplay={winRateDisplay}
            avatarInitial={avatarInitial}
            size={size}
            dims={dims}
            profile={profile}
          />
        </div>
      </div>
    </IsDarkCtx.Provider>
  )
}

function CardContent({
  qrDataUrl,
  winRateDisplay,
  avatarInitial,
  size,
  dims,
  profile,
}: {
  qrDataUrl: string
  winRateDisplay: string
  avatarInitial: string
  size: CardSize
  dims: { width: number; height: number }
  profile: ProfileData
}) {
  const isDark = useContext(IsDarkCtx)

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        isDark ? "text-white" : "text-slate-900",
      )}
      style={{ width: dims.width, height: dims.height }}
    >
      <div
        className={cn(
          "absolute inset-0",
          isDark
            ? "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950"
            : "bg-gradient-to-br from-white via-slate-50 to-slate-100",
        )}
      />

      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(6, 182, 212, 0.4) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(16, 185, 129, 0.4) 0%, transparent 50%)
          `,
        }}
      />

      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-2 bg-gradient-to-r",
          "from-cyan-500 via-emerald-500 to-cyan-400",
        )}
      />

      <div className="relative z-10 flex h-full flex-col p-8">
        {size === "social" ? (
          <SocialLayout
            profile={profile}
            qrDataUrl={qrDataUrl}
            winRateDisplay={winRateDisplay}
            avatarInitial={avatarInitial}
          />
        ) : (
          <SquareLayout
            profile={profile}
            qrDataUrl={qrDataUrl}
            winRateDisplay={winRateDisplay}
            avatarInitial={avatarInitial}
          />
        )}
      </div>
    </div>
  )
}

function SocialLayout({
  profile,
  qrDataUrl,
  winRateDisplay,
  avatarInitial,
}: {
  profile: ProfileData
  qrDataUrl: string
  winRateDisplay: string
  avatarInitial: string
}) {
  const isDark = useContext(IsDarkCtx)

  return (
    <div className="flex h-full flex-row items-center gap-10">
      <div className="flex flex-1 flex-col justify-center gap-5">
        <div className="flex items-center gap-5">
          <div
            className={cn(
              "flex h-20 w-20 items-center justify-center rounded-full text-3xl font-bold ring-4",
              isDark
                ? "bg-cyan-500/20 text-cyan-300 ring-cyan-500/30"
                : "bg-cyan-500/10 text-cyan-600 ring-cyan-500/20",
            )}
          >
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt=""
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              avatarInitial
            )}
          </div>
          <div>
            <h2 className="text-3xl font-bold">{profile.displayName}</h2>
            <p
              className={cn(
                "text-lg",
                isDark ? "text-slate-400" : "text-slate-500",
              )}
            >
              @{formatHandle(profile.handle)}
            </p>
          </div>
        </div>

        <div className="flex gap-6">
          <StatBox label="Win Rate" value={winRateDisplay} />
          <StatBox label="Predictions" value={String(profile.totalPredictions)} />
          <StatBox label="Top Category" value={profile.topCategory} />
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        {qrDataUrl && (
          <img
            src={qrDataUrl}
            alt="Profile QR Code"
            className="rounded-lg"
            style={{ width: 120, height: 120 }}
          />
        )}
        <span
          className={cn(
            "text-xs font-medium tracking-wider uppercase",
            isDark ? "text-slate-500" : "text-slate-400",
          )}
        >
          Predictify
        </span>
      </div>
    </div>
  )
}

function SquareLayout({
  profile,
  qrDataUrl,
  winRateDisplay,
  avatarInitial,
}: {
  profile: ProfileData
  qrDataUrl: string
  winRateDisplay: string
  avatarInitial: string
}) {
  const isDark = useContext(IsDarkCtx)

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 text-center">
      <div
        className={cn(
          "flex h-28 w-28 items-center justify-center rounded-full text-5xl font-bold ring-4",
          isDark
            ? "bg-cyan-500/20 text-cyan-300 ring-cyan-500/30"
            : "bg-cyan-500/10 text-cyan-600 ring-cyan-500/20",
        )}
      >
        {profile.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt=""
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          avatarInitial
        )}
      </div>

      <div>
        <h2 className="text-4xl font-bold">{profile.displayName}</h2>
        <p
          className={cn(
            "text-xl",
            isDark ? "text-slate-400" : "text-slate-500",
          )}
        >
          @{formatHandle(profile.handle)}
        </p>
      </div>

      <div className="flex gap-8">
        <StatBox label="Win Rate" value={winRateDisplay} center />
        <StatBox label="Predictions" value={String(profile.totalPredictions)} center />
        <StatBox label="Top Category" value={profile.topCategory} center />
      </div>

      <div className="flex flex-col items-center gap-2">
        {qrDataUrl && (
          <img
            src={qrDataUrl}
            alt="Profile QR Code"
            className="rounded-lg"
            style={{ width: 100, height: 100 }}
          />
        )}
        <span
          className={cn(
            "text-xs font-semibold tracking-widest uppercase",
            isDark ? "text-slate-500" : "text-slate-400",
          )}
        >
          Predictify
        </span>
      </div>
    </div>
  )
}

function StatBox({
  label,
  value,
  center = false,
}: {
  label: string
  value: string
  center?: boolean
}) {
  const isDark = useContext(IsDarkCtx)

  return (
    <div className={cn("flex flex-col", center && "items-center")}>
      <span
        className={cn(
          "text-xs font-semibold uppercase tracking-wider",
          isDark ? "text-slate-500" : "text-slate-400",
        )}
      >
        {label}
      </span>
      <span
        className="text-2xl font-bold"
        style={{
          background: "linear-gradient(135deg, #06b6d4, #10b981)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        {value}
      </span>
    </div>
  )
}
