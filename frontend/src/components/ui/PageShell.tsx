"use client"

import type React from "react"
import { motion } from "framer-motion"
import { staggerContainer } from "../../lib/motion"

export default function PageShell({
  title,
  subtitle,
  headerRight,
  children,
}: {
  title?: React.ReactNode
  subtitle?: React.ReactNode
  headerRight?: React.ReactNode
  children: React.ReactNode
}) {
  const hasHeader = !!(title || subtitle || headerRight)

  return (
    // min-h-full (not 100dvh): fills the scroll area without forcing a phantom scrollbar.
    // The page title now lives in the global app header; this is a compact in-page greeting.
    <div className="relative min-h-full px-6 py-6 lg:px-8">
      {hasHeader && (
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="min-w-0">
            {title && <h1 className="text-2xl font-heading font-bold tracking-tight text-foreground">{title}</h1>}
            {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {headerRight && <div className="flex shrink-0 items-center gap-3">{headerRight}</div>}
        </div>
      )}

      <motion.div variants={staggerContainer} initial="hidden" animate="visible">
        {children}
      </motion.div>
    </div>
  )
}
