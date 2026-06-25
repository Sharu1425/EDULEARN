"use client"

import React from "react"
import { motion, useReducedMotion } from "framer-motion"

interface RevealProps {
  children: React.ReactNode
  className?: string
  /** Delay in seconds before the reveal starts. */
  delay?: number
  /** Only animate the first time it enters the viewport (default true). */
  once?: boolean
}

/**
 * Scroll-reveal wrapper — fades + rises its children the first time they enter
 * the viewport. Falls back to a plain div under prefers-reduced-motion.
 */
const Reveal: React.FC<RevealProps> = ({ children, className, delay = 0, once = true }) => {
  const reduced = useReducedMotion()
  if (reduced) return <div className={className}>{children}</div>

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount: 0.2 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay }}
    >
      {children}
    </motion.div>
  )
}

export default Reveal
