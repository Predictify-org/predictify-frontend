"use client"

/**
 * Settings → Account page
 *
 * Provides profile editing and privacy controls with full WCAG 2.1 AA
 * accessibility support: labelled form controls, live-region feedback,
 * keyboard-navigable tab interface, and sufficient colour contrast.
 */

import React, { useState } from "react"
import { User, Shield, Sparkles, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useConsentStore } from "@/app/state/consent"
import { useTranslation } from "@/app/i18n"

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type SaveState = "idle" | "saving" | "saved" | "error"

// ─────────────────────────────────────────────────────────────
// AccountSettingsPage
// ─────────────────────────────────────────────────────────────

export default function AccountSettingsPage() {
  const { t } = useTranslation()
  // Profile state
  const [displayName, setDisplayName] = useState("")
  const [username, setUsername] = useState("")
  const [bio, setBio] = useState("")

  // Privacy controls
  const [publicProfile, setPublicProfile] = useState(true)
  const [showActivity, setShowActivity] = useState(true)
  const analyticsConsent = useConsentStore((s) => s.analyticsConsent)
  const setAnalyticsConsent = useConsentStore((s) => s.setAnalyticsConsent)
  const [showLeaderboard, setShowLeaderboard] = useState(true)

  // Save state for live-region announcement
  const [saveState, setSaveState] = useState<SaveState>("idle")

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSaveState("saving")

    // Simulate async save (replace with real API call)
    setTimeout(() => {
      setSaveState("saved")
      setTimeout(() => setSaveState("idle"), 3000)
    }, 800)
  }

  return (
    <main
      className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6"
      aria-labelledby="account-settings-heading"
    >
      {/* Page heading */}
      <div className="space-y-1">
        <h1
          id="account-settings-heading"
          className="text-3xl font-semibold tracking-tight"
        >
          {t("settings.account.heading")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("settings.account.description")}
        </p>
      </div>

      {/* Accessible live region – screen readers announce save outcome */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {saveState === "saved" ? t("settings.account.saved") : ""}
        {saveState === "error" ? t("settings.account.save_failed") : ""}
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="mb-4 flex gap-2" aria-label={t("settings.account.sections")}>
          <TabsTrigger value="profile">
            <User className="mr-2 h-4 w-4" aria-hidden="true" />
            {t("settings.account.profile_tab")}
          </TabsTrigger>
          <TabsTrigger value="privacy">
            <Shield className="mr-2 h-4 w-4" aria-hidden="true" />
            {t("settings.account.privacy_tab")}
          </TabsTrigger>
        </TabsList>

        {/* ── Profile tab ───────────────────────────────────── */}
        <TabsContent value="profile">
          <form onSubmit={handleSave} aria-label={t("settings.account.edit_profile")} noValidate>
            <Card className="border-border/70">
              <CardHeader>
                <CardTitle>{t("settings.account.profile_information")}</CardTitle>
                <CardDescription>
                  {t("settings.account.profile_information_description")}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Avatar row */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage
                      src="/placeholder.svg?height=64&width=64"
                      alt={t("settings.account.profile_photo_alt")}
                    />
                    <AvatarFallback aria-label={t("settings.account.profile_initials")}>
                      {displayName ? displayName.slice(0, 2).toUpperCase() : "ME"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{t("settings.account.profile_photo")}</p>
                    <p className="text-muted-foreground text-xs">
                      {t("settings.account.avatar_description")}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Display name */}
                <div className="space-y-2">
                  <Label htmlFor="display-name">{t("settings.account.display_name")}</Label>
                  <Input
                    id="display-name"
                    name="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={t("settings.account.display_name_placeholder")}
                    autoComplete="name"
                    aria-describedby="display-name-hint"
                  />
                  <p id="display-name-hint" className="text-muted-foreground text-xs">
                    {t("settings.account.display_name_hint")}
                  </p>
                </div>

                {/* Username */}
                <div className="space-y-2">
                  <Label htmlFor="username">{t("settings.account.username")}</Label>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-muted-foreground select-none text-sm"
                      aria-hidden="true"
                    >
                      @
                    </span>
                    <Input
                      id="username"
                      name="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder={t("settings.account.username_placeholder")}
                      autoComplete="username"
                      aria-describedby="username-hint"
                      className="flex-1"
                    />
                  </div>
                  <p id="username-hint" className="text-muted-foreground text-xs">
                    {t("settings.account.username_hint")}
                  </p>
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio">{t("settings.account.bio")}</Label>
                  <textarea
                    id="bio"
                    name="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder={t("settings.account.bio_placeholder")}
                    rows={3}
                    maxLength={200}
                    aria-describedby="bio-hint"
                    className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <p id="bio-hint" className="text-muted-foreground text-xs">
                    {t("settings.account.bio_hint")}{" "}
                    <span aria-live="polite" aria-atomic="true">
                      {t("settings.account.characters_used", { count: bio.length })}
                    </span>
                  </p>
                </div>

                {/* Save feedback */}
                {saveState === "saved" && (
                  <Alert className="border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    <AlertDescription>{t("settings.account.profile_saved")}</AlertDescription>
                  </Alert>
                )}
                {saveState === "error" && (
                  <Alert className="border-destructive/50 bg-destructive/10 text-destructive">
                    <AlertCircle className="h-4 w-4" aria-hidden="true" />
                    <AlertDescription>{t("settings.account.error")}</AlertDescription>
                  </Alert>
                )}
              </CardContent>

              <CardFooter className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDisplayName("")
                    setUsername("")
                    setBio("")
                  }}
                >
                  {t("settings.account.reset")}
                </Button>
                <Button type="submit" disabled={saveState === "saving"}>
                  {saveState === "saving" ? t("settings.account.saving") : t("settings.account.save_profile")}
                </Button>
              </CardFooter>
            </Card>
          </form>
        </TabsContent>

        {/* ── Privacy tab ───────────────────────────────────── */}
        <TabsContent value="privacy">
          <Card className="border-border/70">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="secondary"
                  className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.2em]"
                >
                  {t("settings.account.privacy_controls")}
                </Badge>
              </div>
              <CardTitle>{t("settings.account.privacy_data")}</CardTitle>
              <CardDescription>
                {t("settings.account.privacy_description")}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <PrivacySwitch
                id="public-profile"
                label={t("settings.account.public_profile")}
                description={t("settings.account.public_profile_description")}
                checked={publicProfile}
                onCheckedChange={setPublicProfile}
              />

              <Separator />

              <PrivacySwitch
                id="show-activity"
                label={t("settings.account.show_activity")}
                description={t("settings.account.show_activity_description")}
                checked={showActivity}
                onCheckedChange={setShowActivity}
              />

              <Separator />

              <PrivacySwitch
                id="show-leaderboard"
                label={t("settings.account.show_leaderboard")}
                description={t("settings.account.show_leaderboard_description")}
                checked={showLeaderboard}
                onCheckedChange={setShowLeaderboard}
              />

              <Separator />

              <PrivacySwitch
                id="allow-analytics"
                label={t("settings.account.allow_analytics")}
                description={t("settings.account.allow_analytics_description")}
                checked={analyticsConsent}
                onCheckedChange={setAnalyticsConsent}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  )
}

// ─────────────────────────────────────────────────────────────
// PrivacySwitch – accessible switch row
// ─────────────────────────────────────────────────────────────

function PrivacySwitch({
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
    <div className="flex items-start justify-between gap-4 rounded-2xl py-2">
      <div className="space-y-1">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        <p id={`${id}-description`} className="text-muted-foreground text-xs leading-relaxed">
          {description}
        </p>
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
