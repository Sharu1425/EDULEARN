"use client"

import type React from "react"
import { motion } from "framer-motion"
import { useTheme } from "../../contexts/ThemeContext"

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
  const { colorScheme } = useTheme()
  const isDark = colorScheme === "dark"

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="relative min-h-[100dvh]"
    >
      {/* Page header — fully theme-aware */}
      <header
        className="sticky top-0 z-40 border-b backdrop-blur-2xl transition-all"
        style={{
          background: isDark
            ? "rgba(2, 6, 23, 0.72)"
            : "rgba(248, 250, 252, 0.90)",
          borderColor: isDark
            ? "rgba(255,255,255,0.06)"
            : "rgba(99, 102, 241, 0.12)",
          boxShadow: isDark
            ? "0 1px 20px rgba(0,0,0,0.3)"
            : "0 1px 20px rgba(99,102,241,0.06)",
        }}
      >
        <div className="px-6 lg:px-8 flex min-h-[4rem] items-center justify-between py-3">
          <div className="flex min-w-0 flex-1 flex-col justify-center">
            {title && (
              <h1 className={`text-xl font-heading font-bold tracking-tight truncate sm:whitespace-normal ${isDark ? "gradient-text" : "gradient-text-light"}`}>
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-sm font-sans text-muted-foreground mt-0.5 line-clamp-1 sm:line-clamp-none">
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-4">{headerRight}</div>
        </div>
      </header>

      <main className="relative z-10 w-full animate-in">
        <div className="px-6 lg:px-8 py-8 sm:py-10">{children}</div>
      </main>
    </motion.div>
  )
}
