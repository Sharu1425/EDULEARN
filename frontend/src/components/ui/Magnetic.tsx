"use client"

import React, { useRef } from "react"
import { motion, useReducedMotion, useMotionValue, useSpring } from "framer-motion"

interface MagneticProps {
  children: React.ReactNode
  className?: string
  /** How strongly the element follows the cursor (0–1). */
  strength?: number
}

/**
 * Magnetic hover — the wrapped element gently drifts toward the cursor while
 * hovered, springing back on leave. Disabled under prefers-reduced-motion.
 * Best on high-emphasis targets (primary CTAs, FAB).
 */
const Magnetic: React.FC<MagneticProps> = ({ children, className, strength = 0.3 }) => {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 300, damping: 20 })
  const sy = useSpring(y, { stiffness: 300, damping: 20 })

  if (reduced) return <div className={className}>{children}</div>

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    x.set((e.clientX - (r.left + r.width / 2)) * strength)
    y.set((e.clientY - (r.top + r.height / 2)) * strength)
  }
  const reset = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ x: sx, y: sy }}
      onMouseMove={onMove}
      onMouseLeave={reset}
    >
      {children}
    </motion.div>
  )
}

export default Magnetic
