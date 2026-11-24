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
import { useTranslation } from "@/app/i18n"

type SaveState = "idle" | "saving" | "saved" | "error"

export default function PrivacySettingsPage() {
  const { t } = useTranslation()
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
      label: t("settings.account.public_profile"),
      description: t("settings.account.public_profile_description"),
      checked: publicProfile,
      onChange: setPublicProfile,
    },
    {
      id: "show-activity",
      icon: Activity,
      label: t("settings.account.show_activity"),
      description: t("settings.account.show_activity_description"),
      checked: showActivity,
      onChange: setShowActivity,
    },
    {
      id: "show-leaderboard",
      icon: BarChart3,
      label: t("settings.account.show_leaderboard"),
      description: t("settings.account.show_leaderboard_description"),
      checked: showLeaderboard,
      onChange: setShowLeaderboard,
    },
    {
      id: "show-balance",
      icon: Wallet,
      label: t("settings.privacy.show_balance"),
      description: t("settings.privacy.show_balance_description"),
      checked: showBalance,
      onChange: setShowBalance,
    },
    {
      id: "allow-analytics",
      icon: Eye,
      label: t("settings.account.allow_analytics"),
      description: t("settings.account.allow_analytics_description"),
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
          {t("settings.privacy.heading")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("settings.privacy.description")}
        </p>
      </div>

      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {saveState === "saved" ? t("settings.privacy.saved") : ""}
        {saveState === "error" ? t("settings.account.save_failed") : ""}
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
                    {t("settings.privacy.profile_visibility")}
                  </Badge>
                </div>
                <CardTitle>{t("settings.privacy.public_profile_settings")}</CardTitle>
                <CardDescription>
                  {t("settings.privacy.public_profile_description")}
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
                <AlertDescription>{t("settings.privacy.saved")}</AlertDescription>
              </Alert>
            )}
            {saveState === "error" && (
              <Alert className="border-destructive/50 bg-destructive/10 text-destructive">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <AlertDescription>
                  {t("settings.account.error")}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-6">
            <Card className="border-border/70">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-lg">{t("settings.privacy.summary")}</CardTitle>
                </div>
                <CardDescription>
                  {t("settings.privacy.summary_description")}
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
                        {toggle.checked ? t("settings.privacy.visible") : t("settings.privacy.hidden")}
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
                  {t("settings.privacy.guidance")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>
                  {t("settings.privacy.guidance_profile")}
                </p>
                <p>
                  {t("settings.privacy.guidance_analytics")}
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
                {t("settings.privacy.reset")}
              </Button>
              <Button type="submit" disabled={saveState === "saving"}>
                {saveState === "saving" ? t("settings.privacy.saving") : t("settings.privacy.save")}
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