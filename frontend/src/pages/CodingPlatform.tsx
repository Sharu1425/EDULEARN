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
import { Code2, Sparkles, Shuffle, BarChart3, Route, FileCode, ArrowRight } from "lucide-react"

interface CodingPlatformProps {
  user?: User
}

const CodingPlatform: React.FC<CodingPlatformProps> = ({ user: propUser }) => {
  const { user: authUser } = useAuth()
  const navigate = useNavigate()
  const { success, error: showError } = useToast()

  // Use prop user or auth user
  const user = propUser || authUser

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
      easy: "text-success bg-success/10 border-success/20",
      medium: "text-warning bg-warning/10 border-warning/20",
      hard: "text-destructive bg-destructive/10 border-destructive/20",
    }
    return colors[difficulty as keyof typeof colors] || colors.medium
  }

  const getStatusColor = (status: string) => {
    const colors = {
      accepted: "text-success",
      wrong_answer: "text-destructive",
      time_limit_exceeded: "text-warning",
      runtime_error: "text-warning",
      compilation_error: "text-destructive",
    }
    return colors[status as keyof typeof colors] || "text-muted-foreground"
  }

  useEffect(() => {
    if (user) {
      fetchAnalytics()
      fetchRecentProblems()
    }
  }, [user])

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Card size="md" hover={false} className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-muted-foreground mt-4">Loading coding platform...</p>
        </Card>
      </div>
    )
  }

  if (loading && !analytics) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <LoadingSpinner size="lg" text="Loading coding platform..." />
      </div>
    )
  }

  return (
    <motion.div
      variants={ANIMATION_VARIANTS.stagger}
      initial="initial"
      animate="animate"
      className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6"
    >
      {/* Hero */}
      <motion.div variants={ANIMATION_VARIANTS.slideUp}>
        <Card appearance="glass" hover={false} className="relative overflow-hidden p-7 sm:p-9">
          <div className="aurora-mesh" />
          <div className="relative z-10">
            <span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Code2 className="h-3.5 w-3.5" /> Coding Lab
            </span>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Sharpen your skills, one problem at a time
            </h1>
            <p className="mt-2 max-w-lg text-muted-foreground">
              Generate AI-tailored challenges, solve them in the editor, and get instant neural feedback.
            </p>
          </div>
        </Card>
      </motion.div>

      {/* Problem Generation */}
      <motion.div variants={ANIMATION_VARIANTS.slideUp}>
        <Card className="p-6">
          <h3 className="mb-4 flex items-center gap-2 font-heading text-lg font-bold text-foreground">
            <Sparkles className="h-5 w-5 text-primary" /> Generate AI-Powered Problem
          </h3>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="flex flex-col">
              <label className="mb-2 block text-sm font-medium text-muted-foreground">Select Topic</label>
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select Topic</option>
                <optgroup label="Popular Topics">
                  {popularTopics.map((topic) => (
                    <option key={topic} value={topic}>
                      {topic}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="All Topics">
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
              <label className="mb-2 block text-sm font-medium text-muted-foreground">Difficulty</label>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select Difficulty</option>
                {difficulties.map((diff) => (
                  <option key={diff} value={diff} className="capitalize">
                    {diff}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <div className="flex w-full gap-3">
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
                    <>
                      <Sparkles className="h-4 w-4" /> Generate
                    </>
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
                  <Shuffle className="h-4 w-4" /> Quick Pick
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Recent Problems */}
      <motion.div variants={ANIMATION_VARIANTS.slideUp}>
        <Card className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-heading text-xl font-bold text-foreground">
              <FileCode className="h-5 w-5 text-primary" /> Recent Problems
            </h2>
            <Button onClick={() => (window.location.href = "/coding/problems")} variant="outline" size="sm">
              View All
            </Button>
          </div>

          {recentProblems.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Code2 className="h-8 w-8" />
              </div>
              <h3 className="mb-2 font-heading text-xl font-semibold text-foreground">No Problems Yet</h3>
              <p className="mb-6 text-muted-foreground">
                Generate your first AI-powered coding problem to get started!
              </p>
              <Button onClick={() => document.querySelector("select")?.focus()} variant="primary">
                <Sparkles className="h-4 w-4" /> Generate First Problem
              </Button>
            </div>
          ) : (
            <motion.div
              variants={ANIMATION_VARIANTS.stagger}
              className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
            >
              {recentProblems.map((problem) => (
                <motion.div
                  key={problem.id}
                  variants={ANIMATION_VARIANTS.slideUp}
                  className="cursor-pointer"
                  onClick={() => (window.location.href = `/coding/problem/${problem.id}`)}
                >
                  <Card className="group h-full p-5">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <h3 className="line-clamp-2 font-heading text-base font-semibold text-foreground transition-colors group-hover:text-primary">{problem.title}</h3>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs capitalize ${getDifficultyColor(problem.difficulty)}`}>
                        {problem.difficulty}
                      </span>
                    </div>

                    <p className="mb-4 line-clamp-3 text-sm text-muted-foreground">{problem.description}</p>

                    <div className="flex items-center justify-between">
                      <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                        {problem.topic}
                      </span>

                      {problem.last_attempt && (
                        <div className="flex items-center gap-2">
                          <span className={`text-xs capitalize ${getStatusColor(problem.last_attempt.status)}`}>
                            {problem.last_attempt.status.replace("_", " ")}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Attempt {problem.last_attempt.attempts}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4 text-[11px] font-medium text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary/50" />
                        Success: {Math.round(problem.success_rate)}%
                      </span>
                      {problem.average_time && (
                        <span className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-info/50" />
                          {Math.round(problem.average_time / 1000)}s
                        </span>
                      )}
                    </div>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={ANIMATION_VARIANTS.stagger} className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { Icon: BarChart3, accent: "info", title: "Analytics Dashboard", desc: "Track progress, view detailed statistics, and get AI insights", label: "View Analytics", onClick: () => (window.location.href = "/coding/analytics") },
          { Icon: Route, accent: "secondary", title: "Learning Path", desc: "Get AI-generated personalized learning recommendations", label: "View Path", onClick: () => (window.location.href = "/coding/learning-path") },
          { Icon: FileCode, accent: "primary", title: "My Solutions", desc: "Review your submissions and AI feedback", label: "View Solutions", onClick: () => navigate("/my-results", { state: { activeTab: "coding" } }) },
        ].map((action) => (
          <motion.div key={action.title} variants={ANIMATION_VARIANTS.slideUp}>
            <Card className="group flex h-full flex-col p-6">
              <span
                className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-110"
                style={{ background: `hsl(var(--${action.accent}) / 0.12)`, color: `hsl(var(--${action.accent}))` }}
              >
                <action.Icon className="h-5 w-5" />
              </span>
              <h3 className="mb-2 font-heading text-lg font-semibold text-foreground">{action.title}</h3>
              <p className="mb-4 flex-1 text-sm text-muted-foreground">{action.desc}</p>
              <Button onClick={action.onClick} variant="outline" size="sm" className="w-fit">
                {action.label} <ArrowRight className="h-4 w-4" />
              </Button>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  )
}

export default CodingPlatform
