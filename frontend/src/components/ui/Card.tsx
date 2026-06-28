"use client"

import React, { useRef } from "react"
import { cn } from "../../lib/utils"

interface CardProps {
  children: React.ReactNode
  className?: string
  glow?: boolean
  hover?: boolean
  /** Standard padding preset. Omit to control padding via className. */
  size?: "sm" | "md" | "lg"
  /** Surface style — "solid" (default, lightweight) or "glass" (vibrancy). */
  appearance?: "solid" | "glass"
  /** Cursor-tracking light highlight on hover. Defaults to `hover`. */
  spotlight?: boolean
  onClick?: () => void
}

const SIZE_PADDING = { sm: "p-4", md: "p-6", lg: "p-8" } as const

const Card: React.FC<CardProps> = ({
  children,
  className = "",
  glow = false,
  hover = true,
  size,
  appearance = "solid",
  spotlight,
  onClick,
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const enableSpotlight = (spotlight ?? hover)

  // Update CSS vars directly on the node — no React re-render per mouse move.
  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty("--spot-x", `${e.clientX - r.left}px`)
    el.style.setProperty("--spot-y", `${e.clientY - r.top}px`)
  }

  return (
    <div
      ref={ref}
      onClick={onClick}
      onMouseMove={enableSpotlight ? handleMove : undefined}
      className={cn(
        // `isolate` keeps the spotlight overlay (-z-10) above the bg but below content.
        "group relative isolate overflow-hidden rounded-2xl border transition-all duration-300 ease-out-expo",
        appearance === "glass"
          ? [
              // macOS-style vibrancy glass + specular inner rim
              "backdrop-blur-2xl backdrop-saturate-150",
              "bg-white/60 border-white/50 shadow-e2 ring-1 ring-inset ring-white/30",
              "dark:bg-[rgba(17,23,41,0.55)] dark:border-white/10 dark:shadow-e2-dark dark:ring-white/[0.06]",
              hover && [
                "hover:-translate-y-0.5 hover:shadow-e3 hover:ring-white/50",
                "dark:hover:shadow-e3-dark dark:hover:border-white/15 dark:hover:bg-[rgba(17,23,41,0.7)] dark:hover:ring-white/10",
              ],
            ]
          : [
              // Soft-modern solid surface — crisp + lightweight (no blur)
              "bg-card border-border shadow-e2 dark:shadow-e2-dark",
              hover && [
                "hover:-translate-y-0.5 hover:shadow-e3 hover:border-primary/30 dark:hover:shadow-e3-dark",
              ],
            ],
        glow && [
          "ring-1 ring-inset ring-primary/20",
          "dark:hover:shadow-[0_16px_48px_rgba(0,0,0,0.5),0_0_28px_rgba(52,211,153,0.12)]",
        ],
        size && SIZE_PADDING[size],
        onClick && "cursor-pointer",
        className
      )}
    >
      {/* Cursor-tracking spotlight — sits behind content via -z-10 */}
      {enableSpotlight && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(240px circle at var(--spot-x, 50%) var(--spot-y, 50%), hsl(var(--primary) / 0.10), transparent 60%)",
          }}
        />
      )}
      {children}
    </div>
  )
}

export default Card
