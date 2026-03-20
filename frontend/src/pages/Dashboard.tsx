"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import type { TestResult } from "../types"
import { useTheme } from "../contexts/ThemeContext"
import { useToast } from "../contexts/ToastContext"
import { useAuth } from "../hooks/useAuth"
import Card from "../components/ui/Card"
import Button from "../components/ui/Button"
import PageShell from "../components/ui/PageShell"
import ErrorState from "../components/ErrorState"
import api from "../utils/api"
import { ANIMATION_VARIANTS } from "../utils/constants"


const Dashboard: React.FC = () => {
  const { user } = useAuth()
  console.log("📊 [DASHBOARD] Loading dashboard for user:", user?.email)

  const { } = useTheme()
  const { } = useToast()

  const [recentTests, setRecentTests] = useState<TestResult[]>([])
  const [upcomingTests, setUpcomingTests] = useState<any[]>([])
  const [activeSessions, setActiveSessions] = useState<any[]>([])
  const [error] = useState<string | null>(null)

  useEffect(() => {
    if (user?._id || user?.id) {
      console.log("📊 [DASHBOARD] Fetching analytics for user:", user.email)
      fetchRecentTests()
      fetchUpcomingTests()
      fetchActiveSessions()
    }
  }, [user?._id, user?.id])


  const fetchRecentTests = async () => {
    try {
      if (!user) return;
      console.log("🔄 [DASHBOARD] Starting fetchRecentTests...")
      const userId = user._id || user.id
      console.log("👤 [DASHBOARD] User ID:", userId)

      const url = `/api/results/user/${userId}`
      console.log("🌐 [DASHBOARD] Making recent tests API request to:", url)

      const startTime = Date.now()
      const response = await api.get(url)
      const endTime = Date.now()

      console.log("⏱️ [DASHBOARD] Recent tests request completed in:", endTime - startTime, "ms")
      console.log("📥 [DASHBOARD] Response status:", response.status)
      console.log("📥 [DASHBOARD] Response data:", response.data)

      if (response.data.success) {
        const results = response.data.results || []
        console.log("📋 [DASHBOARD] Number of results received:", results.length)
        console.log("📋 [DASHBOARD] Results:", results)

        const recentTests = results.slice(0, 5) // Show last 5 tests
        console.log("📋 [DASHBOARD] Setting recent tests:", recentTests)
        setRecentTests(recentTests)
      } else {
        console.error("❌ [DASHBOARD] Recent tests API returned success: false")
        throw new Error(response.data.error || "Failed to fetch recent tests")
      }

      console.log("✅ [DASHBOARD] fetchRecentTests completed successfully")
    } catch (error: any) {
      console.error("❌ [DASHBOARD] Error in fetchRecentTests:", error)
      console.error("❌ [DASHBOARD] Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        config: error.config,
      })

      // Don't set error for recent tests, just log it
      console.log("⚠️ [DASHBOARD] Recent tests failed, but continuing...")
    }
  }

  const fetchUpcomingTests = async () => {
    try {
      console.log("📊 [DASHBOARD] Fetching upcoming tests for user:", user?.email)
      console.log("👤 [DASHBOARD] User ID:", user?.id)
      console.log("🌐 [DASHBOARD] Making upcoming tests API request to: /api/assessments/student/upcoming")

      // Fetch upcoming assessments for the student
      const response = await api.get("/api/assessments/student/upcoming")

      console.log("📊 [DASHBOARD] Upcoming tests response:", response.data)
      console.log("📊 [DASHBOARD] Response status:", response.status)
      console.log("📊 [DASHBOARD] Response headers:", response.headers)

      const upcomingAssessments = response.data || []
      console.log("📋 [DASHBOARD] Number of upcoming assessments:", upcomingAssessments.length)
      console.log("📋 [DASHBOARD] Upcoming assessments:", upcomingAssessments)

      setUpcomingTests(upcomingAssessments)
      console.log("✅ [DASHBOARD] fetchUpcomingTests completed successfully")
    } catch (error: any) {
      console.error("❌ [DASHBOARD] Error in fetchUpcomingTests:", error)
      console.error("❌ [DASHBOARD] Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        config: error.config,
      })
      setUpcomingTests([])
    }
  }

  const fetchActiveSessions = async () => {
    try {
      if (!user) return
      const response = await api.get("/api/sessions/active-for-student")
      if (response.data && response.data.active_sessions) {
        console.log("🔴 [DASHBOARD] Active Sessions:", response.data.active_sessions)
        setActiveSessions(response.data.active_sessions)
      }
    } catch (error) {
      console.error("Failed to fetch active sessions", error)
    }
  }

  // Poll for active sessions and notifications (Real-time-ish updates)
  useEffect(() => {
    if (!user) return

    fetchActiveSessions()
    const interval = setInterval(fetchActiveSessions, 5000) // Check every 5 seconds

    return () => clearInterval(interval)
  }, [user])



  return (
    <PageShell
      title={`Welcome back, ${user?.username || user?.name || (user?.email ? user.email.split('@')[0] : "Learner")}!`}
      subtitle="Ready to continue your learning journey?"
    >
      <div className="relative z-10">
        <motion.div
          variants={ANIMATION_VARIANTS.fadeIn}
          initial="initial"
          animate="animate"
          className="max-w-7xl mx-auto"
        >
          <div className="mb-8">
            {/* Action Cards */}
            <motion.div
              variants={ANIMATION_VARIANTS.stagger}
              initial="initial"
              animate="animate"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
            >

              {/* JOIN LIVE CLASS - DYNAMIC SECTION */}
              {activeSessions.length > 0 && activeSessions.map((session, idx) => (
                <motion.div key={idx} variants={ANIMATION_VARIANTS.slideUp}>
                  <Card className="p-7 h-full border-destructive/20 bg-destructive/10 backdrop-blur-md overflow-hidden relative group">
                    {/* Background animated blob */}
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-destructive/20 rounded-full blur-3xl group-hover:bg-destructive/30 transition-all duration-700"></div>

                    <div className="flex items-center mb-6 relative z-10">
                      <div className="w-12 h-12 rounded-2xl bg-destructive text-destructive-foreground shadow-lg shadow-destructive/50 flex items-center justify-center mr-4 animate-pulse">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold font-heading text-destructive dark:text-red-400">Join Live Class</h3>
                        <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded bg-destructive text-white animate-pulse tracking-widest uppercase">LIVE NOW</span>
                      </div>
                    </div>
                    <p className="text-foreground/80 mb-6 leading-relaxed relative z-10 font-medium">
                      <span className="font-bold">{session.batch_name}</span> is currently live! Join the session to interact with your instructor.
                    </p>
                    <div className="flex flex-col gap-3 relative z-10">
                      <div className="text-xs text-destructive/70 dark:text-red-300/70 font-mono tracking-widest mb-1 font-semibold">PASSCODE: {session.session_code}</div>
                      <Link to={`/student/live/${session.batch_id}`}>
                        <Button className="w-full bg-destructive text-white hover:bg-destructive/90 shadow-lg shadow-destructive/40 border-none h-12">
                          JOIN SESSION
                        </Button>
                      </Link>
                    </div>
                  </Card>
                </motion.div>
              ))}

              <motion.div variants={ANIMATION_VARIANTS.slideUp}>
                <Card className="p-7 h-full group">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-700"></div>

                  <div className="flex items-center mb-6 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-glow-indigo text-white flex items-center justify-center mr-4 group-hover:scale-105 transition-transform">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold font-heading text-foreground">Start Assessment</h3>
                  </div>
                  <p className="text-muted-foreground mb-8 leading-relaxed relative z-10">
                    Choose between MCQ assessments or coding challenges. Both are powered by AI with personalized difficulty adaptation.
                  </p>
                  <Link to="/assessment-choice" className="relative z-10">
                    <Button variant="primary" className="w-full">
                      Choose Assessment
                    </Button>
                  </Link>
                </Card>
              </motion.div>

              <motion.div variants={ANIMATION_VARIANTS.slideUp}>
                <Card className="p-7 h-full group border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-900/10 backdrop-blur-md overflow-hidden relative">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all duration-700"></div>

                  <div className="flex items-center mb-6 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30 text-white flex items-center justify-center mr-4 group-hover:scale-105 transition-transform">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold font-heading text-indigo-900 dark:text-indigo-100">ThinkTrace Interview</h3>
                  </div>
                  <p className="text-muted-foreground mb-8 leading-relaxed relative z-10">
                    Test your thinking process, not just your knowledge, in an adaptive AI conversation.
                  </p>
                  <Link to="/thinktrace" state={{ topic: "Programming Fundamentals", difficulty: "medium", subject_area: "Computer Science", question_count: 5 }} className="relative z-10 flex h-full items-end pb-1 pb-1">
                    <Button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white border-none shadow-lg shadow-indigo-500/25">
                      Launch Session
                    </Button>
                  </Link>
                </Card>
              </motion.div>


              <motion.div variants={ANIMATION_VARIANTS.slideRight}>
                <Card className="p-7 h-full group">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-secondary/10 rounded-full blur-3xl group-hover:bg-secondary/20 transition-all duration-700"></div>

                  <div className="flex items-center mb-6 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-secondary to-pink-500 shadow-lg text-white flex items-center justify-center mr-4 group-hover:scale-105 transition-transform">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold font-heading text-foreground">Student Profile</h3>
                  </div>
                  <p className="text-muted-foreground mb-8 leading-relaxed relative z-10">
                    Manage your account settings, review your learning journey, and analyze your performance statistics.
                  </p>
                  <Link to="/profile" className="relative z-10">
                    <Button variant="secondary" className="w-full dark:bg-white/10 dark:hover:bg-white/20">
                      Go to Profile
                    </Button>
                  </Link>
                </Card>
              </motion.div>
            </motion.div>



            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8">
                <ErrorState
                  title="Dashboard Error"
                  message={error}
                  onRetry={() => window.location.reload()}
                  retryText="Retry"
                  showCard={false}
                />
              </motion.div>
            )}

            {/* Upcoming Tests */}
            <motion.div
              variants={ANIMATION_VARIANTS.slideUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.4 }}
              className="mb-8"
            >
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center">
                  <span className="mr-2">📅</span>
                  Upcoming Tests
                </h3>
                {upcomingTests.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingTests.map((test, index) => (
                      <motion.div
                        key={test.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-4 rounded-lg bg-muted/20 border border-muted/30 hover:bg-muted/30 hover:border-muted/50 transition-all duration-300 cursor-pointer group"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-foreground font-medium group-hover:text-foreground/80 transition-colors">
                              {test.title}
                            </p>
                            <p className="text-muted-foreground text-sm">
                              {test.subject} • {test.difficulty} • {test.time_limit} minutes
                            </p>
                            <p className="text-muted-foreground text-sm mt-1">
                              {test.question_count} questions
                            </p>
                            {test.teacher_name && (
                              <p className="text-muted-foreground text-xs mt-1">
                                By: {test.teacher_name}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <Link to={`/test/${test.id}`}>
                              <Button variant="primary" size="sm">
                                Start Test
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">📚</div>
                    <h4 className="text-lg font-semibold text-foreground mb-2">No Upcoming Tests</h4>
                    <p className="text-muted-foreground mb-4">
                      You don't have any tests scheduled at the moment. Check back later or ask your teacher about upcoming assessments.
                    </p>
                    <div className="flex justify-center space-x-3">
                      <Link to="/assessment-choice">
                        <Button variant="outline" size="sm">
                          Practice Assessment
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.location.reload()}
                      >
                        Refresh
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>

            {/* Recent Test History */}
            {recentTests.length > 0 && (
              <motion.div
                variants={ANIMATION_VARIANTS.slideUp}
                initial="initial"
                animate="animate"
                transition={{ delay: 0.5 }}
                className="mb-8"
              >
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center">
                    <span className="mr-2">📊</span>
                    Recent Tests
                  </h3>
                  <div className="space-y-3">
                    {recentTests.map((test, index) => (
                      <Link key={test.id} to={`/test-result/${test.id}`} className="block">
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="p-4 rounded-lg bg-muted/20 border border-muted/30 hover:bg-muted/30 hover:border-muted/50 transition-all duration-300 cursor-pointer group"
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-foreground font-medium group-hover:text-foreground/80 transition-colors">
                                {test.topic}
                              </p>
                              <p className="text-muted-foreground text-sm">
                                {new Date(test.date).toLocaleDateString()} • {test.difficulty}
                                {test.time_taken && (
                                  <span className="ml-2">
                                    • {Math.floor(test.time_taken / 60)}:
                                    {(test.time_taken % 60).toString().padStart(2, "0")}
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="text-right">
                              <div
                                className={`text-lg font-bold ${(test.percentage || (test.score / test.total_questions) * 100) >= 80
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : (test.percentage || (test.score / test.total_questions) * 100) >= 60
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-rose-600 dark:text-rose-400"
                                  }`}
                              >
                                {Math.round(test.percentage || (test.score / test.total_questions) * 100)}%
                              </div>
                              <p className="text-muted-foreground text-sm">
                                {test.score}/{test.total_questions}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      </Link>
                    ))}
                  </div>
                  <div className="text-center mt-4">
                    <Link to="/profile">
                      <Button variant="outline" size="sm">
                        View All Tests
                      </Button>
                    </Link>
                  </div>
                </Card>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </PageShell>
  )
}

export default Dashboard
