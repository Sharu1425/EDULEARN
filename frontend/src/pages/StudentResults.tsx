"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Link, useLocation } from "react-router-dom"
import type { TestResult } from "../types"
import { useAuth } from "../hooks/useAuth"
import Card from "../components/ui/Card"
import Button from "../components/ui/Button"
import PageShell from "../components/ui/PageShell"
import ErrorState from "../components/ErrorState"
import LoadingSpinner from "../components/ui/LoadingSpinner"
import api from "../utils/api"
import { ANIMATION_VARIANTS } from "../utils/constants"
import { Award, Target, BookOpen, Clock, Brain, Code2 } from "lucide-react"

type Tab = "mcq" | "thinktrace" | "coding"

interface ThinkTraceSession {
  id: string
  topic: string
  difficulty: string
  status: string
  skill_score: number | null
  questions_answered: number
  total_questions: number
  created_at: string
}

const StudentResults: React.FC = () => {
  const { user } = useAuth()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState<Tab>(location.state?.activeTab || "mcq")

  // MCQ data
  const [mcqResults, setMcqResults] = useState<TestResult[]>([])
  const [mcqLoading, setMcqLoading] = useState(true)
  const [mcqError, setMcqError] = useState<string | null>(null)

  // ThinkTrace data
  const [ttSessions, setTtSessions] = useState<ThinkTraceSession[]>([])
  const [ttLoading, setTtLoading] = useState(true)
  const [ttError, setTtError] = useState<string | null>(null)
  // Coding data
  const [codingResults, setCodingResults] = useState<any[]>([])
  const [codingLoading, setCodingLoading] = useState(true)
  const [codingError, setCodingError] = useState<string | null>(null)

  // Stats (MCQ-based)
  const [stats, setStats] = useState({ averageScore: 0, totalAttempts: 0, topicsStudied: 0, bestScore: 0 })

  useEffect(() => {
    if (user?._id || user?.id) {
      fetchMcqResults()
      fetchThinkTraceSessions()
      fetchCodingHistory()
    }
  }, [user?._id, user?.id])

  const fetchMcqResults = async () => {
    try {
      const userId = user?._id || user?.id
      if (!userId) return
      setMcqLoading(true)
      setMcqError(null)
      const response = await api.get(`/api/results/user/${userId}`)
      if (response.data.success) {
        const results = response.data.results || []
        setMcqResults(results)
        if (results.length > 0) {
          const validResults = results.filter((r: TestResult) => r.total_questions > 0);
          
          const totalScore = validResults.reduce((sum: number, r: TestResult) => sum + (r.score / r.total_questions) * 100, 0);
          const uniqueTopics = new Set(results.map((r: TestResult) => r.topic));
          
          const scores = validResults.map((r: TestResult) => (r.score / r.total_questions) * 100);
          const best = scores.length > 0 ? Math.max(...scores) : 0;
          
          setStats({
            averageScore: validResults.length > 0 ? Math.round(totalScore / validResults.length) : 0,
            totalAttempts: results.length,
            topicsStudied: uniqueTopics.size,
            bestScore: Math.round(best),
          });
        }
      } else {
        throw new Error(response.data.error || "Failed to fetch results")
      }
    } catch (err: any) {
      setMcqError(err.response?.data?.detail || err.message || "Failed to fetch MCQ results")
    } finally {
      setMcqLoading(false)
    }
  }

  const fetchThinkTraceSessions = async () => {
    try {
      setTtLoading(true)
      setTtError(null)
      const response = await api.get("/api/thinktrace/user/sessions")
      setTtSessions(Array.isArray(response.data) ? response.data : [])
    } catch (err: any) {
      setTtError(err.response?.data?.detail || err.message || "Failed to fetch ThinkTrace sessions")
    } finally {
      setTtLoading(false)
    }
  }

  const fetchCodingHistory = async () => {
    try {
      setCodingLoading(true)
      setCodingError(null)
      const response = await api.get("/api/coding/submissions/user")
      if (response.data.success) {
        setCodingResults(response.data.submissions || [])
      }
    } catch (err: any) {
      setCodingError(err.response?.data?.detail || err.message || "Failed to fetch coding history")
    } finally {
      setCodingLoading(false)
    }
  }

  const tabs = [
    { id: "mcq" as Tab, label: "MCQ Assessment", icon: <BookOpen className="w-4 h-4" />, count: mcqResults.length },
    { id: "thinktrace" as Tab, label: "ThinkTrace", icon: <Brain className="w-4 h-4" />, count: ttSessions.length },
    { id: "coding" as Tab, label: "Coding", icon: <Code2 className="w-4 h-4" />, count: codingResults.length },
  ]

  const statCards = [
    { title: "Total Attempts", value: stats.totalAttempts, icon: <BookOpen className="w-6 h-6" />, color: "from-blue-500 to-indigo-500" },
    { title: "Average Score", value: `${stats.averageScore}%`, icon: <Target className="w-6 h-6" />, color: "from-primary to-accent" },
    { title: "Best Score", value: `${stats.bestScore}%`, icon: <Award className="w-6 h-6" />, color: "from-amber-400 to-orange-500" },
    { title: "Topics Studied", value: stats.topicsStudied, icon: <Clock className="w-6 h-6" />, color: "from-emerald-400 to-teal-500" },
  ]

  const getScoreStyle = (pct: number) =>
    pct >= 80 ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
      : pct >= 60 ? "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20"
        : "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20"

  return (
    <PageShell title="My Results" subtitle="Track your assessment progress and review past performances">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Stats Grid */}
        <motion.div
          variants={ANIMATION_VARIANTS.stagger}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
        >
          {statCards.map((stat, index) => (
            <motion.div key={stat.title} variants={ANIMATION_VARIANTS.slideUp} transition={{ delay: index * 0.1 }}>
              <Card className="p-6 text-center group h-full transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center mx-auto mb-4 text-white shadow-lg group-hover:scale-110 transition-transform`}>
                  {stat.icon}
                </div>
                <h3 className="text-3xl font-bold font-heading text-foreground mb-1">{stat.value}</h3>
                <p className="text-muted-foreground text-sm font-medium">{stat.title}</p>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Tab Bar */}
        <motion.div variants={ANIMATION_VARIANTS.slideUp} initial="initial" animate="animate" transition={{ delay: 0.2 }}>
          <Card className="p-1.5 bg-muted/30 border border-border/50">
            <div className="flex gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium text-sm transition-all duration-300 ${
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                    activeTab === tab.id ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* ───────────── MCQ TAB ───────────── */}
          {activeTab === "mcq" && (
            <Card className="p-6">
              <h3 className="text-xl font-bold font-heading text-foreground mb-6 flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-primary" />
                MCQ Assessment History
              </h3>

              {mcqLoading ? (
                <div className="flex justify-center py-16"><LoadingSpinner size="lg" text="Loading MCQ results..." /></div>
              ) : mcqError ? (
                <ErrorState title="Failed to Load" message={mcqError} onRetry={fetchMcqResults} retryText="Retry" />
              ) : mcqResults.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">📚</div>
                  <h4 className="text-lg font-semibold text-foreground mb-2">No MCQ tests completed yet</h4>
                  <p className="text-muted-foreground mb-6">Complete a MCQ assessment to see your results here.</p>
                  <Link to="/assessment-choice">
                    <Button variant="primary">Start MCQ Assessment</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {mcqResults.map((test, index) => {
                    const percentage = test.percentage || (test.score / test.total_questions) * 100
                    return (
                      <Link key={test.id} to={`/test-result/${test.id}`} className="block">
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.04 }}
                          className="p-5 rounded-xl bg-card border border-border/50 hover:bg-muted/30 hover:shadow-md transition-all duration-300 group flex items-center justify-between"
                        >
                          <div className="flex-1 min-w-0 pr-4">
                            <h4 className="text-base font-semibold text-foreground truncate group-hover:text-primary transition-colors">{test.topic}</h4>
                            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{new Date(test.date).toLocaleDateString()}</span>
                              <span className="w-1 h-1 rounded-full bg-border" />
                              <span className="capitalize">{test.difficulty || "Standard"}</span>
                              {(test.time_taken !== undefined && test.time_taken > 0) && (<><span className="w-1 h-1 rounded-full bg-border" /><span>{Math.floor(test.time_taken / 60)}:{(test.time_taken % 60).toString().padStart(2, "0")}s</span></>)}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 shrink-0">
                            <div className="text-right hidden sm:block">
                              <p className="text-sm font-medium text-foreground">{test.score} / {test.total_questions}</p>
                              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Correct</p>
                            </div>
                            <div className={`flex items-center justify-center w-16 h-16 rounded-xl border ${getScoreStyle(percentage)}`}>
                              <span className="text-xl font-bold">{Math.round(percentage)}%</span>
                            </div>
                          </div>
                        </motion.div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </Card>
          )}

          {/* ───────────── THINKTRACE TAB ───────────── */}
          {activeTab === "thinktrace" && (
            <Card className="p-6">
              <h3 className="text-xl font-bold font-heading text-foreground mb-6 flex items-center gap-2">
                <Brain className="w-6 h-6 text-violet-500" />
                ThinkTrace Session History
              </h3>

              {ttLoading ? (
                <div className="flex justify-center py-16"><LoadingSpinner size="lg" text="Loading ThinkTrace sessions..." /></div>
              ) : ttError ? (
                <ErrorState title="Failed to Load" message={ttError} onRetry={fetchThinkTraceSessions} retryText="Retry" />
              ) : ttSessions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-violet-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">🧠</div>
                  <h4 className="text-lg font-semibold text-foreground mb-2">No ThinkTrace sessions yet</h4>
                  <p className="text-muted-foreground mb-6">Complete a ThinkTrace interview to see your cognitive profile here.</p>
                  <Link to="/assessment-choice">
                    <Button variant="primary" className="!bg-gradient-to-r !from-violet-600 !to-purple-600">Start ThinkTrace</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {ttSessions.map((session, index) => {
                    const score = session.skill_score !== null ? Math.round(session.skill_score) : null
                    const isCompleted = session.status === "completed"
                    return (
                      <Link key={session.id} to={`/thinktrace-result/${session.id}`} className="block">
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.04 }}
                          className="p-5 rounded-xl bg-card border border-border/50 hover:bg-muted/30 hover:shadow-md transition-all duration-300 flex items-center justify-between"
                        >
                          <div className="flex-1 min-w-0 pr-4">
                            <h4 className="text-base font-semibold text-foreground truncate hover:text-primary transition-colors">{session.topic}</h4>
                            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{new Date(session.created_at).toLocaleDateString()}</span>
                              <span className="w-1 h-1 rounded-full bg-border" />
                              <span className="capitalize">{session.difficulty}</span>
                              <span className="w-1 h-1 rounded-full bg-border" />
                              <span>{session.questions_answered}/{session.total_questions} questions</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className={`text-xs px-2 py-1 rounded-full font-semibold border ${
                              isCompleted ? "text-green-500 bg-green-500/10 border-green-500/20" : "text-amber-500 bg-amber-500/10 border-amber-500/20"
                            }`}>
                              {isCompleted ? "Completed" : "In Progress"}
                            </span>
                            {score !== null ? (
                              <div className={`flex items-center justify-center w-16 h-16 rounded-xl border ${getScoreStyle(score)}`}>
                                <span className="text-xl font-bold">{score}%</span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center w-16 h-16 rounded-xl border border-border/40 bg-muted/20 text-muted-foreground text-sm font-medium">
                                —
                              </div>
                            )}
                          </div>
                        </motion.div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </Card>
          )}

          {/* ───────────── CODING TAB ───────────── */}
          {activeTab === "coding" && (
            <Card className="p-6">
              <h3 className="text-xl font-bold font-heading text-foreground mb-6 flex items-center gap-2">
                <Code2 className="w-6 h-6 text-blue-500" />
                Coding Challenge History
              </h3>

              {codingLoading ? (
                <div className="flex justify-center py-16"><LoadingSpinner size="lg" text="Loading coding history..." /></div>
              ) : codingError ? (
                <ErrorState title="Failed to Load" message={codingError} onRetry={fetchCodingHistory} retryText="Retry" />
              ) : codingResults.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">💻</div>
                  <h4 className="text-lg font-semibold text-foreground mb-2">No coding challenges yet</h4>
                  <p className="text-muted-foreground mb-6">Solve a coding problem to see your results here.</p>
                  <Link to="/coding">
                    <Button variant="primary" className="!bg-gradient-to-r !from-blue-600 !to-cyan-600">Browse Coding problems</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {codingResults.map((sol, index) => {
                    const isAccepted = sol.status === "accepted"
                    const statusText = sol.status.replace(/_/g, " ").toUpperCase()
                    
                    return (
                      <Link key={sol.id} to={`/coding-results`} state={{ ...sol, isHistory: true }} className="block">
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.04 }}
                          className="p-5 rounded-xl bg-card border border-border/50 hover:bg-muted/30 hover:shadow-md transition-all duration-300 flex items-center justify-between"
                        >
                          <div className="flex-1 min-w-0 pr-4">
                            <h4 className="text-base font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                              {sol.problem_title}
                            </h4>
                            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {new Date(sol.submitted_at).toLocaleDateString()}
                              </span>
                              <span className="w-1 h-1 rounded-full bg-border" />
                              <span className="capitalize">{sol.problem_difficulty}</span>
                              <span className="w-1 h-1 rounded-full bg-border" />
                              <span>{sol.language}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 shrink-0">
                            <div className="text-right hidden sm:block">
                              <p className={`text-xs font-bold uppercase tracking-wider ${
                                isAccepted ? "text-green-500" : "text-red-500"
                              }`}>
                                {statusText}
                              </p>
                              <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                                Attempt {sol.attempts}
                              </p>
                            </div>
                            <div className={`flex items-center justify-center w-12 h-12 rounded-lg border ${
                              isAccepted 
                                ? "text-green-600 dark:text-green-400 bg-green-500/10 border-green-500/20" 
                                : "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20"
                            }`}>
                              {isAccepted ? "✓" : "✗"}
                            </div>
                          </div>
                        </motion.div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </Card>
          )}
        </motion.div>
      </div>
    </PageShell>
  )
}

export default StudentResults
