/**
 * Persists the user's most recent in-progress prediction so the dashboard
 * can offer a "Resume" card on return.
 */

export type InProgressStep = "review" | "sign" | "submit"

export interface InProgressPrediction {
  id: string
  marketId: string
  marketTitle: string
  href: string
  outcomeLabel?: string
  stakeAmount?: string
  step: InProgressStep
  savedAt: number
}

const STORAGE_KEY = "predictify.in_progress_prediction"
const DISMISS_KEY = "predictify.in_progress_dismissed_id"

function isBrowser(): boolean {
  return typeof window !== "undefined"
}

function parsePrediction(raw: string | null): InProgressPrediction | null {
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as InProgressPrediction
    if (
      typeof parsed.id === "string" &&
      typeof parsed.marketId === "string" &&
      typeof parsed.marketTitle === "string" &&
      typeof parsed.href === "string" &&
      typeof parsed.step === "string" &&
      typeof parsed.savedAt === "number"
    ) {
      return parsed
    }
  } catch {
    return null
  }

  return null
}

export function getInProgressPrediction(): InProgressPrediction | null {
  if (!isBrowser()) return null

  try {
    return parsePrediction(localStorage.getItem(STORAGE_KEY))
  } catch {
    return null
  }
}

export function saveInProgressPrediction(prediction: InProgressPrediction): void {
  if (!isBrowser()) return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prediction))
    localStorage.removeItem(DISMISS_KEY)
  } catch {
    // storage unavailable
  }
}

export function clearInProgressPrediction(): void {
  if (!isBrowser()) return

  try {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(DISMISS_KEY)
  } catch {
    // storage unavailable
  }
}

export function dismissInProgressPrediction(predictionId: string): void {
  if (!isBrowser()) return

  try {
    localStorage.setItem(DISMISS_KEY, predictionId)
  } catch {
    // storage unavailable
  }
}

export function isInProgressDismissed(predictionId: string): boolean {
  if (!isBrowser()) return false

  try {
    return localStorage.getItem(DISMISS_KEY) === predictionId
  } catch {
    return false
  }
}

export function getVisibleInProgressPrediction(): InProgressPrediction | null {
  const prediction = getInProgressPrediction()
  if (!prediction) return null
  if (isInProgressDismissed(prediction.id)) return null
  return prediction
}
