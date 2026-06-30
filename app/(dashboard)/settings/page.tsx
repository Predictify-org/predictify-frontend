"use client"

import { type SyntheticEvent, useMemo, useState, useEffect } from "react"
import Link from "next/link"
import {
  Bell,
  Eye,
  LayoutGrid,
  ShieldCheck,
  Sparkles,
  User,
  Wallet,
  Table2,
  LayoutList,
  Pin,
  ArrowUp,
  ArrowDown,
  Accessibility,
} from "lucide-react"
import { getPinnedActions, savePinnedActions, ALL_AVAILABLE_ACTIONS } from "@/lib/command-palette/pins"
import { DEFAULT_QUIET_HOURS, useQuietHours, type QuietHoursSettings } from "@/lib/quiet-hours"


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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useDensity, densityTokens, type Density, type DensityTokens } from "@/hooks/useDensity"
import { useSoundEnabled } from "@/hooks/useSoundEnabled"
import { usePrivacy } from '@/context/PrivacyContext';
import { useAccessibility } from "@/context/AccessibilityContext";
import { cn } from "@/lib/utils"

type TimeFormat = "local-12h" | "local-24h" | "utc"
type CurrencyDisplay = "usd" | "usdc" | "both"
type NotificationIntensity = "important" | "balanced" | "everything"

const timeFormatOptions: Array<{
  value: TimeFormat
  label: string
  description: string
}> = [
  { value: "local-12h", label: "Local time (12-hour)", description: "Shows times in your local timezone with AM/PM formatting." },
  { value: "local-24h", label: "Local time (24-hour)", description: "Uses your local timezone with 24-hour formatting." },
  { value: "utc", label: "UTC", description: "Best for teams comparing oracle and settlement times across regions." },
]

const currencyOptions: Array<{
  value: CurrencyDisplay
  label: string
  description: string
}> = [
  { value: "usd", label: "USD", description: "Displays estimated fiat values only." },
  { value: "usdc", label: "USDC", description: "Keeps balances aligned to on-platform stablecoin amounts." },
  { value: "both", label: "USD + USDC", description: "Shows both reference fiat and settlement token values." },
]

const notificationPresets: Array<{
  value: NotificationIntensity
  label: string
  description: string
}> = [
  { value: "important", label: "Important only", description: "Safe default. Sends only high-signal account, settlement, and dispute alerts." },
  { value: "balanced", label: "Balanced", description: "Adds market reminders and activity summaries without becoming noisy." },
  { value: "everything", label: "Everything", description: "For power users who want every market, wallet, and resolution update." },
]

// ───────────────────────────────────────────────────────────
// Density Options (3 variants: cozy, compact, ultra)
// ───────────────────────────────────────────────────────────

const densityOptions: Array<{
  value: Density
  label: string
  description: string
  icon: React.ElementType
  tokens: DensityTokens[keyof DensityTokens]
}> = [
  {
    value: "cozy",
    label: "Cozy",
    description: "Recommended for most users. Full details, comfortable spacing, larger thumbnails.",
    icon: LayoutGrid,
    tokens: densityTokens.cozy,
  },
  {
    value: "compact",
    label: "Compact",
    description: "Fits more markets on screen. Smaller thumbnails, reduced padding, dates still visible.",
    icon: LayoutList,
    tokens: densityTokens.compact,
  },
  {
    value: "ultra",
    label: "Ultra",
    description: "Maximum density for power users. Minimal padding, smallest text, dates hidden.",
    icon: Table2,
    tokens: densityTokens.ultra,
  },
]

