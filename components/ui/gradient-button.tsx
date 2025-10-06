"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface GradientButtonProps {
  children: ReactNode;
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
  fullWidth?: boolean;
  asChild?: boolean;
}

export function GradientButton({
  children,
  variant = "primary",
  size = "md",
  className,
  onClick,
  fullWidth = false,
  asChild = false,
}: GradientButtonProps) {
  const baseClasses =
    "relative font-bold transition-all duration-300 transform hover:scale-105";

  const variantClasses = {
    primary:
      "bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 shadow-2xl shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:-translate-y-1",
    secondary:
      "border-2 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 hover:border-cyan-400/50 bg-slate-950/50 backdrop-blur-sm shadow-lg hover:shadow-cyan-500/20",
  };

  const sizeClasses = {
    sm: "text-sm px-4 py-2",
    md: "text-base px-6 py-3",
    lg: "text-lg px-8 py-6 sm:px-10 sm:py-8",
  };

  return (
    <Button
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full sm:w-auto",
        className
      )}
      onClick={onClick}
      variant={variant === "secondary" ? "outline" : "default"}
      size={size === "lg" ? "lg" : "default"}
      asChild={asChild}
    >
      {variant === "primary" && !asChild && (
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-md blur opacity-50 -z-10"></div>
      )}
      {children}
    </Button>
  );
}
