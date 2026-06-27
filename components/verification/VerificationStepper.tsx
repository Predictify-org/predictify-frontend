"use client"

import { cn } from "@/lib/utils"
import { Check, X } from "lucide-react"

export type StepState = "incomplete" | "current" | "done" | "error"

export interface Step {
  id: string
  label: string
  state: StepState
}

interface VerificationStepperProps {
  steps: Step[]
  currentStep: number
  onStepClick?: (step: number) => void
}

export function VerificationStepper({ steps, currentStep, onStepClick }: VerificationStepperProps) {
  return (
    <nav
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={steps.length}
      aria-valuenow={currentStep + 1}
      aria-label="Verification progress"
      className="w-full"
    >
      <ol className="flex items-center justify-between">
        {steps.map((step, index) => (
          <li key={step.id} className="flex items-center">
            <button
              type="button"
              onClick={() => onStepClick?.(index)}
              disabled={step.state === "incomplete"}
              className={cn(
                "flex items-center gap-2 text-sm font-medium transition-colors",
                step.state === "current" && "text-primary",
                step.state === "done" && "text-green-500",
                step.state === "error" && "text-destructive",
                step.state === "incomplete" && "text-muted-foreground",
                step.state !== "incomplete" && "cursor-pointer hover:opacity-80",
              )}
              aria-current={step.state === "current" ? "step" : undefined}
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors shrink-0",
                  step.state === "current" && "border-primary bg-primary text-primary-foreground",
                  step.state === "done" && "border-green-500 bg-green-500 text-white",
                  step.state === "error" && "border-destructive bg-destructive text-destructive-foreground",
                  step.state === "incomplete" && "border-muted-foreground bg-transparent text-muted-foreground",
                )}
              >
                {step.state === "done" ? (
                  <Check className="h-4 w-4" />
                ) : step.state === "error" ? (
                  <X className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </span>
              <span className="hidden sm:inline">{step.label}</span>
            </button>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "mx-2 h-0.5 w-8 sm:w-16 md:w-24 transition-colors",
                  step.state === "done" ? "bg-green-500" : "bg-border",
                )}
              />
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
