import { useEffect, useRef, useState, useCallback } from "react"

export interface ProctoringOptions {
    maxViolations?: number
    onAutoSubmit: (isMalpractice?: boolean) => void
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
    fullscreen_exit: "You exited fullscreen mode.",
    keyboard_shortcut: "Restricted keyboard shortcuts are disabled.",
    devtools_open: "Developer tools are not allowed during the exam.",
    mouse_left_window: "Your mouse cursor left the exam window."
}

export interface Violation {
    type: string
    timestamp: string
    strike_number: number
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
}: ProctoringOptions) => {
    const [violationCount, setViolationCount] = useState(0)
    const [isWarningVisible, setIsWarningVisible] = useState(false)
    const [lastViolationType, setLastViolationType] = useState<string | null>(null)
    const [isFrozen, setIsFrozen] = useState(false)
    const [violations, setViolations] = useState<Violation[]>([])
    const autoSubmitted = useRef(false)
    const countRef = useRef(0)

    const triggerViolation = useCallback((type: string, detail?: string) => {
        if (!enabled || autoSubmitted.current) return

        countRef.current += 1
        const currentCount = countRef.current
        setViolationCount(currentCount)
        setLastViolationType(type)
        
        // Log violation
        setViolations(prev => [...prev, {
            type: detail ? `${type} (${detail})` : type,
            timestamp: new Date().toISOString(),
            strike_number: currentCount
        }])

        // Strike System Implementation
        if (currentCount >= maxViolations) {
            setIsWarningVisible(true)
            autoSubmitted.current = true
            // Give user a moment to read the final warning before forcing submit
            setTimeout(() => {
                onAutoSubmit(true) // Pass true for malpractice
            }, 2500)
        } else if (currentCount === 2) {
            // 5 second freeze on 2nd strike
            setIsWarningVisible(true)
            setIsFrozen(true)
            setTimeout(() => {
                setIsFrozen(false)
            }, 5000)
        } else {
            // Strike 1
            setIsWarningVisible(true)
        }
    }, [enabled, maxViolations, onAutoSubmit])

    const dismissWarning = useCallback(() => {
        // Can only dismiss if not frozen and not auto-submitted
        if (!isFrozen && !autoSubmitted.current) {
            setIsWarningVisible(false)
        }
    }, [isFrozen])

    useEffect(() => {
        if (!enabled) return

        // 1. Tab visibility change
        const handleVisibilityChange = () => {
            if (document.hidden) triggerViolation("visibilitychange")
        }

        // 2. Window blur (alt-tab, click outside browser)
        const handleBlur = () => triggerViolation("blur")

        // 3. Prevent right-click
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault()
            triggerViolation("contextmenu")
        }

        // 4. Prevent clipboard operations
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

        // 5. Fullscreen exit detection
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
                triggerViolation("fullscreen_exit")
            }
        }

        // 6. Block keyboard shortcuts
        const BLOCKED_KEYS = [
            { key: 'F12', label: 'F12' },
            { key: 'F11', label: 'F11' },
            { key: 'u', ctrl: true, label: 'Ctrl+U' },
            { key: 'c', ctrl: true, label: 'Ctrl+C' },
            { key: 'v', ctrl: true, label: 'Ctrl+V' },
            { key: 'a', ctrl: true, label: 'Ctrl+A' },
            { key: 'p', ctrl: true, label: 'Ctrl+P' },
            { key: 's', ctrl: true, label: 'Ctrl+S' },
            { key: 'PrintScreen', label: 'PrintScreen' }
        ]

        const handleKeyDown = (e: KeyboardEvent) => {
            // Block Alt+Tab if it can be caught (browsers typically prevent this, but just in case)
            if (e.key === 'Tab' && e.altKey) {
                e.preventDefault()
                triggerViolation("keyboard_shortcut", "Alt+Tab")
                return
            }

            const blocked = BLOCKED_KEYS.find(k =>
                e.key.toLowerCase() === k.key.toLowerCase() &&
                (!k.ctrl || e.ctrlKey || e.metaKey)
            )

            if (blocked) {
                e.preventDefault()
                e.stopPropagation()
                triggerViolation("keyboard_shortcut", blocked.label)
            }
        }

        // 7. Mouse leave tracking
        const handleMouseLeave = (e: MouseEvent) => {
            if (e.clientY <= 0 || e.clientX <= 0 ||
                e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
                triggerViolation("mouse_left_window")
            }
        }

        // 8. DevTools detection (using window size diff as rough estimate)
        const detectDevTools = () => {
            const threshold = 160
            if (
                window.outerWidth - window.innerWidth > threshold ||
                window.outerHeight - window.innerHeight > threshold
            ) {
                triggerViolation("devtools_open")
            }
        }
        const devToolsInterval = setInterval(detectDevTools, 2000)

        document.addEventListener("visibilitychange", handleVisibilityChange)
        window.addEventListener("blur", handleBlur)
        document.addEventListener("contextmenu", handleContextMenu)
        document.addEventListener("copy", handleCopy)
        document.addEventListener("paste", handlePaste)
        document.addEventListener("cut", handleCut)
        document.addEventListener("fullscreenchange", handleFullscreenChange)
        document.addEventListener("keydown", handleKeyDown)
        document.addEventListener("mouseleave", handleMouseLeave)

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange)
            window.removeEventListener("blur", handleBlur)
            document.removeEventListener("contextmenu", handleContextMenu)
            document.removeEventListener("copy", handleCopy)
            document.removeEventListener("paste", handlePaste)
            document.removeEventListener("cut", handleCut)
            document.removeEventListener("fullscreenchange", handleFullscreenChange)
            document.removeEventListener("keydown", handleKeyDown)
            document.removeEventListener("mouseleave", handleMouseLeave)
            clearInterval(devToolsInterval)
        }
    }, [enabled, triggerViolation])

    return { violationCount, isWarningVisible, dismissWarning, lastViolationType, violations, isFrozen, triggerViolation }
}

export { VIOLATION_MESSAGES }
