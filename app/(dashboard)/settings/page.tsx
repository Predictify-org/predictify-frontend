"use client"

import { type SyntheticEvent, useMemo, useState } from "react"
import {
  Bell,
  Eye,
  LayoutGrid,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"

type DensityMode = "comfortable" | "compact"
type TimeFormat = "local-12h" | "local-24h" | "utc"
type CurrencyDisplay = "usd" | "usdc" | "both"
type NotificationIntensity = "important" | "balanced" | "everything"

const densityOptions: Array<{
  value: DensityMode
  label: string
  description: string
}> = [
  {
    value: "comfortable",
    label: "Comfortable",
    description: "Recommended for most users. Adds more breathing room around cards, tables, and forms.",
  },
  {
    value: "compact",
    label: "Compact",
    description: "Fits more information on screen for power users monitoring many markets at once.",
  },
]

const displayOptions: Array<{
  label: string
  value: TimeFormat | CurrencyDisplay
  description: string
}> = [
  {
    label: "Local time (12-hour)",
    value: "local-12h",
    description: "Shows times in your local timezone with AM/PM formatting.",
  },
  {
    label: "Local time (24-hour)",
    value: "local-24h",
    description: "Uses your local timezone with 24-hour formatting.",
  },
  {
    label: "UTC",
    value: "utc",
    description: "Best for teams comparing oracle and settlement times across regions.",
  },
  {
    label: "USD",
    value: "usd",
    description: "Displays estimated fiat values only.",
  },
  {
    label: "USDC",
    value: "usdc",
    description: "Keeps balances aligned to on-platform stablecoin amounts.",
  },
  {
    label: "USD + USDC",
    value: "both",
    description: "Shows both reference fiat and settlement token values.",
  },
]

const notificationPresets: Array<{
  value: NotificationIntensity
  label: string
  description: string
}> = [
  {
    value: "important",
    label: "Important only",
    description: "Safe default. Sends only high-signal account, settlement, and dispute alerts.",
  },
  {
    value: "balanced",
    label: "Balanced",
    description: "Adds market reminders and activity summaries without becoming noisy.",
  },
  {
    value: "everything",
    label: "Everything",
    description: "For power users who want every market, wallet, and resolution update.",
  },
]

export default function SettingsPage() {
  const [saveState, setSaveState] = useState<"idle" | "saved">("idle")
  const [density, setDensity] = useState<DensityMode>("comfortable")
  const [timeFormat, setTimeFormat] = useState<TimeFormat>("local-24h")
  const [currencyDisplay, setCurrencyDisplay] = useState<CurrencyDisplay>("both")
  const [notificationPreset, setNotificationPreset] = useState<NotificationIntensity>("important")
  const [reduceMotion, setReduceMotion] = useState(false)
  const [showNetPayouts, setShowNetPayouts] = useState(true)
  const [showWalletBadge, setShowWalletBadge] = useState(true)
  const [disputeAlerts, setDisputeAlerts] = useState(true)
  const [oracleDelayAlerts, setOracleDelayAlerts] = useState(true)
  const [priceMovementAlerts, setPriceMovementAlerts] = useState(false)
  const [weeklyDigest, setWeeklyDigest] = useState(true)
  const [publicActivity, setPublicActivity] = useState(false)
  const [walletAlias, setWalletAlias] = useState(true)
  const [copyWarning, setCopyWarning] = useState(true)

  const selectedDensity = useMemo(
    () => densityOptions.find((option) => option.value === density),
    [density]
  )
  const selectedPreset = useMemo(
    () => notificationPresets.find((option) => option.value === notificationPreset),
    [notificationPreset]
  )

  const handleSave = (event: SyntheticEvent) => {
    event.preventDefault()
    setSaveState("saved")

    window.setTimeout(() => {
      setSaveState("idle")
    }, 2500)
  }

  return (
    <form className="mx-auto flex w-full max-w-6xl flex-col gap-6" onSubmit={handleSave}>
      <section className="grid gap-4 lg:grid-cols-[1.5fr_0.85fr]">
        <Card className="border-border/70 bg-gradient-to-br from-background via-background to-muted/40">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.2em]">
                User Settings
              </Badge>
              <Badge variant="outline" className="rounded-full">
                Safe defaults enabled
              </Badge>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-semibold tracking-tight">Preferences and privacy</CardTitle>
              <CardDescription className="max-w-2xl text-sm leading-relaxed">
                Keep the essentials visible in one place. Formatting, notification controls, and wallet privacy guidance
                are grouped by task so nothing important gets buried behind multiple clicks.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>

        <Card className="border-border/70">
          <CardHeader className="space-y-3">
            <CardTitle className="text-lg">Current defaults</CardTitle>
            <CardDescription>Recommended starting points for a new wallet-based account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <PreferencePill label="Density" value={selectedDensity?.label ?? "Comfortable"} />
            <PreferencePill
              label="Notifications"
              value={selectedPreset?.label ?? "Important only"}
            />
            <PreferencePill
              label="Privacy"
              value={publicActivity ? "Public activity on" : "Public activity off"}
            />
          </CardContent>
        </Card>
      </section>

      {saveState === "saved" ? (
        <Alert className="border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
          <Sparkles className="h-4 w-4" />
          <AlertDescription>Your settings were saved. Safe defaults remain enabled for wallet privacy.</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <div className="space-y-6">
          <Card className="border-border/70">
            <CardHeader className="space-y-2">
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-xl">Display preferences</CardTitle>
              </div>
              <CardDescription>
                Controls that shape how dense, animated, and payout-focused the product feels day to day.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Density mode</Label>
                <div className="grid gap-3 md:grid-cols-2">
                  {densityOptions.map((option) => {
                    const active = density === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setDensity(option.value)}
                        className={`rounded-2xl border p-4 text-left transition-colors ${
                          active
                            ? "border-foreground/30 bg-muted/70 shadow-sm"
                            : "border-border/70 hover:border-foreground/20 hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium">{option.label}</p>
                          {active ? <Badge variant="secondary">Selected</Badge> : null}
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{option.description}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <PreferenceSelect
                  id="time-format"
                  label="Time formatting"
                  description="Important for comparing event deadlines with oracle and settlement timestamps."
                  value={timeFormat}
                  onValueChange={(value) => setTimeFormat(value as TimeFormat)}
                  options={displayOptions.filter((option) =>
                    option.value === "local-12h" || option.value === "local-24h" || option.value === "utc"
                  )}
                />

                <PreferenceSelect
                  id="currency-display"
                  label="Value display"
                  description="Choose whether balances emphasize fiat reference values, settlement token values, or both."
                  value={currencyDisplay}
                  onValueChange={(value) => setCurrencyDisplay(value as CurrencyDisplay)}
                  options={displayOptions.filter((option) =>
                    option.value === "usd" || option.value === "usdc" || option.value === "both"
                  )}
                />
              </div>

              <Separator />

              <div className="space-y-1">
                <PreferenceSwitch
                  id="show-net-payouts"
                  label="Show net payout estimates by default"
                  description="Keeps fees visible before confirmation so expected settlement is easier to understand."
                  checked={showNetPayouts}
                  onCheckedChange={setShowNetPayouts}
                />
                <PreferenceSwitch
                  id="reduce-motion"
                  label="Reduce motion in dashboards"
                  description="Turns down decorative animation for calmer scanning and lower visual fatigue."
                  checked={reduceMotion}
                  onCheckedChange={setReduceMotion}
                />
                <PreferenceSwitch
                  id="show-wallet-badge"
                  label="Show wallet network badge"
                  description="Displays the connected network beside your account so cross-network actions are easier to spot."
                  checked={showWalletBadge}
                  onCheckedChange={setShowWalletBadge}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader className="space-y-2">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-xl">Notifications</CardTitle>
              </div>
              <CardDescription>
                Keep alerts high-signal by default, then opt into noisier market tracking only if you want it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Notification intensity</Label>
                <div className="grid gap-3 md:grid-cols-3">
                  {notificationPresets.map((preset) => {
                    const active = notificationPreset === preset.value
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setNotificationPreset(preset.value)}
                        className={`rounded-2xl border p-4 text-left transition-colors ${
                          active
                            ? "border-foreground/30 bg-muted/70 shadow-sm"
                            : "border-border/70 hover:border-foreground/20 hover:bg-muted/40"
                        }`}
                      >
                        <p className="font-medium">{preset.label}</p>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{preset.description}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              <Separator />

              <div className="space-y-1">
                <PreferenceSwitch
                  id="dispute-alerts"
                  label="Dispute and review alerts"
                  description="Receive updates when a market you follow enters dispute, voting, or final execution."
                  checked={disputeAlerts}
                  onCheckedChange={setDisputeAlerts}
                />
                <PreferenceSwitch
                  id="oracle-delay-alerts"
                  label="Oracle delay notifications"
                  description="Get notified when markets remain in resolving longer than expected after their close time."
                  checked={oracleDelayAlerts}
                  onCheckedChange={setOracleDelayAlerts}
                />
                <PreferenceSwitch
                  id="price-alerts"
                  label="Price movement nudges"
                  description="Optional. Sends updates when watched markets swing quickly or implied odds move significantly."
                  checked={priceMovementAlerts}
                  onCheckedChange={setPriceMovementAlerts}
                />
                <PreferenceSwitch
                  id="weekly-digest"
                  label="Weekly account digest"
                  description="A lightweight summary of payouts, activity, and markets that still need attention."
                  checked={weeklyDigest}
                  onCheckedChange={setWeeklyDigest}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border/70">
            <CardHeader className="space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-xl">Wallet privacy</CardTitle>
              </div>
              <CardDescription>
                Wallet addresses are portable identities. These defaults help users avoid oversharing while keeping trust cues intact.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <Alert className="border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200">
                <Wallet className="h-4 w-4" />
                <AlertDescription>
                  Safe default: activity sharing is off until you explicitly choose to make it visible.
                </AlertDescription>
              </Alert>

              <div className="space-y-1">
                <PreferenceSwitch
                  id="public-activity"
                  label="Show public activity on profile"
                  description="Off by default so recent trades, votes, and claim actions are not exposed automatically."
                  checked={publicActivity}
                  onCheckedChange={setPublicActivity}
                />
                <PreferenceSwitch
                  id="wallet-alias"
                  label="Use wallet alias instead of full address"
                  description="Shows a human-friendly label first, while keeping the full address available when needed."
                  checked={walletAlias}
                  onCheckedChange={setWalletAlias}
                />
                <PreferenceSwitch
                  id="copy-warning"
                  label="Warn before copying full wallet address"
                  description="Adds a brief reminder that full addresses can link activity across apps and communities."
                  checked={copyWarning}
                  onCheckedChange={setCopyWarning}
                />
              </div>

              <div className="rounded-2xl border border-dashed border-border/80 bg-muted/40 p-4">
                <p className="text-sm font-medium">Privacy guidance</p>
                <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
                  <li>Use a separate wallet if public market participation should stay distinct from your main identity.</li>
                  <li>Keep profile activity off unless you want disputes, payouts, and voting behavior to be discoverable.</li>
                  <li>Prefer aliases in shared screenshots so addresses are not accidentally exposed outside the product.</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader className="space-y-2">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-xl">Preview</CardTitle>
              </div>
              <CardDescription>Quick readout of how your interface will feel with the current choices.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Market card density</p>
                    <p className="text-xs text-muted-foreground">{selectedDensity?.description}</p>
                  </div>
                  <Badge variant="secondary">{selectedDensity?.label}</Badge>
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Notification profile</p>
                    <p className="text-xs text-muted-foreground">{selectedPreset?.description}</p>
                  </div>
                  <Badge variant="secondary">{selectedPreset?.label}</Badge>
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-muted/30 p-4 text-sm">
                <p className="font-medium">Display examples</p>
                <div className="mt-3 space-y-2 text-muted-foreground">
                  <p>Settlement time: {timeFormat === "utc" ? "18:30 UTC" : timeFormat === "local-12h" ? "7:30 PM" : "19:30"}</p>
                  <p>Estimated payout: {currencyDisplay === "usd" ? "$124.80" : currencyDisplay === "usdc" ? "124.80 USDC" : "$124.80 / 124.80 USDC"}</p>
                  <p>Wallet label: {walletAlias ? "predictor-zion.eth" : "GCFY...9LQ2"}</p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full sm:w-auto">
                Save settings
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </form>
  )
}

function PreferenceSwitch({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string
  label: string
  description: string
  checked: boolean
  onCheckedChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl py-3">
      <div className="space-y-1">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

function PreferenceSelect({
  id,
  label,
  description,
  value,
  onValueChange,
  options,
}: {
  id: string
  label: string
  description: string
  value: string
  onValueChange: (value: string) => void
  options: Array<{ label: string; value: string; description: string }>
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={`Choose ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  )
}

function PreferencePill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted/30 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
