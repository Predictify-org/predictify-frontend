"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      closeButton
      richColors
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card/90 group-[.toaster]:backdrop-blur-sm group-[.toaster]:text-foreground group-[.toaster]:border-border/50 group-[.toaster]:shadow-xl group-[.toaster]:rounded-xl",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-sm",
          actionButton:
            "group-[.toast]:bg-primary/20 group-[.toast]:text-primary group-[.toast]:border group-[.toast]:border-primary/30 group-[.toast]:hover:bg-primary/30 group-[.toast]:rounded-lg",
          cancelButton:
            "group-[.toast]:bg-muted/20 group-[.toast]:text-muted-foreground group-[.toast]:border group-[.toast]:border-muted/30 group-[.toast]:hover:bg-muted/30 group-[.toast]:rounded-lg",
          closeButton:
            "group-[.toast]:bg-background/10 group-[.toast]:text-foreground/60 group-[.toast]:border-0 group-[.toast]:hover:bg-background/20",
          success:
            "group-[.toaster]:bg-gradient-to-r group-[.toaster]:from-green-500/10 group-[.toaster]:to-emerald-500/10 group-[.toaster]:border-green-500/20 group-[.toaster]:text-green-100",
          error:
            "group-[.toaster]:bg-gradient-to-r group-[.toaster]:from-red-500/10 group-[.toaster]:to-rose-500/10 group-[.toaster]:border-red-500/20 group-[.toaster]:text-red-100",
          info:
            "group-[.toaster]:bg-gradient-to-r group-[.toaster]:from-blue-500/10 group-[.toaster]:to-purple-500/10 group-[.toaster]:border-blue-500/20 group-[.toaster]:text-blue-100",
          warning:
            "group-[.toaster]:bg-gradient-to-r group-[.toaster]:from-yellow-500/10 group-[.toaster]:to-orange-500/10 group-[.toaster]:border-yellow-500/20 group-[.toaster]:text-yellow-100",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
