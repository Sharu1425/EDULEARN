"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { motion, useReducedMotion } from "framer-motion"
import {
  Sparkles, ClipboardList, Code2, Map as MapIcon, CalendarDays,
  ArrowRight, Radio, Trophy, ChevronRight, GraduationCap,
} from "lucide-react"
import type { TestResult } from "../types"
import { useAuth } from "../hooks/useAuth"
import Card from "../components/ui/Card"
import Button from "../components/ui/Button"
import Badge from "../components/ui/Badge"
import StatTile from "../components/ui/StatTile"
import Sparkline from "../components/ui/Sparkline"
import { staggerContainer, staggerItem } from "../lib/motion"
import api from "../utils/api"

const pctOf = (t: any) => Math.round(t.percentage ?? (t.score / t.total_questions) * 100)
const scoreToken = (p: number) => (p >= 80 ? "success" : p >= 60 ? "warning" : "destructive")

const QUICK_ACTIONS = [
  { label: "Start Assessment", desc: "MCQ or coding, AI-generated", to: "/assessment-choice", Icon: ClipboardList, accent: "primary" },
  { label: "ThinkTrace", desc: "Adaptive AI interview", to: "/unified-assessment?tab=thinktrace", Icon: Sparkles, accent: "secondary" },
  { label: "Coding Lab", desc: "Practice with feedback", to: "/coding", Icon: Code2, accent: "info" },
  { label: "Topic Mastery", desc: "Your learning paths", to: "/mastery", Icon: MapIcon, accent: "accent" },
]

/** Types a string out character-by-character with a blinking caret (respects reduced-motion). */
const TypedText: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
  const reduce = useReducedMotion()
  const [shown, setShown] = useState("")
  useEffect(() => {
    if (reduce) { setShown(text); return }
    setShown("")
    let i = 0
    const id = window.setInterval(() => {
      i += 1
      setShown(text.slice(0, i))
      if (i >= text.length) window.clearInterval(id)
    }, 65)
    return () => window.clearInterval(id)
  }, [text, reduce])
  const done = shown.length >= text.length
  return (
    <span className={className}>
      {shown}
      <span
        className={`ml-0.5 inline-block w-[2px] -translate-y-0.5 align-middle ${done ? "opacity-0" : "animate-pulse"}`}
        style={{ height: "0.85em", background: "currentColor" }}
        aria-hidden
      />
    </span>
  )
}

