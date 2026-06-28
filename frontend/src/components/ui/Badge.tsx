"use client"

import React from "react"
import { cn } from "../../lib/utils"

export type BadgeVariant =
  | "default"
  | "ai"
  | "credit"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "outline"

interface BadgeProps {
  variant?: BadgeVariant
  /** Show a leading status dot (softly pulses). */
  dot?: boolean
  className?: string
  children: React.ReactNode
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "border-border bg-muted/60 text-muted-foreground",
  ai: "border-primary/30 bg-primary/10 text-primary",
  credit: "border-amber-400/30 bg-amber-400/10 text-amber-600 dark:text-amber-300",
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  error: "border-destructive/30 bg-destructive/10 text-destructive",
  info: "border-info/30 bg-info/10 text-info",
  outline: "border-border bg-transparent text-foreground/70",
}

const dotClasses: Record<BadgeVariant, string> = {
  default: "bg-muted-foreground",
  ai: "bg-primary",
  credit: "bg-amber-400",
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-destructive",
  info: "bg-info",
  outline: "bg-foreground/50",
}

const Badge: React.FC<BadgeProps> = ({ variant = "default", dot = false, className, children }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold backdrop-blur-sm transition-colors duration-200",
      variantClasses[variant],
      className
    )}
  >
    {dot && (
      <span className="relative flex h-1.5 w-1.5">
        <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", dotClasses[variant])} />
        <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", dotClasses[variant])} />
      </span>
    )}
    {children}
  </span>
)

export default Badge
