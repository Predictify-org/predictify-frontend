"use client"

import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ProfileShareCard } from "@/components/profile/ProfileShareCard"
import { getPredictionHistory } from "@/lib/prediction-history"
import {
  computeTrackRecord,
  isValidStellarAddress,
  type PredictionRecord,
} from "@/lib/track-record"

interface PublicProfileProps {
  addr: string
}

export function PublicProfile({ addr }: PublicProfileProps) {
  const validAddress = isValidStellarAddress(addr)
  const [records, setRecords] = useState<PredictionRecord[]>([])
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading")

  useEffect(() => {
    if (!validAddress) return

    const controller = new AbortController()
    setStatus("loading")
    getPredictionHistory(addr, controller.signal)
      .then((history) => {
        setRecords(history)
        setStatus("loaded")
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return
        console.error("Failed to load prediction history", error)
        setStatus("error")
      })

    return () => controller.abort()
  }, [addr, validAddress])

  const trackRecord = useMemo(() => computeTrackRecord(records), [records])
  const displayAddress = `${addr.trim().slice(0, 6)}...${addr.trim().slice(-4)}`
  const shareProfile = {
    displayName: displayAddress,
    handle: addr.trim(),
    avatarUrl: "",
    winRate: trackRecord.accuracy,
    totalPredictions: trackRecord.total,
    topCategory: trackRecord.byCategory[0]?.category ?? "—",
    publicProfileUrl:
      typeof window === "undefined"
        ? `/profile/${addr}`
        : window.location.href,
  }

  if (!validAddress) {
    return (
      <main className="mx-auto max-w-5xl p-4">
        <Card role="alert">
          <CardHeader>
            <CardTitle>Invalid Stellar address</CardTitle>
            <CardDescription>
              Enter a valid Stellar public address to view this profile.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    )
  }

  if (status === "loading") {
    return (
      <main
        aria-label="Loading profile"
        aria-busy="true"
        className="mx-auto max-w-5xl space-y-6 p-4"
        role="status"
      >
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-48" />
      </main>
    )
  }

  if (status === "error") {
    return (
      <main className="mx-auto max-w-5xl p-4">
        <Card role="alert">
          <CardHeader>
            <CardTitle>Unable to load prediction history</CardTitle>
            <CardDescription>
              Please try again later.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    )
  }

  if (trackRecord.total === 0) {
    return (
      <main className="mx-auto max-w-5xl space-y-6 p-4">
        <ProfileHeader address={displayAddress} profile={shareProfile} />
        <Card>
          <CardHeader>
            <CardTitle>No predictions yet</CardTitle>
            <CardDescription>
              This profile has no resolved predictions to show.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4">
      <ProfileHeader address={displayAddress} profile={shareProfile} />

      <section aria-label="Track record statistics">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Predictions" value={trackRecord.total} />
          <StatCard label="Wins" value={trackRecord.wins} />
          <StatCard
            label="Accuracy"
            value={`${Math.round(trackRecord.accuracy * 100)}%`}
          />
          <StatCard label="Current win streak" value={trackRecord.currentStreak} />
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Accuracy by category</CardTitle>
            <CardDescription>
              Resolved predictions grouped by category.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {trackRecord.byCategory.map((category) => (
              <div
                key={category.category}
                className="flex items-center justify-between gap-4 border-b pb-3 last:border-0 last:pb-0"
              >
                <span className="font-medium">{category.category}</span>
                <span className="text-sm text-muted-foreground">
                  {Math.round(category.accuracy * 100)}% · {category.wins}/
                  {category.total}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Streaks</CardTitle>
            <CardDescription>Consecutive wins across resolved predictions.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Current streak</p>
              <p className="text-2xl font-bold tabular-nums">
                {trackRecord.currentStreak}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Longest streak</p>
              <p className="text-2xl font-bold tabular-nums">
                {trackRecord.longestStreak}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Badges</CardTitle>
          <CardDescription>Milestones earned from your track record.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {trackRecord.badges.length > 0 ? (
            trackRecord.badges.map((badge) => (
              <Badge key={badge.id} title={badge.description}>
                {badge.name}
              </Badge>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No badges earned yet.</p>
          )}
        </CardContent>
      </Card>
    </main>
  )
}

function ProfileHeader({
  address,
  profile,
}: {
  address: string
  profile: {
    displayName: string
    handle: string
    avatarUrl: string
    winRate: number
    totalPredictions: number
    topCategory: string
    publicProfileUrl: string
  }
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Public track record</h1>
        <p className="text-sm text-muted-foreground">{address}</p>
      </div>
      <ProfileShareCard profile={profile} />
    </header>
  )
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
    </Card>
  )
}
