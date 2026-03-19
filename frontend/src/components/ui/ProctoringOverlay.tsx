"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AlertTriangle, Shield, X } from "lucide-react"
import { VIOLATION_MESSAGES } from "../../hooks/useProctoring"

interface ProctoringOverlayProps {
    isVisible: boolean
    violationCount: number
    maxViolations: number
    lastViolationType: string | null
    onDismiss: () => void
    willAutoSubmit?: boolean
}

const ProctoringOverlay: React.FC<ProctoringOverlayProps> = ({
    isVisible,
    violationCount,
    maxViolations,
    lastViolationType,
    onDismiss,
    willAutoSubmit = false,
}) => {
    const remaining = maxViolations - violationCount
    const isFinal = remaining <= 0

    const message = lastViolationType
        ? VIOLATION_MESSAGES[lastViolationType] ?? "A suspicious action was detected."
        : "A suspicious action was detected."

    return (
        <AnimatePresence>
            {isVisible && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="proctor-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-md z-[9999]"
                    />

                    {/* Warning Card */}
                    <motion.div
                        key="proctor-card"
                        initial={{ opacity: 0, scale: 0.85, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                        className="fixed inset-0 flex items-center justify-center z-[10000] p-4"
                    >
                        <div className={`
              w-full max-w-md rounded-2xl border p-6 shadow-2xl
              ${isFinal
                                ? "bg-destructive/10 border-destructive/40"
                                : "bg-card border-orange-500/30"}
            `}>
                            {/* Icon */}
                            <div className={`
                mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full
                ${isFinal ? "bg-destructive/20" : "bg-orange-500/15"}
              `}>
                                {isFinal
                                    ? <Shield className="h-7 w-7 text-destructive" />
                                    : <AlertTriangle className="h-7 w-7 text-orange-500" />
                                }
                            </div>

                            {/* Heading */}
                            <h2 className={`text-center text-xl font-heading font-bold mb-2 ${isFinal ? "text-destructive" : "text-foreground"}`}>
                                {isFinal ? "Exam Auto-Submitted" : `Warning — Violation ${violationCount} of ${maxViolations}`}
                            </h2>

                            {/* Detail */}
                            <p className="text-center text-sm text-muted-foreground mb-4">
                                {message}
                            </p>

                            {/* Violation dots */}
                            <div className="flex justify-center gap-2 mb-5">
                                {Array.from({ length: maxViolations }).map((_, i) => (
                                    <div
                                        key={i}
                                        className={`h-2.5 w-2.5 rounded-full transition-colors ${i < violationCount
                                                ? "bg-destructive"
                                                : "bg-muted-foreground/30"
                                            }`}
                                    />
                                ))}
                            </div>

                            {/* Message based on state */}
                            {isFinal ? (
                                <p className="text-center text-sm text-destructive font-medium">
                                    You have exceeded the maximum number of violations. Your exam has been automatically submitted.
                                </p>
                            ) : (
                                <>
                                    <p className="text-center text-xs text-muted-foreground mb-4">
                                        {remaining === 1
                                            ? "⚠️ One more violation will automatically submit your exam."
                                            : `${remaining} more violations before your exam is auto-submitted.`}
                                    </p>
                                    <button
                                        onClick={onDismiss}
                                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
                                    >
                                        <X className="h-4 w-4" />
                                        I understand, continue exam
                                    </button>
                                </>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

export default ProctoringOverlay
