"use client"

import React, { useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "../../lib/utils"
import { spring } from "../../lib/motion"

interface OverlayProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  /** Classes for the content panel wrapper. */
  className?: string
  /** Close when the backdrop is clicked (default true). */
  closeOnBackdrop?: boolean
}

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])'

/**
 * Shared modal/overlay shell: blurred backdrop, spring-scaled panel, ESC to
 * close, click-outside, body scroll lock, focus capture + restore, and a Tab
 * focus-trap. Use this for every dialog so overlays share one motion language.
 */
const Overlay: React.FC<OverlayProps> = ({
  isOpen,
  onClose,
  children,
  className,
  closeOnBackdrop = true,
}) => {
  const panelRef = useRef<HTMLDivElement>(null)
  const prevFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isOpen) return

    prevFocus.current = document.activeElement as HTMLElement
    const panel = panelRef.current
    const focusables = panel?.querySelectorAll<HTMLElement>(FOCUSABLE)
    ;(focusables && focusables.length ? focusables[0] : panel)?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
        return
      }
      if (e.key === "Tab" && panel) {
        const f = panel.querySelectorAll<HTMLElement>(FOCUSABLE)
        if (f.length === 0) {
          e.preventDefault()
          return
        }
        const first = f[0]
        const last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener("keydown", onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prevOverflow
      prevFocus.current?.focus?.()
    }
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeOnBackdrop ? onClose : undefined}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={spring.smooth}
            className={cn("relative z-10 w-full max-w-md outline-none", className)}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default Overlay
