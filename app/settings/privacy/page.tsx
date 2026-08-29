"use client"

import React, { useState } from "react"
import { Shield, Sparkles, AlertCircle, Eye, EyeOff, User, BarChart3, Activity, Wallet } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useConsentStore } from "@/app/state/consent"

type SaveState = "idle" | "saving" | "saved" | "error"

export default function PrivacySettingsPage() {
  const [publicProfile, setPublicProfile] = useState(true)
  const [showActivity, setShowActivity] = useState(true)
  const [showLeaderboard, setShowLeaderboard] = useState(true)
  const [showBalance, setShowBalance] = useState(true)
  const analyticsConsent = useConsentStore((s) => s.analyticsConsent)
  const setAnalyticsConsent = useConsentStore((s) => s.setAnalyticsConsent)

  const [saveState, setSaveState] = useState<SaveState>("idle")

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSaveState("saving")
    setTimeout(() => {
      setSaveState("saved")
      setTimeout(() => setSaveState("idle"), 3000)
    }, 600)
  }

  const privacyToggles = [
    {
      id: "public-profile",
      icon: User,
      label: "Public profile",
      description: "Allow other users to view your profile page and prediction history.",
      checked: publicProfile,
      onChange: setPublicProfile,
    },
    {
      id: "show-activity",
      icon: Activity,
      label: "Show recent activity",
      description: "Display your recent bets and market participation on your profile.",
      checked: showActivity,
      onChange: setShowActivity,
    },
    {
      id: "show-leaderboard",
      icon: BarChart3,
      label: "Appear on leaderboards",
      description: "Include your username and stats in public leaderboard rankings.",
      checked: showLeaderboard,
      onChange: setShowLeaderboard,
    },
    {
      id: "show-balance",
      icon: Wallet,
      label: "Show wallet balance on profile",
      description: "Display your portfolio balance publicly. Turn off to keep amounts private.",
      checked: showBalance,
      onChange: setShowBalance,
    },
    {
      id: "allow-analytics",
      icon: Eye,
      label: "Allow usage analytics",
      description: "Help improve Predictify by sharing anonymised interaction data. No wallet data is included.",
      checked: analyticsConsent,
      onChange: setAnalyticsConsent,
    },
  ]

  return (
    <main
      className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6"
      aria-labelledby="privacy-settings-heading"
    >
      <div className="space-y-1">
        <h1
          id="privacy-settings-heading"
          className="text-3xl font-semibold tracking-tight"
        >
          Privacy
        </h1>
        <p className="text-muted-foreground text-sm">
          Control your public profile visibility and data sharing preferences.
        </p>
      </div>

      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {saveState === "saved" ? "Privacy settings saved successfully." : ""}
        {saveState === "error" ? "Failed to save. Please try again." : ""}
      </div>

      <form onSubmit={handleSave} noValidate>
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-6">
            <Card className="border-border/70">
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.2em]"
                  >
                    Profile visibility
                  </Badge>
                </div>
                <CardTitle>Public profile settings</CardTitle>
                <CardDescription>
                  Choose what information is visible to other users on the platform.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                {privacyToggles.map((toggle) => (
                  <PrivacySwitchRow
                    key={toggle.id}
                    id={toggle.id}
                    icon={toggle.icon}
                    label={toggle.label}
                    description={toggle.description}
                    checked={toggle.checked}
                    onCheckedChange={toggle.onChange}
                  />
                ))}
              </CardContent>
            </Card>

            {saveState === "saved" && (
              <Alert className="border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                <AlertDescription>Privacy settings saved successfully.</AlertDescription>
              </Alert>
            )}
            {saveState === "error" && (
              <Alert className="border-destructive/50 bg-destructive/10 text-destructive">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <AlertDescription>
                  Something went wrong. Please try again.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-6">
            <Card className="border-border/70">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-lg">Privacy summary</CardTitle>
                </div>
                <CardDescription>
                  Quick overview of your current visibility choices.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {privacyToggles.map((toggle) => {
                  const Icon = toggle.icon
                  return (
                    <div
                      key={toggle.id}
                      className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        <span className="text-sm">{toggle.label}</span>
                      </div>
                      <Badge variant={toggle.checked ? "secondary" : "outline"}>
                        {toggle.checked ? "Visible" : "Hidden"}
                      </Badge>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-muted/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  Privacy guidance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Keep profile visibility off if you prefer not to share your prediction activity
                  publicly. Wallet balances are hidden by default for your security.
                </p>
                <p>
                  Analytics data is anonymised and never linked to your wallet or identity.
                  You can opt out at any time.
                </p>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPublicProfile(true)
                  setShowActivity(true)
                  setShowLeaderboard(true)
                  setShowBalance(true)
                  setAnalyticsConsent(false)
                }}
              >
                Reset defaults
              </Button>
              <Button type="submit" disabled={saveState === "saving"}>
                {saveState === "saving" ? "Saving\u2026" : "Save privacy settings"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </main>
  )
}

function PrivacySwitchRow({
  id,
  icon: Icon,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string
  icon: React.ElementType
  label: string
  description: string
  checked: boolean
  onCheckedChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl py-3">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
        <div className="space-y-1">
          <Label htmlFor={id} className="text-sm font-medium">
            {label}
          </Label>
          <p id={`${id}-description`} className="text-muted-foreground text-xs leading-relaxed">
            {description}
          </p>
        </div>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-describedby={`${id}-description`}
      />
    </div>
  )
}