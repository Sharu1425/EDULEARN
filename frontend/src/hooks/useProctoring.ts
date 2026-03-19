import { useEffect, useRef, useState, useCallback } from "react"

export interface ProctoringOptions {
    maxViolations?: number
    onAutoSubmit: () => void
    enabled?: boolean
}

export interface ProctoringResult {
    violationCount: number
    isWarningVisible: boolean
    dismissWarning: () => void
    lastViolationType: string | null
}

const VIOLATION_MESSAGES: Record<string, string> = {
    visibilitychange: "You switched tabs or minimized the browser.",
    blur: "You clicked outside the exam window.",
    contextmenu: "Right-click is disabled during the exam.",
    copy: "Copying is disabled during the exam.",
    paste: "Pasting is disabled during the exam.",
    cut: "Cutting is disabled during the exam.",
}

/**
 * useProctoring — monitors student behaviour during an active assessment.
 * Tracks tab switches, window blur, right-click, and clipboard events.
 * Auto-submits after `maxViolations` (default 3) infractions.
 */
export const useProctoring = ({
    maxViolations = 3,
    onAutoSubmit,
    enabled = true,
}: ProctoringOptions): ProctoringResult => {
    const [violationCount, setViolationCount] = useState(0)
    const [isWarningVisible, setIsWarningVisible] = useState(false)
    const [lastViolationType, setLastViolationType] = useState<string | null>(null)
    const autoSubmitted = useRef(false)
    const countRef = useRef(0)

    const triggerViolation = useCallback((type: string) => {
        if (!enabled || autoSubmitted.current) return

        // Block default for clipboard/contextmenu
        countRef.current += 1
        setViolationCount(countRef.current)
        setLastViolationType(type)
        setIsWarningVisible(true)

        // Report to backend (fire-and-forget)
        fetch("/api/proctoring/violation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
                violation_type: type,
                violation_number: countRef.current,
                timestamp: new Date().toISOString(),
            }),
        }).catch(() => {/* silently ignore network error */ })

        if (countRef.current >= maxViolations) {
            autoSubmitted.current = true
            // Give user a moment to read the final warning before forcing submit
            setTimeout(() => {
                onAutoSubmit()
            }, 2500)
        }
    }, [enabled, maxViolations, onAutoSubmit])

    const dismissWarning = useCallback(() => {
        setIsWarningVisible(false)
    }, [])

    useEffect(() => {
        if (!enabled) return

        // Tab visibility change
        const handleVisibilityChange = () => {
            if (document.hidden) triggerViolation("visibilitychange")
        }

        // Window blur (alt-tab, click outside browser)
        const handleBlur = () => triggerViolation("blur")

        // Prevent right-click
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault()
            triggerViolation("contextmenu")
        }

        // Prevent clipboard operations
        const handleCopy = (e: ClipboardEvent) => {
            e.preventDefault()
            triggerViolation("copy")
        }
        const handlePaste = (e: ClipboardEvent) => {
            e.preventDefault()
            triggerViolation("paste")
        }
        const handleCut = (e: ClipboardEvent) => {
            e.preventDefault()
            triggerViolation("cut")
        }

        document.addEventListener("visibilitychange", handleVisibilityChange)
        window.addEventListener("blur", handleBlur)
        document.addEventListener("contextmenu", handleContextMenu)
        document.addEventListener("copy", handleCopy)
        document.addEventListener("paste", handlePaste)
        document.addEventListener("cut", handleCut)

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange)
            window.removeEventListener("blur", handleBlur)
            document.removeEventListener("contextmenu", handleContextMenu)
            document.removeEventListener("copy", handleCopy)
            document.removeEventListener("paste", handlePaste)
            document.removeEventListener("cut", handleCut)
        }
    }, [enabled, triggerViolation])

    return { violationCount, isWarningVisible, dismissWarning, lastViolationType }
}

export { VIOLATION_MESSAGES }
