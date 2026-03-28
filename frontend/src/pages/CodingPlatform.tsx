"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import type { User, CodingProblem, CodingAnalytics } from "../types"
import { useToast } from "../contexts/ToastContext"
import { useAuth } from "../hooks/useAuth"
import Card from "../components/ui/Card"
import Button from "../components/ui/Button"
import LoadingSpinner from "../components/ui/LoadingSpinner"
import api from "../utils/api"
import { ANIMATION_VARIANTS } from "../utils/constants"

interface CodingPlatformProps {
  user?: User
}

const CodingPlatform: React.FC<CodingPlatformProps> = ({ user: propUser }) => {
  const { user: authUser } = useAuth()
  const navigate = useNavigate()
  const { success, error: showError } = useToast()

  // Use prop user or auth user
  const user = propUser || authUser

  // Debug user authentication
  console.log("🔐 [CODING_PLATFORM] User authentication status:", {
    propUser: propUser,
    authUser: authUser,
    finalUser: user,
    isAuthenticated: !!user,
    userId: user?.id || user?._id,
    userRole: user?.role,
  })

  const [analytics, setAnalytics] = useState<CodingAnalytics | null>(null)
  const [recentProblems, setRecentProblems] = useState<CodingProblem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTopic, setSelectedTopic] = useState<string>("")
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("")

  const popularTopics = [
    "Arrays",
    "Strings",
    "Linked Lists",
    "Trees",
    "Graphs",
    "Dynamic Programming",
    "Machine Learning",
    "Web Development",
    "Python Programming",
    "JavaScript",
  ]

  const allTopics = [
    "Arrays",
    "Strings",
    "Linked Lists",
    "Trees",
    "Graphs",
    "Dynamic Programming",
    "Sorting",
    "Searching",
    "Hash Tables",
    "Stack & Queue",
    "Greedy",
    "Backtracking",
    "Machine Learning",
    "Web Development",
    "Data Structures",
    "Algorithms",
    "Python Programming",
    "JavaScript",
    "Database Design",
    "System Design",
    "Object-Oriented Programming",
    "Functional Programming",
  ]

  const difficulties = ["easy", "medium", "hard"]

  const fetchAnalytics = async () => {
    try {
      const response = await api.get("/api/coding/analytics")
      if (response.data.success) {
        setAnalytics(response.data.analytics)
      }
    } catch (error) {
      console.error("Error fetching coding analytics:", error)
    }
  }

  const fetchRecentProblems = async () => {
    try {
      console.log("🔄 [CODING_PLATFORM] Fetching recent problems...")
      const response = await api.get("/api/coding/problems?limit=6")
      console.log("✅ [CODING_PLATFORM] Recent problems response:", response.data)
      if (response.data.success) {
        setRecentProblems(response.data.problems)
      }
    } catch (error: any) {
      console.error("❌ [CODING_PLATFORM] Error fetching recent problems:", error)
      console.error("❌ [CODING_PLATFORM] Error details:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      })
      // If no problems exist, show empty state instead of error
      if (error.response?.status === 404 || error.response?.status === 500) {
        setRecentProblems([])
      }
    } finally {
      setLoading(false)
    }
  }

  const generateProblem = async () => {
    if (!user) {
      showError("Please log in to generate problems")
      return
    }

    if (!selectedTopic || !selectedDifficulty) {
      showError("Please select a topic and difficulty")
      return
    }

    setLoading(true)
    try {
      // Generate unique problem with timestamp and user-specific parameters
      const response = await api.post("/api/coding/problems/generate", {
        topic: selectedTopic,
        difficulty: selectedDifficulty,
        user_skill_level: analytics?.skill_level || "intermediate",
        focus_areas: [selectedTopic], // Focus on the selected topic
        avoid_topics: analytics?.weak_topics || [], // Avoid weak areas
        timestamp: Date.now(), // Ensure uniqueness
        user_id: user?.id, // User-specific generation
        session_id: Math.random().toString(36).substring(7), // Session uniqueness
      })

      if (response.data.success) {
        success("🎉 New unique problem generated successfully!")
        // Navigate to the problem
        window.location.href = `/coding/problem/${response.data.problem.id}`
      }
    } catch (error: any) {
      console.error("Error generating problem:", error)
      const errorMessage =
        error.response?.data?.detail || error.message || "Failed to generate problem. Please try again."
      showError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    const colors = {
      easy: "text-green-400 bg-green-400/10 border-green-400/30",
      medium: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
      hard: "text-red-400 bg-red-400/10 border-red-400/30",
    }
    return colors[difficulty as keyof typeof colors] || colors.medium
  }

  const getStatusColor = (status: string) => {
    const colors = {
      accepted: "text-green-400",
      wrong_answer: "text-red-400",
      time_limit_exceeded: "text-yellow-400",
      runtime_error: "text-orange-400",
      compilation_error: "text-purple-400",
    }
    return colors[status as keyof typeof colors] || "text-gray-400"
  }

  useEffect(() => {
    if (user) {
      fetchAnalytics()
      fetchRecentProblems()
    }
  }, [user])

  if (!user) {
    return (
      <div className="min-h-screen pt-20 px-4">
        <div className="max-w-7xl mx-auto">
          <Card className="p-8 text-center">
            <LoadingSpinner size="lg" />
            <p className="text-muted-foreground mt-4">Loading coding platform...</p>
          </Card>
        </div>
      </div>
    )
  }

  if (loading && !analytics) {
    return (
      <div className="min-h-screen pt-20 px-4 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading coding platform..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-20 px-4">
      <motion.div
        variants={ANIMATION_VARIANTS.fadeIn}
        initial="initial"
        animate="animate"
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <Card className="p-8 mb-8">
          <motion.div variants={ANIMATION_VARIANTS.slideDown} className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">AI Coding Platform</h1>
            <p className="text-muted-foreground text-lg">
              Master coding with AI-powered problems, real-time feedback, and personalized learning
            </p>
          </motion.div>

          {/* Analytics Overview */}
          {analytics && (
            <motion.div variants={ANIMATION_VARIANTS.stagger} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <motion.div variants={ANIMATION_VARIANTS.slideUp}>
                <Card className="p-6 text-center !bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/80 dark:to-green-800/80 !border-green-300 dark:!border-green-500 !border-2">
                  <div className="text-3xl font-extrabold text-green-700 dark:text-green-100 mb-2">{analytics.total_problems_solved}</div>
                  <div className="text-sm font-semibold text-green-800 dark:text-green-200">Problems Solved</div>
                </Card>
              </motion.div>

              <motion.div variants={ANIMATION_VARIANTS.slideUp}>
                <Card className="p-6 text-center !bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/80 dark:to-blue-800/80 !border-blue-300 dark:!border-blue-500 !border-2">
                  <div className="text-3xl font-extrabold text-blue-700 dark:text-blue-100 mb-2">{Math.round(analytics.success_rate)}%</div>
                  <div className="text-sm font-semibold text-blue-800 dark:text-blue-200">Success Rate</div>
                </Card>
              </motion.div>

              <motion.div variants={ANIMATION_VARIANTS.slideUp}>
                <Card className="p-6 text-center !bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/80 dark:to-purple-800/80 !border-purple-300 dark:!border-purple-500 !border-2">
                  <div className="text-3xl font-extrabold text-purple-700 dark:text-purple-100 mb-2">{analytics.total_problems_attempted || 0}</div>
                  <div className="text-sm font-semibold text-purple-800 dark:text-purple-200">Total Attempted</div>
                </Card>
              </motion.div>
            </motion.div>
          )}

          {/* Problem Generation */}
          <motion.div
            variants={ANIMATION_VARIANTS.slideUp}
            className="bg-muted/20 rounded-lg p-6 mb-8 border border-border"
          >
            <h3 className="text-xl font-semibold text-foreground mb-4"> Generate AI-Powered Problem</h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="flex flex-col">
                <label className="block text-sm font-medium text-muted-foreground mb-2">Select Topic</label>
                <select
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select Topic</option>
                  <optgroup label=" Popular Topics">
                    {popularTopics.map((topic) => (
                      <option key={topic} value={topic}>
                        {topic}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label=" All Topics">
                    {allTopics
                      .filter((topic) => !popularTopics.includes(topic))
                      .map((topic) => (
                        <option key={topic} value={topic}>
                          {topic}
                        </option>
                      ))}
                  </optgroup>
                </select>
                {selectedTopic && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    Selected: <span className="font-semibold text-foreground">{selectedTopic}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col">
                <label className="block text-sm font-medium text-muted-foreground mb-2">Difficulty</label>
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select Difficulty</option>
                  {difficulties.map((diff) => (
                    <option key={diff} value={diff} className="capitalize">
                      {diff}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col justify-end gap-3">
                <div className="flex gap-3">
                  <Button
                    onClick={generateProblem}
                    disabled={loading || !selectedTopic || !selectedDifficulty}
                    className="flex-1"
                    variant="primary"
                  >
                    {loading ? (
                      <>
                        <LoadingSpinner size="sm" />
                        <span className="ml-2">Generating...</span>
                      </>
                    ) : (
                      " Generate Problem"
                    )}
                  </Button>

                  <Button
                    onClick={() => {
                      const randomTopic = popularTopics[Math.floor(Math.random() * popularTopics.length)]
                      const randomDifficulty = difficulties[Math.floor(Math.random() * difficulties.length)]
                      setSelectedTopic(randomTopic)
                      setSelectedDifficulty(randomDifficulty)
                    }}
                    disabled={loading}
                    className="flex-1"
                    variant="outline"
                  >
                    {loading ? (
                      <>
                        <LoadingSpinner size="sm" />
                        <span className="ml-2">Creating...</span>
                      </>
                    ) : (
                      " Quick Generate"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Recent Problems */}
          <Card className="p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground">📚 Recent Problems</h2>
              <Button onClick={() => (window.location.href = "/coding/problems")} variant="outline" size="sm">
                View All
              </Button>
            </div>

            {recentProblems.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4"></div>
                <h3 className="text-xl font-semibold text-foreground mb-2">No Problems Yet</h3>
                <p className="text-muted-foreground mb-6">
                  Generate your first AI-powered coding problem to get started!
                </p>
                <Button onClick={() => document.querySelector("select")?.focus()} variant="primary">
                  Generate First Problem
                </Button>
              </div>
            ) : (
              <motion.div
                variants={ANIMATION_VARIANTS.stagger}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {recentProblems.map((problem) => (
                  <motion.div
                    key={problem.id}
                    variants={ANIMATION_VARIANTS.slideUp}
                    whileHover={{ scale: 1.02 }}
                    className="cursor-pointer"
                    onClick={() => (window.location.href = `/coding/problem/${problem.id}`)}
                  >
                    <Card className="p-6 h-full hover:border-purple-400/50 transition-all duration-300">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-foreground text-lg line-clamp-2">{problem.title}</h3>
                        <span
                          className={`px-2 py-1 rounded-full text-xs border ${getDifficultyColor(problem.difficulty)}`}
                        >
                          {problem.difficulty}
                        </span>
                      </div>

                      <p className="text-muted-foreground text-sm mb-4 line-clamp-3">{problem.description}</p>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground bg-purple-500/20 px-2 py-1 rounded">
                          {problem.topic}
                        </span>

                        {problem.last_attempt && (
                          <div className="flex items-center space-x-2">
                            <span className={`text-xs ${getStatusColor(problem.last_attempt.status)}`}>
                              {problem.last_attempt.status.replace("_", " ")}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Attempt {problem.last_attempt.attempts}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-4 border-t border-purple-500/20 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Success Rate: {Math.round(problem.success_rate)}%</span>
                        {problem.average_time && <span>Avg Time: {Math.round(problem.average_time / 1000)}s</span>}
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </Card>

          {/* Quick Actions */}
          <motion.div variants={ANIMATION_VARIANTS.stagger} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <motion.div variants={ANIMATION_VARIANTS.slideUp}>
              <Card className="p-6 text-center hover:border-purple-400/50 transition-all duration-300 cursor-pointer">
                <div className="text-4xl mb-4"></div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Analytics Dashboard</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Track your progress, view detailed statistics, and get AI insights
                </p>
                <Button onClick={() => (window.location.href = "/coding/analytics")} variant="outline" size="sm">
                  View Analytics
                </Button>
              </Card>
            </motion.div>

            <motion.div variants={ANIMATION_VARIANTS.slideUp}>
              <Card className="p-6 text-center hover:border-purple-400/50 transition-all duration-300 cursor-pointer">
                <div className="text-4xl mb-4"></div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Learning Path</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Get AI-generated personalized learning recommendations
                </p>
                <Button onClick={() => (window.location.href = "/coding/learning-path")} variant="outline" size="sm">
                  View Path
                </Button>
              </Card>
            </motion.div>

            <motion.div variants={ANIMATION_VARIANTS.slideUp}>
              <Card className="p-6 text-center hover:border-purple-400/50 transition-all duration-300 cursor-pointer">
                <div className="text-4xl mb-4"></div>
                <h3 className="text-lg font-semibold text-foreground mb-2">My Solutions</h3>
                <p className="text-muted-foreground text-sm mb-4">Review your submissions and AI feedback</p>
                <Button onClick={() => navigate("/my-results", { state: { activeTab: "coding" } })} variant="outline" size="sm">
                  View Solutions
                </Button>
              </Card>
            </motion.div>
          </motion.div>
        </Card>
      </motion.div>
    </div>
  )
}

export default CodingPlatform