const Dashboard: React.FC = () => {
  const { user } = useAuth()

  const [recentTests, setRecentTests] = useState<TestResult[]>([])
  const [upcomingTests, setUpcomingTests] = useState<any[]>([])
  const [activeSessions, setActiveSessions] = useState<any[]>([])

  useEffect(() => {
    if (user?._id || user?.id) {
      fetchRecentTests()
      fetchUpcomingTests()
      fetchActiveSessions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id, user?.id])

  const fetchRecentTests = async () => {
    try {
      if (!user) return
      const userId = user._id || user.id
      const response = await api.get(`/api/results/user/${userId}`)
      if (response.data.success) setRecentTests((response.data.results || []).slice(0, 5))
    } catch (error) {
      console.error("[DASHBOARD] recent tests failed", error)
    }
  }

  const fetchUpcomingTests = async () => {
    try {
      const response = await api.get("/api/assessments/student/upcoming")
      setUpcomingTests(response.data || [])
    } catch (error) {
      console.error("[DASHBOARD] upcoming tests failed", error)
      setUpcomingTests([])
    }
  }

  const fetchActiveSessions = async () => {
    try {
      if (!user) return
      const response = await api.get("/api/livesession/sessions/active-for-student")
      if (response.data?.active_sessions) setActiveSessions(response.data.active_sessions)
    } catch (error) {
      console.error("Failed to fetch active sessions", error)
    }
  }

  useEffect(() => {
    if (!user) return
    fetchActiveSessions()
    const interval = setInterval(fetchActiveSessions, 5000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const name = user?.username || user?.name || (user?.email ? user.email.split("@")[0] : "Learner")
  const scores = [...recentTests].reverse().map(pctOf)
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6"
    >
      {/* Live class banner */}
      {activeSessions.map((session, idx) => (
        <motion.div key={idx} variants={staggerItem}>
          <Card hover={false} className="relative overflow-hidden border-destructive/30 bg-destructive/[0.06] p-5">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-destructive text-destructive-foreground shadow-e2">
                  <Radio className="h-6 w-6 animate-pulse" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading text-lg font-bold text-foreground">{session.batch_name} is live</h3>
                    <Badge variant="error" dot>LIVE</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Passcode <span className="font-mono font-semibold text-foreground">{session.session_code}</span></p>
                </div>
              </div>
              <Link to={`/student/live/${session.batch_id}`} className="w-full sm:w-auto">
                <Button variant="destructive" className="w-full sm:w-auto">Join Session</Button>
              </Link>
            </div>
          </Card>
        </motion.div>
      ))}

      {/* Hero + highlight */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <motion.div variants={staggerItem} className="lg:col-span-2">
          <Card appearance="glass" hover={false} className="relative h-full overflow-hidden p-7 sm:p-9">
            <div className="aurora-mesh" />
            <div className="relative z-10 flex h-full flex-col">
              <Badge variant="ai" className="mb-4 w-fit"><Sparkles className="h-3 w-3" /> AI-powered learning</Badge>
              <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Welcome back,{" "}
                <TypedText text={name} className="text-gradient-primary" />
              </h1>
              <p className="mt-2 max-w-md text-muted-foreground">
                Pick up where you left off, or start something new. Press{" "}
                <kbd className="rounded border border-border bg-muted/60 px-1.5 text-xs font-medium">⌘K</kbd> to jump anywhere.
              </p>
              <div className="mt-auto flex flex-wrap gap-3 pt-6">
                <Link to="/mastery"><Button variant="primary"><GraduationCap className="h-4 w-4" /> Continue learning</Button></Link>
                <Link to="/assessment-choice"><Button variant="outline">Practice now <ArrowRight className="h-4 w-4" /></Button></Link>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={staggerItem} className="grid grid-rows-2 gap-4">
          <StatTile className="h-full" label="Upcoming" value={upcomingTests.length} icon={<ClipboardList className="h-4 w-4" />} accent="info" />
          <StatTile className="h-full" label="Avg Score" value={avg} suffix="%" icon={<Trophy className="h-4 w-4" />} accent="success" spark={scores} />
        </motion.div>
      </div>

      {/* Quick actions */}
      <motion.div variants={staggerItem} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {QUICK_ACTIONS.map((a) => (
          <Link key={a.to} to={a.to}>
            <Card className="group h-full p-5">
              <span
                className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-110"
                style={{ background: `hsl(var(--${a.accent}) / 0.12)`, color: `hsl(var(--${a.accent}))` }}
              >
                <a.Icon className="h-5 w-5" />
              </span>
              <div className="flex items-center gap-1 font-heading font-bold text-foreground">
                {a.label}
                <ChevronRight className="h-4 w-4 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{a.desc}</p>
            </Card>
          </Link>
        ))}
      </motion.div>

      {/* Upcoming + Recent activity */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Upcoming */}
        <motion.div variants={staggerItem} className="lg:col-span-2">
          <Card className="flex h-full min-h-[460px] flex-col p-6">
            <h3 className="mb-4 flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
              <CalendarDays className="h-5 w-5 text-primary" /> Upcoming Tests
              {upcomingTests.length > 0 && (
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary/15 px-1.5 text-xs font-bold tabular text-primary">
                  {upcomingTests.length}
                </span>
              )}
            </h3>
            {upcomingTests.length > 0 ? (
              <div className="-mr-2 flex-1 space-y-2.5 overflow-y-auto pr-2">
                {upcomingTests.map((test) => (
                  <div key={test.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 p-4 transition-colors hover:border-primary/30 hover:bg-muted/50">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{test.title}</p>
                      <p className="text-sm text-muted-foreground">{test.subject} · {test.difficulty} · {test.question_count} Qs · {test.time_limit}m</p>
                    </div>
                    <Link to={`/test/${test.id}`}><Button variant="primary" size="sm">Start</Button></Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary animate-float"><GraduationCap className="h-7 w-7" /></div>
                <p className="font-semibold text-foreground">No upcoming tests</p>
                <p className="mb-4 text-sm text-muted-foreground">Practice on your own while you wait.</p>
                <Link to="/assessment-choice"><Button variant="outline" size="sm">Practice Assessment</Button></Link>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Recent activity feed */}
        <motion.div variants={staggerItem}>
          <Card className="flex h-full min-h-[460px] flex-col p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
                <Trophy className="h-5 w-5 text-accent" /> Recent
              </h3>
              {recentTests.length > 0 && <Link to="/my-results" className="text-xs font-semibold text-primary hover:underline">View all</Link>}
            </div>
            {recentTests.length > 0 ? (
              <div className="flex flex-1 flex-col">
                <div className="-mr-2 flex-1 space-y-2 overflow-y-auto pr-2">
                  {recentTests.map((test) => {
                    const p = pctOf(test)
                    return (
                      <Link key={test.id} to={`/test-result/${test.id}`} className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-muted/50">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold tabular"
                          style={{ background: `hsl(var(--${scoreToken(p)}) / 0.15)`, color: `hsl(var(--${scoreToken(p)}))` }}>
                          {p}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{test.topic}</p>
                          <p className="text-xs text-muted-foreground">{new Date(test.date).toLocaleDateString()} · {test.difficulty}</p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
                {scores.length > 1 && (
                  <div className="pt-3">
                    <Sparkline data={scores} className="h-10 w-full" />
                    <p className="mt-1 text-center text-[11px] text-muted-foreground">Score trend</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><Trophy className="h-7 w-7" /></div>
                <p className="text-sm text-muted-foreground">Your completed tests will appear here.</p>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}

export default Dashboard
