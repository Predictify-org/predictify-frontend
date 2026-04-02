"use client"

import { AlertCircle, RefreshCw } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ErrorBannerProps {
  title?: string
  message: string
  onRetry?: () => void
  className?: string
}

export function ErrorBanner({
  title = "Something went wrong",
  message,
  onRetry,
  className,
}: ErrorBannerProps) {
  return (
    <Alert
      variant="destructive"
      className={cn("flex items-start gap-3", className)}
    >
      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription className="mt-1">{message}</AlertDescription>
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="shrink-0 border-destructive/50 text-destructive hover:bg-destructive/10"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Retry
        </Button>
      )}
    </Alert>
  )
}
