"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Link } from "react-router-dom"
import type { User, TestResult } from "../types"
import Card from "../components/ui/Card"
import Button from "../components/ui/Button"
import StatTile from "../components/ui/StatTile"
import LoadingSpinner from "../components/ui/LoadingSpinner"

import api from "../utils/api"
import { ANIMATION_VARIANTS } from "../utils/constants"
import { BookOpen, Target, Award, Hash, ShieldCheck, Zap, Users, Database, Activity, Settings } from "lucide-react"

interface UserProfileProps {
  user: User
}

const UserProfile: React.FC<UserProfileProps> = ({ user }) => {
  const [testHistory, setTestHistory] = useState<TestResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [stats, setStats] = useState({
    averageScore: 0,
    totalAttempts: 0,
    topicsStudied: 0,
    bestScore: 0,
  })

  useEffect(() => {
    if (user?._id || user?.id) {
      fetchTestHistory()
    }
  }, [user?._id, user?.id])

  const fetchTestHistory = async () => {
    try {
      const userId = user._id || user.id
      setLoading(true)
      setError("")

      const response = await api.get(`/api/results/user/${userId}`)

      if (!response.data.success) {
        throw new Error(response.data.error || "Failed to fetch test history")
      }

      const results = response.data.results || []
      setTestHistory(results)

      // Calculate stats
      if (results.length > 0) {
        const totalScore = results.reduce(
          (sum: number, result: TestResult) => sum + (result.score / result.total_questions) * 100,
          0,
        )
        const averageScore = totalScore / results.length
        const bestScore = Math.max(
          ...results.map((result: TestResult) => (result.score / result.total_questions) * 100),
        )
        const uniqueTopics = new Set(results.map((result: TestResult) => result.topic))

        setStats({
          averageScore: Math.round(averageScore),
          totalAttempts: results.length,
          topicsStudied: uniqueTopics.size,
          bestScore: Math.round(bestScore),
        })
      } else {
        setStats({
          averageScore: 0,
          totalAttempts: 0,
          topicsStudied: 0,
          bestScore: 0,
        })
      }
    } catch (error: any) {
      console.error("Error fetching test history:", error)
      setError(error.response?.data?.detail || error.message || "Failed to fetch test history")
    } finally {
      setLoading(false)
    }
  }

  const isAdmin = user?.role === 'admin' || user?.is_admin;

  return (
    <div className="px-4 py-6 sm:px-6">
      <motion.div
        variants={ANIMATION_VARIANTS.fadeIn}
        initial="initial"
        animate="animate"
        className="max-w-6xl mx-auto"
      >
        {/* Profile Header */}
        <Card appearance="glass" hover={false} className="relative overflow-hidden p-7 sm:p-8 mb-8">
          <div className="aurora-mesh" />
          <motion.div variants={ANIMATION_VARIANTS.slideDown} className="relative z-10 flex items-center gap-6">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-2 border-primary/30 bg-gradient-to-br from-primary/20 to-accent/20">
              {user?.profile_picture ? (
                <img
                  src={user.profile_picture || "/placeholder.svg"}
                  alt="Profile"
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <svg className="h-12 w-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">{user?.name || user?.username || "User"}</h1>
                {isAdmin && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary border border-primary/30 flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    Administrator
                  </span>
                )}
              </div>
              <p className="truncate text-muted-foreground">{user?.email}</p>
            </div>
          </motion.div>
        </Card>

        {/* Stats / Quick Actions */}
        {!isAdmin ? (
          <motion.div
            variants={ANIMATION_VARIANTS.stagger}
            initial="initial"
            animate="animate"
            className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4"
          >
            <StatTile label="Total Attempts" value={stats.totalAttempts} icon={<BookOpen className="h-4 w-4" />} accent="primary" />
            <StatTile label="Average Score" value={stats.averageScore} suffix="%" icon={<Target className="h-4 w-4" />} accent="info" />
            <StatTile label="Best Score" value={stats.bestScore} suffix="%" icon={<Award className="h-4 w-4" />} accent="accent" />
            <StatTile label="Topics Studied" value={stats.topicsStudied} icon={<Hash className="h-4 w-4" />} accent="secondary" />
          </motion.div>
        ) : (
          <motion.div
            variants={ANIMATION_VARIANTS.stagger}
            initial="initial"
            animate="animate"
            className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4"
          >
            <Link to="/admin-dashboard" className="block transition-transform hover:-translate-y-1 duration-300">
              <StatTile label="User Management" value="Users" icon={<Users className="h-4 w-4" />} accent="primary" className="h-full cursor-pointer border hover:border-primary/50 transition-colors" />
            </Link>
            <Link to="/admin-dashboard" className="block transition-transform hover:-translate-y-1 duration-300">
              <StatTile label="Content Oversight" value="Content" icon={<Database className="h-4 w-4" />} accent="info" className="h-full cursor-pointer border hover:border-info/50 transition-colors" />
            </Link>
            <Link to="/admin-dashboard" className="block transition-transform hover:-translate-y-1 duration-300">
              <StatTile label="System Analytics" value="Analytics" icon={<Activity className="h-4 w-4" />} accent="accent" className="h-full cursor-pointer border hover:border-accent/50 transition-colors" />
            </Link>
            <Link to="/admin-dashboard" className="block transition-transform hover:-translate-y-1 duration-300">
              <StatTile label="Platform Settings" value="Settings" icon={<Settings className="h-4 w-4" />} accent="secondary" className="h-full cursor-pointer border hover:border-secondary/50 transition-colors" />
            </Link>
          </motion.div>
        )}

        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8`}>
          {/* Account Security Card */}
          <Card className="p-6 h-full flex flex-col">
            <motion.div variants={ANIMATION_VARIANTS.slideRight} className="flex-1 flex flex-col">
              <h3 className="text-xl font-semibold text-foreground mb-6">Account Security</h3>
              <p className="text-muted-foreground mb-4 flex-1">
                Manage your password and session settings. Face login has been removed for enhanced privacy.
              </p>
              <div className="flex gap-3 mt-auto">
                <Button variant="outline" onClick={() => window.alert("Navigate to password change flow")}>
                  Change Password
                </Button>
                <Button variant="primary" onClick={() => window.location.assign("/settings")}>
                  Open Settings
                </Button>
              </div>
            </motion.div>
          </Card>

          {/* Test History Section or Admin Privilege */}
          {!isAdmin ? (
            <Card className="p-6">
              <motion.div variants={ANIMATION_VARIANTS.slideRight}>
                <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center">
                  <span className="mr-2">📊</span>
                  Recent Test History
                </h3>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <LoadingSpinner text="Loading test history..." />
                  </div>
                ) : error ? (
                  <div className="text-center py-8">
                    <p className="text-red-400 mb-4">{error}</p>
                    <Button onClick={fetchTestHistory} variant="outline">
                      Retry
                    </Button>
                  </div>
                ) : testHistory.length === 0 ? (
                  <div className="text-center py-8 text-foreground">
                    <svg
                      className="w-16 h-16 mx-auto mb-4 text-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p className="mb-4">No test attempts yet</p>
                    <p className="text-muted-foreground text-sm">
                      Start your first assessment to see your progress here!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {testHistory.slice(0, 10).map((test, index) => (
                      <Link key={test.id} to={`/test-result/${test.id}`} className="block">
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="relative p-5 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-white/5 backdrop-blur-md hover:bg-white/10 hover:border-white/15 transition-all duration-500 cursor-pointer group overflow-hidden"
                        >
                          {/* Decorative glow background */}
                          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all duration-700"></div>
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-foreground font-medium group-hover:text-foreground-inverted transition-colors">
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
                                className={`text-xl font-black transition-all duration-400 ${
                                  (test.percentage || (test.score / test.total_questions) * 100) >= 80
                                    ? "text-emerald-400 filter drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                                    : (test.percentage || (test.score / test.total_questions) * 100) >= 60
                                      ? "text-amber-400 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]"
                                      : "text-rose-400 filter drop-shadow-[0_0_8px_rgba(251,113,133,0.4)]"
                                }`}
                              >
                                {Math.round(test.percentage || (test.score / test.total_questions) * 100)}%
                              </div>
                              <p className="text-muted-foreground text-sm">
                                {test.score}/{test.total_questions}
                              </p>
                              <p className="text-foreground text-xs mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                Click to view details →
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      </Link>
                    ))}
                  </div>
                )}
              </motion.div>
            </Card>
          ) : (
            <Card className="p-6 h-full relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
              <motion.div variants={ANIMATION_VARIANTS.slideRight} className="relative z-10 h-full flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                    <Zap className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">System Command Center</h3>
                </div>
                <div className="space-y-4 flex-1">
                  <p className="text-muted-foreground">
                    Your account holds administrative privileges. Navigate to the Admin Dashboard for a comprehensive view of system metrics, user interactions, and platform configurations.
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-2 mt-4 ml-1">
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary"></span> Manage roles and permissions</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-info"></span> Monitor platform engagement</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent"></span> Update global configuration</li>
                  </ul>
                </div>
                <div className="pt-6 mt-auto">
                  <Link to="/admin-dashboard" className="block">
                    <Button variant="primary" className="w-full shadow-[0_0_15px_rgba(var(--primary),0.3)] hover:shadow-[0_0_25px_rgba(var(--primary),0.5)] transition-shadow">
                      Launch Admin Dashboard
                    </Button>
                  </Link>
                </div>
              </motion.div>
            </Card>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default UserProfile
