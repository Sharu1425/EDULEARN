/**
 * useBackgroundTier
 *
 * Decides how heavy the ambient background may be for the current route so we
 * never pay for orbs + particles + cursor-glow on screens that need the GPU
 * (exams, coding, live class) or where the user asked for less motion.
 *
 *   'full'    → orbs + particle field + cursor glow (marketing / auth)
 *   'reduced' → orbs + cursor glow, NO particle field (app shell / dashboards)
 *   'off'     → nothing (exam / focus / fullscreen routes, or reduced-motion)
 */
import { useReducedMotion } from "framer-motion"
import { useLocation } from "react-router-dom"

export type BackgroundTier = "full" | "reduced" | "off"

// Focus / fullscreen routes — keep these distraction-free and fast.
// Mirrors FULLSCREEN_ROUTES in App.tsx.
const OFF_PREFIXES = [
  "/assessment",
  "/test/",
  "/coding/problem/",
  "/student/live/",
  "/teacher/live/",
]

// Public marketing / auth routes can afford the full treatment.
const FULL_EXACT = ["/", "/login", "/signup"]

const matchesPrefix = (pathname: string, prefix: string) =>
  pathname === prefix ||
  (pathname.startsWith(prefix) && (prefix.endsWith("/") || pathname.charAt(prefix.length) === "/"))

export function useBackgroundTier(): BackgroundTier {
  const prefersReduced = useReducedMotion()
  const { pathname } = useLocation()

  if (prefersReduced) return "off"
  if (OFF_PREFIXES.some(p => matchesPrefix(pathname, p))) return "off"
  if (FULL_EXACT.includes(pathname)) return "full"
  return "reduced"
}
