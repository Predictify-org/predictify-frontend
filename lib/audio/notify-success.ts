"use client"

import { toast } from "sonner"
import { playSound } from "./play-sound"

export function notifyClaimSuccess(options?: {
  title?: string
  description?: string
}) {
  playSound("success")
  toast.success(options?.title ?? "Claim submitted", {
    description:
      options?.description ?? "Your winnings have been claimed successfully.",
    duration: 5000,
  })
}

export function notifyBetPlaced(options?: {
  title?: string
  description?: string
}) {
  playSound("confirm")
  toast.success(options?.title ?? "Prediction placed", {
    description:
      options?.description ?? "Your prediction has been confirmed and staked.",
    duration: 5000,
  })
}
