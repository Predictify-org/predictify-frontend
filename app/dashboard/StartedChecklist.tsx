"use client"

import { useCallback, useMemo } from "react"
import { motion } from "framer-motion"
import {
  Wallet,
  Search,
  MousePointerClick,
  Share2,
  Trophy,
  X,
  ChevronRight,
  PartyPopper,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useSessionStorage } from "@/hooks/useSessionStorage"
import { useReducedMotion } from "@/hooks/useReducedMotion"

const TEST_ID = "started-checklist"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChecklistTask {
  /** Unique key for the task. */
  id: string
  /** Short label displayed next to the checkbox. */
  label: string
  /** Longer description shown below the label. */
  description: string
  /** Lucide icon to display. */
  icon: React.ComponentType<{ className?: string }>
  /** Optional href for a link to the relevant page. */
  href?: string
}

// ---------------------------------------------------------------------------
// Default tasks
// ---------------------------------------------------------------------------

export const DEFAULT_TASKS: ChecklistTask[] = [
  {
    id: "connect-wallet",
    label: "Connect your wallet",
    description:
      "Link your Stellar wallet to start making predictions and earning rewards.",
    icon: Wallet,
    href: "/settings",
  },
  {
    id: "browse-markets",
    label: "Browse prediction markets",
    description:
      "Explore markets across Politics, Crypto, Sports, and more.",
    icon: Search,
    href: "/events",
  },
  {
    id: "first-prediction",
    label: "Place your first prediction",
    description:
      "Choose an outcome, set your amount, and submit your first prediction.",
    icon: MousePointerClick,
    href: "/events",
  },
  {
    id: "share-market",
    label: "Share a market",
    description:
      "Share a prediction market with friends or on social media.",
    icon: Share2,
  },
  {
    id: "explore-leaderboard",
    label: "Explore the leaderboard",
    description:
      "See how you rank against other predictors on the platform.",
    icon: Trophy,
    href: "/leaderboard",
  },
]

// ---------------------------------------------------------------------------
// Session-storage keys
// ---------------------------------------------------------------------------

const COMPLETED_TASKS_KEY = "predictify:started-checklist:completed"
const DISMISSED_KEY = "predictify:started-checklist:dismissed"

// ---------------------------------------------------------------------------
// Stable initial values (must be module-level to avoid infinite re-renders
// with useSessionStorage which depends on initialValue by reference).
// ---------------------------------------------------------------------------

const INITIAL_COMPLETED: string[] = []

interface StartedChecklistProps {
  /** Override the default task list. Useful for testing / customisation. */
  tasks?: ChecklistTask[]
  /** Called when the user dismisses the checklist. */
  onDismiss?: () => void
  /** Called when a task is toggled. Receives the updated set of completed IDs. */
  onTaskToggle?: (completedIds: string[]) => void
  /**
   * Override the system `prefers-reduced-motion` value. When `true`
   * (either explicitly or via the media query), the entrance / exit
   * animations are bypassed and the checklist renders as a static
   * subtree of the same DOM structure.
   */
  reducedMotion?: boolean
}

/**
 * A first-time-user onboarding checklist displayed on the dashboard.
 *
 * Features:
 * - Checkable task list with session-storage persistence
 * - Progress bar showing completion percentage
 * - Dismissible (hidden state persisted in session storage)
 * - Animated entrance via framer-motion (skipped on prefers-reduced-motion)
 * - Accessible: each task is labelled, progress is announced via `aria-valuenow`
 * - All-complete celebration state with confetti-like icon swap
 */
