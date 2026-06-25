"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Trophy, Medal, Award, TrendingUp, Users, Target, Clock, X } from "lucide-react"
import api from "../utils/api"
import Overlay from "./ui/Overlay"
import Badge from "./ui/Badge"
import { RowSkeleton } from "./ui/Skeleton"
import { staggerContainer, staggerItem } from "../lib/motion"
import { useCountUp } from "../hooks/useCountUp"

interface LeaderboardEntry {
  student_id: string
  student_name: string
  score: number
  percentage: number
  time_taken?: number
  rank: number
}

interface LeaderboardProps {
  assessmentId: string
  onClose: () => void
}

const pctToken = (p: number) =>
  p >= 90 ? "success" : p >= 75 ? "info" : p >= 60 ? "warning" : "destructive"

const pctLabel = (p: number) =>
  p >= 90 ? "Excellent" : p >= 75 ? "Good" : p >= 60 ? "Average" : "Needs Improvement"

const rankTint = (rank: number) =>
  rank === 1
    ? "border-amber-400/30 bg-amber-400/10"
    : rank === 2
      ? "border-slate-400/30 bg-slate-400/10"
      : rank === 3
        ? "border-orange-400/30 bg-orange-400/10"
        : "border-border bg-muted/30"

const formatTime = (seconds?: number) => {
  if (!seconds) return "N/A"
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

const Leaderboard: React.FC<LeaderboardProps> = ({ assessmentId, onClose }) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true)
        const response = await api.get(`/api/assessments/${assessmentId}/leaderboard`)
        setLeaderboard(response.data || [])
      } catch (error) {
        console.error("Failed to fetch leaderboard:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchLeaderboard()
  }, [assessmentId])

  const participants = leaderboard.length
  const avg = participants ? leaderboard.reduce((s, e) => s + e.percentage, 0) / participants : 0
  const animParticipants = useCountUp(participants)
  const animAvg = useCountUp(avg, { decimals: 1 })

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="w-6 h-6 text-amber-400" />
      case 2: return <Medal className="w-6 h-6 text-slate-400" />
      case 3: return <Award className="w-6 h-6 text-orange-400" />
      default: return <span className="w-6 h-6 flex items-center justify-center text-muted-foreground font-bold">{rank}</span>
    }
  }

  return (
    <Overlay isOpen onClose={onClose} className="max-w-4xl">
      <div className="glass max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-e4 dark:shadow-e4-dark">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Assessment Leaderboard</h2>
          <button onClick={onClose} className="text-muted-foreground transition-colors hover:text-foreground" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map(i => <RowSkeleton key={i} />)}
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="py-10 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary animate-float">
              <Trophy className="h-8 w-8" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-foreground">No Submissions Yet</h3>
            <p className="text-muted-foreground">Students haven't completed this assessment yet.</p>
          </div>
        ) : (
          <>
            {/* Statistics */}
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Users className="h-5 w-5 text-info" />
                  <span className="font-medium text-muted-foreground">Total Participants</span>
                </div>
                <div className="tabular text-2xl font-bold text-info">{animParticipants}</div>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Target className="h-5 w-5 text-success" />
                  <span className="font-medium text-muted-foreground">Average Score</span>
                </div>
                <div className="tabular text-2xl font-bold text-success">{animAvg.toFixed(1)}%</div>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <span className="font-medium text-muted-foreground">Top Performer</span>
                </div>
                <div className="truncate text-lg font-bold text-primary">{leaderboard[0]?.student_name || "N/A"}</div>
              </div>
            </div>

            {/* Rankings */}
            <h3 className="mb-4 text-lg font-semibold text-foreground">Rankings</h3>
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">
              {leaderboard.map(entry => (
                <motion.div
                  key={entry.student_id}
                  variants={staggerItem}
                  className={`rounded-xl border p-4 transition-transform hover:-translate-y-0.5 ${rankTint(entry.rank)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {getRankIcon(entry.rank)}
                        <span className="text-lg font-bold text-foreground">#{entry.rank}</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">{entry.student_name}</h4>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Score: {entry.score}</span>
                          {entry.time_taken && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(entry.time_taken)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="tabular text-2xl font-bold" style={{ color: `hsl(var(--${pctToken(entry.percentage)}))` }}>
                        {entry.percentage.toFixed(1)}%
                      </div>
                      <Badge variant={pctToken(entry.percentage) as any}>{pctLabel(entry.percentage)}</Badge>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </>
        )}
      </div>
    </Overlay>
  )
}

export default Leaderboard
