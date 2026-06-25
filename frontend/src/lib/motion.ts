/**
 * Shared motion vocabulary.
 *
 * One source of truth for easing, durations, spring presets, and common
 * Framer-Motion variants so the whole UI animates as a single designed system
 * instead of per-component guesses.
 *
 * Components that need to respect the OS "reduce motion" setting should call
 * Framer's `useReducedMotion()` and fall back to the `instant`/no-op variants.
 */
import type { Variants, Transition } from "framer-motion"

// ─── Easing (mirrors the CSS custom properties in index.css) ──────────────────
export const easing = {
  outExpo: [0.16, 1, 0.3, 1] as const,
  outQuart: [0.25, 1, 0.5, 1] as const,
  inOutSoft: [0.45, 0, 0.15, 1] as const,
}

// ─── Durations (seconds — Framer uses seconds, CSS uses ms) ───────────────────
export const duration = {
  d1: 0.12,
  d2: 0.2,
  d3: 0.32,
  d4: 0.56,
}

// ─── Spring presets ───────────────────────────────────────────────────────────
export const spring = {
  /** Buttons, taps, toggles — quick and crisp. */
  snappy: { type: "spring", stiffness: 450, damping: 30 } as Transition,
  /** Panels, cards, dropdowns — controlled and smooth. */
  smooth: { type: "spring", stiffness: 260, damping: 30 } as Transition,
  /** Large / hero movements — soft settle. */
  gentle: { type: "spring", stiffness: 170, damping: 26 } as Transition,
}

// ─── Reusable variants ────────────────────────────────────────────────────────

/** Fade + rise. Pair with `staggerContainer` for choreographed lists/grids. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.d4, ease: easing.outExpo },
  },
}

/** Fade + scale — good for cards / popovers appearing in place. */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: duration.d3, ease: easing.outExpo },
  },
}

/** Parent that staggers its children. Children should use `staggerItem`. */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.05, delayChildren: 0.04 },
  },
}

/** Child of `staggerContainer`. */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.d3, ease: easing.outExpo },
  },
}

/** Standard page/route transition. */
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 8, scale: 0.995 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: duration.d3, ease: easing.outExpo },
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.995,
    transition: { duration: duration.d2, ease: easing.outQuart },
  },
}

/** No-op variants for the reduced-motion path (opacity only, near-instant). */
export const instant: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.001 } },
  exit: { opacity: 0, transition: { duration: 0.001 } },
}
