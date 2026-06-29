"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "../../lib/utils"

interface TooltipProps {
  label: string
  children: React.ReactNode
  side?: "top" | "bottom" | "left" | "right"
  className?: string
}

const SIDE: Record<string, string> = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
}

/** Lightweight, dependency-free hover/focus tooltip using the app's glass styling. */
const Tooltip: React.FC<TooltipProps> = ({ label, children, side = "bottom", className }) => {
  const [open, setOpen] = useState(false)
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      <AnimatePresence>
        {open && (
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.12 }}
            role="tooltip"
            className={cn(
              "glass pointer-events-none absolute z-[200] whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold text-foreground shadow-e3 dark:shadow-e3-dark",
              SIDE[side],
              className,
            )}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}

export default Tooltip
