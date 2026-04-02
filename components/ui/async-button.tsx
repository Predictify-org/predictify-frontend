"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import { Button, type ButtonProps } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface AsyncButtonProps extends ButtonProps {
  loading?: boolean
  loadingText?: string
}

export function AsyncButton({
  loading = false,
  loadingText,
  disabled,
  children,
  className,
  ...props
}: AsyncButtonProps) {
  return (
    <Button
      disabled={disabled || loading}
      className={cn("relative", className)}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {loading && loadingText ? loadingText : children}
    </Button>
  )
}
