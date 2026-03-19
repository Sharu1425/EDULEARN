"use client"

import type React from "react"
import { motion } from "framer-motion"

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
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="relative min-h-[100dvh]"
    >
      <header className="sticky top-0 z-40 glass border-b border-border/50">
        <div className="edl-container flex h-16 items-center justify-between">
          <div className="flex min-w-0 flex-col">
            {title && <h1 className="text-xl font-heading font-semibold text-foreground tracking-tight">{title}</h1>}
            {subtitle && <p className="text-sm font-sans text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3">{headerRight}</div>
        </div>
      </header>
      <main className="relative z-10 w-full animate-in">
        <div className="edl-container py-8 sm:py-10">{children}</div>
      </main>
    </motion.div>
  )
}
