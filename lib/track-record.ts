export type PredictionStatus = "won" | "lost" | "open" | "void"

export interface PredictionRecord {
  id: string
  category: string
  status: PredictionStatus
  resolvedAt: string | null
}

export interface CategoryTrackRecord {
  category: string
  total: number
  wins: number
  accuracy: number
}

export interface TrackRecordBadge {
  id: string
  name: string
  description: string
}

export interface TrackRecord {
  total: number
  wins: number
  accuracy: number
  byCategory: CategoryTrackRecord[]
  currentStreak: number
  longestStreak: number
  badges: TrackRecordBadge[]
}

export function isValidStellarAddress(addr: string): boolean {
  return /^G[A-Z2-7]{55}$/.test(addr.trim().toUpperCase())
}

export function computeTrackRecord(records: PredictionRecord[]): TrackRecord {
  const resolved = records
    .filter(
      (record): record is PredictionRecord & { resolvedAt: string } =>
        (record.status === "won" || record.status === "lost") &&
        record.resolvedAt !== null,
    )
    .slice()
    .sort((a, b) => {
      const timeDifference =
        new Date(a.resolvedAt).getTime() - new Date(b.resolvedAt).getTime()
      return timeDifference || a.id.localeCompare(b.id)
    })

  const wins = resolved.filter((record) => record.status === "won").length
  const accuracy = resolved.length === 0 ? 0 : wins / resolved.length
  const categories = new Map<string, { total: number; wins: number }>()

  let longestStreak = 0
  let streak = 0
  for (const record of resolved) {
    const category = categories.get(record.category) ?? { total: 0, wins: 0 }
    category.total += 1
    if (record.status === "won") {
      category.wins += 1
      streak += 1
    } else {
      streak = 0
    }
    categories.set(record.category, category)
    longestStreak = Math.max(longestStreak, streak)
  }

  let currentStreak = 0
  for (let index = resolved.length - 1; index >= 0; index -= 1) {
    if (resolved[index].status !== "won") break
    currentStreak += 1
  }

  const byCategory = Array.from(categories, ([category, result]) => ({
    category,
    total: result.total,
    wins: result.wins,
    accuracy: result.wins / result.total,
  })).sort(
    (a, b) => b.total - a.total || a.category.localeCompare(b.category),
  )

  const badges: TrackRecordBadge[] = []
  if (resolved.length >= 10) {
    badges.push({
      id: "ten-predictions",
      name: "Veteran Predictor",
      description: "Resolved 10 or more predictions",
    })
  }
  if (longestStreak >= 5) {
    badges.push({
      id: "five-win-streak",
      name: "Hot Streak",
      description: "Won 5 or more predictions in a row",
    })
  }
  if (resolved.length >= 20 && accuracy >= 0.7) {
    badges.push({
      id: "seventy-percent-accuracy",
      name: "Sharp Shooter",
      description: "At least 70% accuracy over 20 or more predictions",
    })
  }

  return {
    total: resolved.length,
    wins,
    accuracy,
    byCategory,
    currentStreak,
    longestStreak,
    badges,
  }
}