export default function SettingsPage() {
  const [saveState, setSaveState] = useState<"idle" | "saved">("idle")
  
  // Density from global hook
  const { density, setDensity, tokens: densityTokensCurrent } = useDensity()

  // Accessibility preferences — persisted globally via AccessibilityContext
  const {
    reduceMotion, setReduceMotion,
    disableParallax, setDisableParallax,
    disableAutoplay, setDisableAutoplay,
    increaseContrast, setIncreaseContrast,
  } = useAccessibility()
  
  const [timeFormat, setTimeFormat] = useState<TimeFormat>("local-24h")
  const [currencyDisplay, setCurrencyDisplay] = useState<CurrencyDisplay>("both")
  const [notificationPreset, setNotificationPreset] = useState<NotificationIntensity>("important")
  const [showNetPayouts, setShowNetPayouts] = useState(true)
  const [showWalletBadge, setShowWalletBadge] = useState(true)
  const [disputeAlerts, setDisputeAlerts] = useState(true)
  const [oracleDelayAlerts, setOracleDelayAlerts] = useState(true)
  const [priceMovementAlerts, setPriceMovementAlerts] = useState(false)
  const [weeklyDigest, setWeeklyDigest] = useState(true)
  const { hideBalances, setHideBalances } = usePrivacy();
  const { settings: storedQuietHours, active: quietHoursActive, saveSettings: saveQuietHoursSettings } = useQuietHours()
  const [quietHours, setQuietHours] = useState<QuietHoursSettings>(DEFAULT_QUIET_HOURS)
  const [quietHoursDirty, setQuietHoursDirty] = useState(false)
  const [walletAlias, setWalletAlias] = useState(true)
  const [copyWarning, setCopyWarning] = useState(true)
  const { soundEnabled, setSoundEnabled } = useSoundEnabled()

  useEffect(() => {
    if (!quietHoursDirty) {
      setQuietHours(storedQuietHours)
    }
  }, [quietHoursDirty, storedQuietHours])

  // Declare missing publicActivity state to resolve compilation reference error
  const [publicActivity, setPublicActivity] = useState(false)

  // Command palette pinned action configuration state
  const [pinnedActionIds, setPinnedActionIds] = useState<string[]>([])

  // Load pinned actions on mount
  useEffect(() => {
    setPinnedActionIds(getPinnedActions().map((p) => p.id))
  }, [])

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
    // Persist pinned actions configure
    savePinnedActions(pinnedActionIds)
    saveQuietHoursSettings(quietHours)
    setQuietHoursDirty(false)
    setSaveState("saved")
    window.setTimeout(() => setSaveState("idle"), 2500)
  }


  return (
    <form className="mx-auto flex w-full max-w-6xl flex-col gap-6" onSubmit={handleSave}>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {saveState === "saved" ? "Settings saved" : ""}
      </div>
      <div aria-live="polite" aria-atomic="true" className="sr-only" key={String(soundEnabled)}>
        {soundEnabled ? "Sound effects on" : "Sound effects off"}
      </div>

      <Tabs defaultValue="preferences" className="w-full">
        <TabsList className="mb-4 flex gap-2">
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="accessibility">Accessibility</TabsTrigger>
          {/* Account tab links to the dedicated Settings → Account page */}
          <TabsTrigger value="account" asChild>
            <Link href="/settings/account" className="flex items-center gap-1">
              <User className="h-4 w-4" aria-hidden="true" />
              Account
            </Link>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preferences">
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
                <PreferencePill label="Density" value={selectedDensity?.label ?? "Cozy"} />
                <PreferencePill label="Notifications" value={selectedPreset?.label ?? "Important only"} />
                <PreferencePill label="Privacy" value={publicActivity ? "Public activity on" : "Public activity off"} />
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
                  {/* ── DENSITY MODE (3 variants: cozy, compact, ultra) ── */}
                  <div className="space-y-3">
                    <Label>Density mode</Label>
                    <div className="grid gap-3 md:grid-cols-3">
                      {densityOptions.map((option) => {
                        const active = density === option.value
                        const Icon = option.icon
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setDensity(option.value)}
                            className={cn(
                              "rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                              active
                                ? "border-foreground/30 bg-muted/70 shadow-sm"
                                : "border-border/70 hover:border-foreground/20 hover:bg-muted/40"
                            )}
                            aria-pressed={active}
                            aria-label={`${option.label} density: ${option.description}`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4 text-muted-foreground" />
                                <p className="font-medium">{option.label}</p>
                              </div>
                              {active ? <Badge variant="secondary">Selected</Badge> : null}
                            </div>
                            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{option.description}</p>
                            
                            {/* Token preview for this density */}
                            <div className="mt-3 flex flex-wrap gap-2">
                              <code className="text-[10px] bg-background rounded px-1.5 py-0.5 border">
                                {option.tokens.cardPadding}
                              </code>
                              <code className="text-[10px] bg-background rounded px-1.5 py-0.5 border">
                                {option.tokens.titleSize}
                              </code>
                              <code className="text-[10px] bg-background rounded px-1.5 py-0.5 border">
                                {option.tokens.thumbnailHeight}
                              </code>
                            </div>
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
                      options={timeFormatOptions}
                    />

                    <PreferenceSelect
                      id="currency-display"
                      label="Value display"
                      description="Choose whether balances emphasize fiat reference values, settlement token values, or both."
                      value={currencyDisplay}
                      onValueChange={(value) => setCurrencyDisplay(value as CurrencyDisplay)}
                      options={currencyOptions}
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
                      id="sound-effects"
                      label="Sound effects"
                      description="Play subtle sounds when predictions are placed or winnings are claimed. Off by default."
                      checked={soundEnabled}
                      onCheckedChange={setSoundEnabled}
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
                    <Pin className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-xl">Command Palette Shortcuts</CardTitle>
                  </div>
                  <CardDescription>
                    Configure and reorder the pinned actions displayed when opening the Command Palette (Cmd/Ctrl+K).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Active Pinned Actions</Label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Select which actions to pin, and use the arrows to define their display order.
                    </p>
                    
                    <div className="space-y-2">
                      {ALL_AVAILABLE_ACTIONS.map((action) => {
                        const isPinned = pinnedActionIds.includes(action.id)
                        const pinIndex = pinnedActionIds.indexOf(action.id)

                        const handleToggle = (checked: boolean) => {
                          if (checked) {
                            setPinnedActionIds((prev) => [...prev, action.id])
                          } else {
                            setPinnedActionIds((prev) => prev.filter((id) => id !== action.id))
                          }
                        }

                        const handleMoveUp = () => {
                          if (pinIndex <= 0) return
                          const updated = [...pinnedActionIds]
                          const temp = updated[pinIndex]
                          updated[pinIndex] = updated[pinIndex - 1]
                          updated[pinIndex - 1] = temp
                          setPinnedActionIds(updated)
                        }

                        const handleMoveDown = () => {
                          if (pinIndex < 0 || pinIndex >= pinnedActionIds.length - 1) return
                          const updated = [...pinnedActionIds]
                          const temp = updated[pinIndex]
                          updated[pinIndex] = updated[pinIndex + 1]
                          updated[pinIndex + 1] = temp
                          setPinnedActionIds(updated)
                        }

                        return (
                          <div
                            key={action.id}
                            className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-muted/20 p-3 hover:bg-muted/30 transition duration-150"
                          >
                            <div className="flex items-center gap-3">
                              <Switch
                                id={`pin-${action.id}`}
                                checked={isPinned}
                                onCheckedChange={handleToggle}
                              />
                              <Label htmlFor={`pin-${action.id}`} className="text-sm font-medium cursor-pointer">
                                {action.label}
                                <span className="block text-xs font-normal text-muted-foreground">
                                  Navigates to {action.url}
                                </span>
                              </Label>
                            </div>
                            
                            {isPinned && (
                              <div className="flex items-center gap-1.5">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  disabled={pinIndex === 0}
                                  onClick={handleMoveUp}
                                  aria-label={`Move ${action.label} up`}
                                >
                                  <ArrowUp className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  disabled={pinIndex === pinnedActionIds.length - 1}
                                  onClick={handleMoveDown}
                                  aria-label={`Move ${action.label} down`}
                                >
                                  <ArrowDown className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
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
                  <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">Quiet hours</Label>
                        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                          Suppresses non-critical toasts and pauses ambient motion between these local times. Wallet errors, claim failures, disputes, and actionable warnings still appear.
                        </p>
                      </div>
                      <Badge variant={quietHoursActive ? "secondary" : "outline"}>
                        {quietHoursActive ? "Active now" : "Inactive now"}
                      </Badge>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_1.1fr]">
                      <QuietHoursTimeField
                        id="quiet-hours-start"
                        label="Start"
                        value={quietHours.start}
                        onChange={(start) => {
                          setQuietHoursDirty(true)
                          setQuietHours((current) => ({ ...current, start }))
                        }}
                      />
                      <QuietHoursTimeField
                        id="quiet-hours-end"
                        label="End"
                        value={quietHours.end}
                        onChange={(end) => {
                          setQuietHoursDirty(true)
                          setQuietHours((current) => ({ ...current, end }))
                        }}
                      />
                      <div className="space-y-2">
                        <Label htmlFor="quiet-hours-timezone">Timezone</Label>
                        <Select
                          value={quietHours.tz}
                          onValueChange={(tz) => {
                            setQuietHoursDirty(true)
                            setQuietHours((current) => ({ ...current, tz }))
                          }}
                        >
                          <SelectTrigger id="quiet-hours-timezone">
                            <SelectValue placeholder="Choose timezone" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">Auto from device</SelectItem>
                            <SelectItem value="UTC">UTC</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          Stored as {`{ start: "${quietHours.start}", end: "${quietHours.end}", tz: "${quietHours.tz}" }`}.
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

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
                            className={cn(
                              "rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                              active
                                ? "border-foreground/30 bg-muted/70 shadow-sm"
                                : "border-border/70 hover:border-foreground/20 hover:bg-muted/40"
                            )}
                            aria-pressed={active}
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

                  {/* Density token preview */}
                  <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                    <p className="text-sm font-medium mb-2">Active density tokens</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Padding</span>
                        <code className="bg-background rounded px-1.5 py-0.5 border">{densityTokensCurrent.cardPadding}</code>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Title</span>
                        <code className="bg-background rounded px-1.5 py-0.5 border">{densityTokensCurrent.titleSize}</code>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Thumbnail</span>
                        <code className="bg-background rounded px-1.5 py-0.5 border">{densityTokensCurrent.thumbnailHeight}</code>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Progress</span>
                        <code className="bg-background rounded px-1.5 py-0.5 border">{densityTokensCurrent.progressHeight}</code>
                      </div>
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
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>Notification settings</CardTitle>
              <CardDescription>Manage your notification preferences.</CardDescription>
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
                  id="hide-balances"
                  label="Hide sensitive amounts"
                  description="Mask balances and amounts throughout the app for privacy."
                  checked={hideBalances}
                  onCheckedChange={setHideBalances}
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
        </TabsContent>

        <TabsContent value="privacy">
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>Privacy settings</CardTitle>
              <CardDescription>Manage your privacy and data sharing preferences.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Privacy settings are managed in the Preferences tab.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Accessibility tab ──────────────────────────────────────────────
            Four per-user toggles persisted in localStorage via
            AccessibilityContext. All four override the OS-level preference
            when explicitly set by the user.                                  */}
        <TabsContent value="accessibility">
          <div className="grid gap-6 lg:grid-cols-[1.5fr_0.85fr]">
            <Card className="border-border/70">
              <CardHeader className="space-y-2">
                <div className="flex items-center gap-2">
                  <Accessibility className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-xl">Accessibility controls</CardTitle>
                </div>
                <CardDescription>
                  Per-user preferences stored in your browser. They override OS-level settings when
                  explicitly toggled and reset to OS defaults when cleared.
                  The <code className="text-xs bg-muted rounded px-1 py-0.5">Reduce motion</code> toggle
                  defaults to your OS <code className="text-xs bg-muted rounded px-1 py-0.5">prefers-reduced-motion</code> value
                  when no stored preference exists.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                <PreferenceSwitch
                  id="a11y-reduce-motion"
                  label="Reduce motion"
                  description="Stops all decorative animations app-wide. Overrides OS reduced-motion. Affects animated backgrounds, entrance transitions, live-pulse indicators, and carousel motion."
                  checked={reduceMotion}
                  onCheckedChange={setReduceMotion}
                />
                <PreferenceSwitch
                  id="a11y-disable-parallax"
                  label="Disable parallax effects"
                  description="Removes scroll-linked depth and translate effects from hero and banner sections. Useful for users who find parallax disorienting independently of general animation."
                  checked={disableParallax}
                  onCheckedChange={setDisableParallax}
                />
                <PreferenceSwitch
                  id="a11y-disable-autoplay"
                  label="Disable auto-playing carousels"
                  description="Prevents carousels from advancing automatically. Slides only move when you interact with Previous / Next. Manual navigation is never affected."
                  checked={disableAutoplay}
                  onCheckedChange={setDisableAutoplay}
                />
                <PreferenceSwitch
                  id="a11y-increase-contrast"
                  label="Increase contrast"
                  description="Swaps foreground, muted text, and border tokens for higher-contrast values targeting WCAG AAA (7:1) where feasible. Works in both light and dark mode."
                  checked={increaseContrast}
                  onCheckedChange={setIncreaseContrast}
                />
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full sm:w-auto">
                  Save settings
                </Button>
              </CardFooter>
            </Card>

            {/* Live status card */}
            <Card className="border-border/70 h-fit">
              <CardHeader className="space-y-2">
                <CardTitle className="text-lg">Active overrides</CardTitle>
                <CardDescription>Live readout of your current accessibility state.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <PreferencePill label="Reduce motion" value={reduceMotion ? "On" : "Off (OS default)"} />
                <PreferencePill label="Parallax" value={disableParallax ? "Disabled" : "Enabled"} />
                <PreferencePill label="Carousels" value={disableAutoplay ? "Manual only" : "Auto-advance"} />
                <PreferencePill label="Contrast" value={increaseContrast ? "High contrast" : "Default"} />
                <div className="rounded-2xl border border-dashed border-border/80 bg-muted/40 p-4 mt-2">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Stored locally in your browser under{" "}
                    <code className="bg-background rounded px-1">predictify-a11y</code>.
                    Clearing site data resets everything to OS defaults.
                    See <code className="bg-background rounded px-1">docs/ACCESSIBILITY.md</code> for
                    the full token mapping.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
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

function QuietHoursTimeField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <input
        id={id}
        type="time"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
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
