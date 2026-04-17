"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Link } from "react-router-dom"
import type { User, TestResult } from "../types"
import Card from "../components/ui/Card"
import Button from "../components/ui/Button"
import LoadingSpinner from "../components/ui/LoadingSpinner"

import api from "../utils/api"
import { ANIMATION_VARIANTS } from "../utils/constants"

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

  const statCards = [
    {
      title: "Total Attempts",
      value: stats.totalAttempts,
      icon: "📊",
      color: "from-blue-500 to-cyan-500",
    },
    {
      title: "Average Score",
      value: `${stats.averageScore}%`,
      icon: "📈",
      color: "from-blue-500 to-cyan-500",
    },
    {
      title: "Best Score",
      value: `${stats.bestScore}%`,
      icon: "🏆",
      color: "from-yellow-500 to-orange-500",
    },
    {
      title: "Topics Studied",
      value: stats.topicsStudied,
      icon: "📚",
      color: "from-green-500 to-teal-500",
    },
  ]

  return (
    <div className="min-h-screen pt-20 px-4">
      <motion.div
        variants={ANIMATION_VARIANTS.fadeIn}
        initial="initial"
        animate="animate"
        className="max-w-6xl mx-auto"
      >
        {/* Profile Header */}
        <Card className="p-8 mb-8">
          <motion.div variants={ANIMATION_VARIANTS.slideDown} className="flex items-center space-x-6 mb-8">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border-2 border-primary/30 flex items-center justify-center">
              {user?.profile_picture ? (
                <img
                  src={user.profile_picture || "/placeholder.svg"}
                  alt="Profile"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">{user?.name || user?.username || "User"}</h1>
              <p className="text-muted-foreground text-lg">{user?.email}</p>
              <div className="flex items-center mt-2 space-x-4"></div>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            variants={ANIMATION_VARIANTS.stagger}
            initial="initial"
            animate="animate"
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {statCards.map((stat, index) => (
              <motion.div key={stat.title} variants={ANIMATION_VARIANTS.slideUp} transition={{ delay: index * 0.1 }}>
                <Card className="p-4 text-center" hover={true}>
                  <div
                    className={`w-10 h-10 rounded-full bg-gradient-to-r ${stat.color} flex items-center justify-center mx-auto mb-3 text-white text-lg`}
                  >
                    {stat.icon}
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-1">
                    {loading ? <LoadingSpinner size="sm" /> : stat.value}
                  </h3>
                  <p className="text-muted-foreground text-sm">{stat.title}</p>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Account Security Card */}
          <Card className="p-6">
            <motion.div variants={ANIMATION_VARIANTS.slideRight}>
              <h3 className="text-xl font-semibold text-foreground mb-6">Account Security</h3>
              <p className="text-muted-foreground mb-4">
                Manage your password and session settings. Face login has been removed for enhanced privacy.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => window.alert("Navigate to password change flow")}>
                  Change Password
                </Button>
                <Button variant="primary" onClick={() => window.location.assign("/settings")}>
                  Open Settings
                </Button>
              </div>
            </motion.div>
          </Card>

          {/* Test History Section */}
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
        </div>
      </motion.div>
    </div>
  )
}

export default UserProfile
