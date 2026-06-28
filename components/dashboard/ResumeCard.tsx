"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, RotateCcw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  dismissInProgressPrediction,
  getVisibleInProgressPrediction,
  type InProgressPrediction,
} from "@/lib/state/inProgress"

const STEP_LABELS: Record<InProgressPrediction["step"], string> = {
  review: "Review stake",
  sign: "Sign with wallet",
  submit: "Submit to network",
}

export function ResumeCard() {
  const [prediction, setPrediction] = useState<InProgressPrediction | null>(null)

  useEffect(() => {
    setPrediction(getVisibleInProgressPrediction())
  }, [])

  if (!prediction) {
    return null
  }

  const handleDismiss = () => {
    dismissInProgressPrediction(prediction.id)
    setPrediction(null)
  }

  return (
    <Card
      className="border-primary/30 bg-primary/5"
      aria-labelledby="resume-prediction-title"
    >
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span id="resume-prediction-title">Resume your last prediction</span>
          </div>
          <p className="text-base font-semibold leading-6">{prediction.marketTitle}</p>
          <p className="text-sm text-muted-foreground">
            {STEP_LABELS[prediction.step]}
            {prediction.stakeAmount ? ` · ${prediction.stakeAmount} staked` : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild>
            <Link href={prediction.href}>
              Resume
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            aria-label="Dismiss resume prediction card"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
