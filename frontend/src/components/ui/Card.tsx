"use client"

import React, { useRef } from "react"
import { cn } from "../../lib/utils"

interface CardProps {
  children: React.ReactNode
  className?: string
  glow?: boolean
  hover?: boolean
  /** Cursor-tracking light highlight on hover. Defaults to `hover`. */
  spotlight?: boolean
  onClick?: () => void
}

const Card: React.FC<CardProps> = ({
  children,
  className = "",
  glow = false,
  hover = true,
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
        // Base glass morphism styling. `isolate` guarantees the spotlight
        // overlay (-z-10) paints above the card background but below content,
        // so children render directly without an extra wrapper.
        "group relative isolate overflow-hidden rounded-2xl border backdrop-blur-xl transition-all duration-300 ease-out-expo",
        // Light mode
        "bg-white/70 border-white/60 shadow-e2",
        // Dark mode
        "dark:bg-[rgba(2,6,23,0.45)] dark:border-white/5 dark:shadow-e2-dark",
        // Hover — lift one elevation tier
        hover && [
          "hover:-translate-y-0.5 hover:shadow-e3",
          "dark:hover:shadow-e3-dark dark:hover:border-white/10 dark:hover:bg-[rgba(2,6,23,0.6)]",
        ],
        // Optional accent ring + soft glow
        glow && [
          "ring-1 ring-inset ring-primary/15",
          "dark:hover:shadow-[0_16px_48px_rgba(0,0,0,0.5),0_0_28px_rgba(34,211,238,0.10)]",
        ],
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
              "radial-gradient(240px circle at var(--spot-x, 50%) var(--spot-y, 50%), rgba(56,189,248,0.10), transparent 60%)",
          }}
        />
      )}
      {children}
    </div>
  )
}

export default Card
