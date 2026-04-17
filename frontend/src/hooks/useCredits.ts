/**
 * useCredits hook
 * Fetches and caches the authenticated user's credits balance.
 * Refetches on focus and exposes a manual refresh function.
 */
import { useState, useEffect, useCallback } from "react"
import { useAuth } from "./useAuth"

const API_BASE = import.meta.env.VITE_API_BASE_URL || ""

interface CreditsState {
  balance: number | null
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useCredits(): CreditsState {
  const { user } = useAuth()
  const [balance, setBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBalance = useCallback(async () => {
    if (!user) {
      setBalance(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem("access_token")
      const res = await fetch(`${API_BASE}/api/credits/balance`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Failed to fetch credits")
      const data = await res.json()
      setBalance(data.balance ?? 0)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchBalance()
    // Refresh on window focus
    window.addEventListener("focus", fetchBalance)
    return () => window.removeEventListener("focus", fetchBalance)
  }, [fetchBalance])

  return { balance, loading, error, refresh: fetchBalance }
}
