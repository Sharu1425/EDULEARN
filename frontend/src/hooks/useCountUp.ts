/**
 * useCountUp
 *
 * Smoothly animates a number toward its target value (credits, scores, stats).
 * Returns the current numeric value to render — pair with the `.tabular`
 * utility so the width doesn't jitter while counting.
 *
 * Respects `prefers-reduced-motion`: snaps straight to the target.
 */
import { useEffect, useRef, useState } from "react"
import { animate, useReducedMotion } from "framer-motion"

interface CountUpOptions {
  /** Animation duration in seconds. */
  duration?: number
  /** Decimal places to keep (default 0 → integers). */
  decimals?: number
}

export function useCountUp(value: number, options: CountUpOptions = {}): number {
  const { duration = 0.8, decimals = 0 } = options
  const prefersReduced = useReducedMotion()
  const [display, setDisplay] = useState(value)
  const prevRef = useRef(value)

  useEffect(() => {
    const from = prevRef.current
    prevRef.current = value

    if (prefersReduced || from === value) {
      setDisplay(value)
      return
    }

    const controls = animate(from, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: v => setDisplay(v),
    })
    return () => controls.stop()
  }, [value, duration, prefersReduced])

  const factor = 10 ** decimals
  return Math.round(display * factor) / factor
}