export function StartedChecklist({
  tasks = DEFAULT_TASKS,
  onDismiss,
  onTaskToggle,
  reducedMotion: reducedMotionProp,
}: StartedChecklistProps) {
  const [completedTaskIds, setCompletedTaskIds] = useSessionStorage<string[]>(
    COMPLETED_TASKS_KEY,
    INITIAL_COMPLETED,
  )
  const [dismissed, setDismissed] = useSessionStorage<boolean>(
    DISMISSED_KEY,
    false,
  )

  const prefersReducedMotion = useReducedMotion()
  // `reducedMotion` is `true` when either the caller passed `true`
  // explicitly OR the user has `prefers-reduced-motion: reduce` set.
  const reducedMotion = reducedMotionProp ?? prefersReducedMotion
  // ---- derived data -------------------------------------------------------

  // Task IDs that exist in the current task set
  const currentTaskIds = useMemo(() => tasks.map((t) => t.id), [tasks])

  const completedCount = completedTaskIds.filter((id) => currentTaskIds.includes(id)).length
  const totalCount = tasks.length
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0
  const allComplete = completedCount === totalCount && totalCount > 0

  // ---- handlers -----------------------------------------------------------

  const handleToggle = useCallback(
    (taskId: string, checked: boolean) => {
      setCompletedTaskIds((prev) => {
        const next = checked
          ? [...prev, taskId]
          : prev.filter((id) => id !== taskId)
        onTaskToggle?.(next)
        return next
      })
    },
    [setCompletedTaskIds, onTaskToggle],
  )

  const handleDismiss = useCallback(() => {
    setDismissed(true)
    onDismiss?.()
  }, [setDismissed, onDismiss])

  // ---- render -------------------------------------------------------------

  if (dismissed) return null

  // Animation props only used in the framer-motion branch. When the user
  // prefers reduced motion (or the caller passed `reducedMotion={true}`)
  // we render a plain subtree so screen readers and motion-sensitive users
  // see the checklist immediately and without transitions.
  const card = (
    <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-card to-primary/5">
      {/* Progress bar at top */}
      <div className="absolute inset-x-0 top-0">
        <Progress
          value={progressPercent}
          className="h-1 rounded-none"
          aria-label={`Checklist progress: ${completedCount} of ${totalCount} tasks completed`}
        />
      </div>

      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 pt-5">
        <div className="space-y-1">
          <CardTitle className="text-lg font-semibold">
            {allComplete ? (
              <span className="inline-flex items-center gap-2">
                <PartyPopper className="h-5 w-5 text-yellow-500" aria-hidden="true" />
                You&apos;re all set!
              </span>
            ) : (
              <span>Get started</span>
            )}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {allComplete
              ? "You've completed all the onboarding steps. Happy predicting!"
              : `${completedCount} of ${totalCount} tasks completed`}
          </p>
        </div>

        {/* Dismiss button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 -mr-2 -mt-1 text-muted-foreground hover:text-foreground"
          aria-label="Dismiss checklist"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-1 pb-5">
        <ul className="space-y-0.5" role="list" aria-label="Onboarding checklist">
          {tasks.map((task) => {
            const isCompleted = completedTaskIds.includes(task.id)
            const Icon = task.icon

            return (
              <li key={task.id}>
                <label
                  className={cn(
                    "flex items-start gap-3 rounded-lg px-2 py-2.5 -mx-2 transition-colors",
                    "cursor-pointer hover:bg-accent/50 focus-within:bg-accent/50",
                    isCompleted && "opacity-70",
                  )}
                >
                  <Checkbox
                    checked={isCompleted}
                    onCheckedChange={(checked) =>
                      handleToggle(task.id, checked === true)
                    }
                    className="mt-0.5"
                    aria-label={`Mark "${task.label}" as ${isCompleted ? "incomplete" : "complete"}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isCompleted
                            ? "text-muted-foreground"
                            : "text-primary",
                        )}
                        aria-hidden="true"
                      />
                      <span
                        className={cn(
                          "text-sm font-medium",
                          isCompleted && "line-through text-muted-foreground",
                        )}
                      >
                        {task.label}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {task.description}
                    </p>
                  </div>

                  {task.href && !isCompleted && (
                    <ChevronRight
                      className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0"
                      aria-hidden="true"
                    />
                  )}
                </label>
              </li>
            )
          })}
        </ul>

        {/* Bottom action */}
        {!allComplete && (
          <div className="pt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>Complete these steps to unlock the full experience</span>
          </div>
        )}
        {allComplete && (
          <div className="pt-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleDismiss}
            >
              Dismiss checklist
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )

  if (reducedMotion) {
    // Static subtree — no entrance/exit animation when the user prefers
    // reduced motion. DOM structure is intentionally identical to the
    // animated branch so tests and assistive tech see the same content.
    return <div data-testid={TEST_ID}>{card}</div>
  }

  return (
    <motion.div
      data-testid={TEST_ID}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {card}
    </motion.div>
  )
}
