"use client"

import type React from "react"
import { motion, HTMLMotionProps } from "framer-motion"
import { cn } from "../../lib/utils"
import { spring } from "../../lib/motion"

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "onDrag" | "onDragStart" | "onDragEnd"> {
  variant?: "primary" | "secondary" | "destructive" | "outline" | "ghost" | "glass" | "glow" | "ghost-glow"
  size?: "sm" | "md" | "lg" | "icon"
  isLoading?: boolean
  children: React.ReactNode
}

const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  isLoading = false,
  children,
  className = "",
  disabled,
  ...props
}) => {
  const baseClasses =
    "group inline-flex items-center justify-center font-semibold rounded-xl select-none transition-[background-color,box-shadow,border-color,color] duration-200 ease-out-expo focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:pointer-events-none relative overflow-hidden"

  const variantClasses = {
    primary:
      "bg-primary text-primary-foreground hover:bg-primary/90 shadow-e2 hover:shadow-e3 dark:shadow-e2-dark dark:hover:shadow-e3-dark",
    secondary:
      "bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-e2 hover:shadow-e3 dark:shadow-e2-dark dark:hover:shadow-e3-dark",
    destructive:
      "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-e2 hover:shadow-e3 dark:shadow-e2-dark dark:hover:shadow-e3-dark",
    outline:
      "border border-border bg-transparent text-foreground hover:bg-muted/50 hover:border-primary/40",
    ghost:
      "text-muted-foreground hover:text-foreground hover:bg-muted/60",
    glass:
      "glass text-foreground hover:bg-white/70 dark:hover:bg-black/50",
    glow:
      "btn-glow btn-ripple text-white font-bold shadow-e3 dark:shadow-e3-dark",
    "ghost-glow":
      "border border-white/20 bg-transparent text-white hover:border-primary/60 hover:bg-white/5",
  }

  const glowGradient = variant === "glow"
    ? "bg-gradient-to-r from-[#10b981] via-[#14b8a6] to-[#a78bfa] animate-gradient"
    : ""

  // Restrained specular sweep — only on the filled, high-emphasis variants.
  const showSheen =
    variant === "primary" || variant === "secondary" || variant === "destructive" || variant === "glow"

  const sizeClasses = {
    sm: "h-9 px-4 text-xs tracking-wide",
    md: "h-11 px-6 text-sm tracking-wide",
    lg: "h-14 px-8 text-base tracking-wide",
    icon: "h-11 w-11",
  }

  const isDisabled = disabled || isLoading

  return (
    <motion.button
      whileHover={!isDisabled ? { scale: 1.03, y: -1 } : {}}
      whileTap={!isDisabled ? { scale: 0.96, y: 0 } : {}}
      transition={spring.snappy}
      className={cn(baseClasses, variantClasses[variant], glowGradient, sizeClasses[size], className)}
      disabled={isDisabled}
      {...props}
    >
      {/* Specular sheen — sweeps once on hover */}
      {showSheen && !isDisabled && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out-expo group-hover:translate-x-full"
        />
      )}

      {/* Label — fades out under load but keeps its width (no layout shift) */}
      <span className={cn("inline-flex items-center justify-center gap-2 transition-opacity", isLoading && "opacity-0")}>
        {children}
      </span>

      {/* Spinner overlay — centred over the reserved label width */}
      {isLoading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </span>
      )}
    </motion.button>
  )
}

export default Button
