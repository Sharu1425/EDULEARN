"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { API_BASE_URL } from "../utils/constants"
import Tooltip from "./ui/Tooltip"
import { cn } from "../lib/utils"

interface BackendStatusIndicatorProps {
  className?: string
}

const STATUS_COLOR: Record<string, string> = {
  online: "bg-success",
  offline: "bg-destructive",
  checking: "bg-warning",
}

const STATUS_LABEL: Record<string, string> = {
  online: "Backend online",
  offline: "Backend offline",
  checking: "Checking backend…",
}

// Global state to persist across unmounts/remounts during navigation
let lastKnownStatus: "online" | "offline" | "checking" = "checking"
let failureCount = 0

/** Small pulsing dot next to the brand mark showing live backend reachability. */
const BackendStatusIndicator: React.FC<BackendStatusIndicatorProps> = ({ className = "" }) => {
  const [backendStatus, setBackendStatus] = useState<"online" | "offline" | "checking">(lastKnownStatus)

  const checkBackendStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(3000),
      })

      if (response.ok) {
        failureCount = 0
        lastKnownStatus = "online"
        setBackendStatus("online")
      } else {
        failureCount++
        if (failureCount >= 2) {
          lastKnownStatus = "offline"
          setBackendStatus("offline")
        }
      }
    } catch (error) {
      failureCount++
      if (failureCount >= 2) {
        lastKnownStatus = "offline"
        setBackendStatus("offline")
      }
    }
  }, [])

  useEffect(() => {
    checkBackendStatus()
    const interval = setInterval(checkBackendStatus, 30000)
    return () => clearInterval(interval)
  }, [checkBackendStatus])

  return (
    <Tooltip label={STATUS_LABEL[backendStatus]} side="bottom">
      <span className={cn("relative flex h-2.5 w-2.5 shrink-0", className)} aria-label="Backend status">
        {backendStatus === "online" && (
          <motion.span
            className="absolute inset-0 rounded-full bg-success"
            animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        <span className={cn("relative inline-block h-2.5 w-2.5 rounded-full", STATUS_COLOR[backendStatus])} />
      </span>
    </Tooltip>
  )
}

export default BackendStatusIndicator
