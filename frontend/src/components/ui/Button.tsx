"use client"

import type React from "react"
import { motion, HTMLMotionProps } from "framer-motion"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "onDrag" | "onDragStart" | "onDragEnd"> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "glass" | "glow" | "ghost-glow"
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
    "inline-flex items-center justify-center font-semibold rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none relative overflow-hidden"

  const variantClasses = {
    primary:
      "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/30 dark:shadow-cyan-500/20",
    secondary:
      "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-lg shadow-secondary/20",
    outline:
      "border border-border bg-transparent text-foreground hover:bg-muted/50 hover:border-primary/40 transition-colors",
    ghost:
      "text-muted-foreground hover:text-foreground hover:bg-muted/60",
    glass:
      "glass text-foreground hover:bg-white/70 dark:hover:bg-black/50",
    glow:
      "btn-glow btn-ripple text-white font-bold shadow-xl",
    "ghost-glow":
      "border border-white/20 bg-transparent text-white hover:border-primary/60 hover:bg-white/5 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all duration-300",
  }

  const glowGradient = variant === "glow"
    ? "bg-gradient-to-r from-[#38bdf8] via-[#818cf8] to-[#a78bfa] animate-gradient"
    : ""

  const sizeClasses = {
    sm:   "h-9 px-4 text-xs tracking-wide",
    md:   "h-11 px-6 text-sm tracking-wide",
    lg:   "h-14 px-8 text-base tracking-wide",
    icon: "h-11 w-11",
  }

  const isDisabled = disabled || isLoading

  return (
    <motion.button
      whileHover={!isDisabled ? { scale: 1.03, y: -1 } : {}}
      whileTap={!isDisabled ? { scale: 0.96 } : {}}
      transition={{ type: "spring", stiffness: 450, damping: 25 }}
      className={cn(baseClasses, variantClasses[variant], glowGradient, sizeClasses[size], className)}
      disabled={isDisabled}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading...
        </>
      ) : (
        children
      )}
    </motion.button>
  )
}

export default Button
