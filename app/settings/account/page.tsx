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

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type SaveState = "idle" | "saving" | "saved" | "error"

// ─────────────────────────────────────────────────────────────
// AccountSettingsPage
// ─────────────────────────────────────────────────────────────

export default function AccountSettingsPage() {
  // Profile state
  const [displayName, setDisplayName] = useState("")
  const [username, setUsername] = useState("")
  const [bio, setBio] = useState("")

  // Privacy controls
  const [publicProfile, setPublicProfile] = useState(true)
  const [showActivity, setShowActivity] = useState(true)
  const [allowAnalytics, setAllowAnalytics] = useState(false)
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
          Account settings
        </h1>
        <p className="text-muted-foreground text-sm">
          Manage your profile details and privacy preferences.
        </p>
      </div>

      {/* Accessible live region – screen readers announce save outcome */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {saveState === "saved" ? "Account settings saved successfully." : ""}
        {saveState === "error" ? "Failed to save. Please try again." : ""}
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="mb-4 flex gap-2" aria-label="Account settings sections">
          <TabsTrigger value="profile">
            <User className="mr-2 h-4 w-4" aria-hidden="true" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="privacy">
            <Shield className="mr-2 h-4 w-4" aria-hidden="true" />
            Privacy
          </TabsTrigger>
        </TabsList>

        {/* ── Profile tab ───────────────────────────────────── */}
        <TabsContent value="profile">
          <form onSubmit={handleSave} aria-label="Edit profile form" noValidate>
            <Card className="border-border/70">
              <CardHeader>
                <CardTitle>Profile information</CardTitle>
                <CardDescription>
                  Update how your name and bio appear to other users.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Avatar row */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage
                      src="/placeholder.svg?height=64&width=64"
                      alt="Your profile photo"
                    />
                    <AvatarFallback aria-label="Profile initials">
                      {displayName ? displayName.slice(0, 2).toUpperCase() : "ME"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Profile photo</p>
                    <p className="text-muted-foreground text-xs">
                      Avatar is derived from your connected wallet address.
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Display name */}
                <div className="space-y-2">
                  <Label htmlFor="display-name">Display name</Label>
                  <Input
                    id="display-name"
                    name="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Alice Predictor"
                    autoComplete="name"
                    aria-describedby="display-name-hint"
                  />
                  <p id="display-name-hint" className="text-muted-foreground text-xs">
                    Shown on leaderboards and market activity feeds.
                  </p>
                </div>

                {/* Username */}
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
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
                      placeholder="yourhandle"
                      autoComplete="username"
                      aria-describedby="username-hint"
                      className="flex-1"
                    />
                  </div>
                  <p id="username-hint" className="text-muted-foreground text-xs">
                    Unique handle used in shareable profile links.
                  </p>
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio">Short bio</Label>
                  <textarea
                    id="bio"
                    name="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell other predictors a bit about yourself…"
                    rows={3}
                    maxLength={200}
                    aria-describedby="bio-hint"
                    className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <p id="bio-hint" className="text-muted-foreground text-xs">
                    Max 200 characters.{" "}
                    <span aria-live="polite" aria-atomic="true">
                      {bio.length}/200 used.
                    </span>
                  </p>
                </div>

                {/* Save feedback */}
                {saveState === "saved" && (
                  <Alert className="border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    <AlertDescription>Profile saved successfully.</AlertDescription>
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
                  Reset
                </Button>
                <Button type="submit" disabled={saveState === "saving"}>
                  {saveState === "saving" ? "Saving…" : "Save profile"}
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
                  Privacy controls
                </Badge>
              </div>
              <CardTitle>Privacy &amp; data</CardTitle>
              <CardDescription>
                Control what others see and how your activity data is used.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <PrivacySwitch
                id="public-profile"
                label="Public profile"
                description="Allow other users to view your profile page and prediction history."
                checked={publicProfile}
                onCheckedChange={setPublicProfile}
              />

              <Separator />

              <PrivacySwitch
                id="show-activity"
                label="Show recent activity"
                description="Display your recent bets and market participation on your profile."
                checked={showActivity}
                onCheckedChange={setShowActivity}
              />

              <Separator />

              <PrivacySwitch
                id="show-leaderboard"
                label="Appear on leaderboards"
                description="Include your username and stats in public leaderboard rankings."
                checked={showLeaderboard}
                onCheckedChange={setShowLeaderboard}
              />

              <Separator />

              <PrivacySwitch
                id="allow-analytics"
                label="Allow usage analytics"
                description="Help improve Predictify by sharing anonymised interaction data. No wallet data is included."
                checked={allowAnalytics}
                onCheckedChange={setAllowAnalytics}
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
