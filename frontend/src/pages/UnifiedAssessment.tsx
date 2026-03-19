"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import type { AssessmentConfig, CodingProblem, CodingAnalytics } from "../types"
import { useToast } from "../contexts/ToastContext"
import { useAuth } from "../hooks/useAuth"
import Card from "../components/ui/Card"
import Button from "../components/ui/Button"
import Input from "../components/ui/Input"
import LoadingSpinner from "../components/ui/LoadingSpinner"
import api from "../utils/api"
import { ANIMATION_VARIANTS } from "../utils/constants"

type TabType = "mcq" | "coding"

const UnifiedAssessment: React.FC = () => {
  const { user } = useAuth()
  const { success, error: showError } = useToast()
  const navigate = useNavigate()

  // Tab management
  const [activeTab, setActiveTab] = useState<TabType>("mcq")
  const [isTabSwitching, setIsTabSwitching] = useState(false)

  // MCQ Assessment state
  const [mcqConfig, setMcqConfig] = useState<AssessmentConfig>({
    topic: "Science",
    qnCount: 5,
    difficulty: "Easy",
  })
  const [mcqSubmitting, setMcqSubmitting] = useState(false)
  const [mcqError, setMcqError] = useState("")

  // Coding Assessment state
  const [analytics, setAnalytics] = useState<CodingAnalytics | null>(null)
  const [recentProblems, setRecentProblems] = useState<CodingProblem[]>([])
  const [selectedTopic, setSelectedTopic] = useState<string>("")
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("")
  const [codingLoading, setCodingLoading] = useState(true)

  // Popular topics for coding
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

  const difficultyOptions = [
    { value: "Very Easy", label: "Very Easy", color: "from-green-400 to-green-600" },
    { value: "Easy", label: "Easy", color: "from-blue-400 to-blue-600" },
    { value: "Medium", label: "Medium", color: "from-yellow-400 to-orange-500" },
    { value: "Hard", label: "Hard", color: "from-orange-500 to-red-500" },
    { value: "Very Hard", label: "Very Hard", color: "from-red-500 to-red-700" },
  ]

  // Fetch coding analytics and problems
  const fetchCodingData = async () => {
    try {
      setCodingLoading(true)

      // Fetch analytics
      const analyticsResponse = await api.get("/api/coding/analytics")
      if (analyticsResponse.data.success) {
        setAnalytics(analyticsResponse.data.analytics)
      }

      // Fetch recent problems
      const problemsResponse = await api.get("/api/coding/problems?limit=6")
      if (problemsResponse.data.success) {
        setRecentProblems(problemsResponse.data.problems)
      }
    } catch (error: any) {
      console.error("❌ [UNIFIED_ASSESSMENT] Error fetching coding data:", error)
      if (error.response?.status === 404 || error.response?.status === 500) {
        setRecentProblems([])
      }
    } finally {
      setCodingLoading(false)
    }
  }

  // Tab switching handler
  const handleTabSwitch = (newTab: TabType) => {
    if (newTab === activeTab || isTabSwitching) return

    setIsTabSwitching(true)
    setActiveTab(newTab)

    // Reset tab switching state after animation
    setTimeout(() => {
      setIsTabSwitching(false)
    }, 200)
  }

  useEffect(() => {
    if (user && activeTab === "coding") {
      fetchCodingData()
    }
  }, [user, activeTab])

  // MCQ Assessment handlers
  const handleMcqInputChange = (field: keyof AssessmentConfig, value: string | number) => {
    setMcqConfig((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleMcqSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (mcqSubmitting) return

    setMcqSubmitting(true)
    setMcqError("")

    try {
      console.log("📤 Sending MCQ assessment config:", mcqConfig)

      // Validate config before sending
      if (!mcqConfig.topic.trim()) {
        throw new Error("Topic is required")
      }

      if (mcqConfig.qnCount < 1 || mcqConfig.qnCount > 50) {
        throw new Error("Question count must be between 1 and 50")
      }

      const response = await api.post("/api/topics/", mcqConfig, {
        timeout: 60000, // 60 second timeout for MCQ generation
      })

      console.log("📥 Server response:", response.data)

      if (response.data.success) {
        console.log("✅ MCQ assessment config saved, navigating to assessment...")
        console.log("📤 [UNIFIED_ASSESSMENT] Passing MCQ state:", {
          assessmentConfig: mcqConfig,
          isStudentGenerated: true
        })
        success("MCQ Assessment Started!", `Starting ${mcqConfig.qnCount} questions on ${mcqConfig.topic} (${mcqConfig.difficulty})`)
        navigate("/assessment", {
          replace: true,
          state: {
            assessmentConfig: mcqConfig,
            isStudentGenerated: true
          }
        })
      } else {
        throw new Error(response.data.error || "Failed to start assessment")
      }
    } catch (error: any) {
      console.error("❌ Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: mcqConfig,
      })

      let errorMessage = "Failed to start MCQ assessment. Please try again."

      if (error.code === 'ECONNABORTED') {
        errorMessage = "Request timed out. The AI is taking longer than expected to generate questions. Please try again with a simpler topic or try again later."
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail
      } else if (error.message) {
        errorMessage = error.message
      }

      setMcqError(errorMessage)
      showError("MCQ Assessment Start Failed", errorMessage)
    } finally {
      setMcqSubmitting(false)
    }
  }

  // Coding Assessment handlers
  const generateCodingProblem = async () => {
    if (!user) {
      showError("Please log in to generate problems")
      return
    }

    if (!selectedTopic || !selectedDifficulty) {
      showError("Please select a topic and difficulty")
      return
    }

    setCodingLoading(true)
    try {
      console.log("🚀 [CODING] Starting problem generation...")

      const response = await api.post("/api/coding/problems/generate", {
        topic: selectedTopic,
        difficulty: selectedDifficulty,
        user_skill_level: analytics?.skill_level || "intermediate",
        focus_areas: [selectedTopic],
        avoid_topics: analytics?.weak_topics || [],
        timestamp: Date.now(),
        user_id: user?.id,
        session_id: Math.random().toString(36).substring(7),
      }, {
        timeout: 60000, // 60 second timeout for this specific request
      })

      if (response.data.success) {
        success("New unique coding problem generated successfully!")
        window.location.href = `/coding/problem/${response.data.problem.id}`
      }
    } catch (error: any) {
      console.error("Error generating coding problem:", error)

      let errorMessage = "Failed to generate problem. Please try again."

      if (error.code === 'ECONNABORTED') {
        errorMessage = "Request timed out. The AI is taking longer than expected. Please try again with a simpler topic or try again later."
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail
      } else if (error.message) {
        errorMessage = error.message
      }

      showError("Problem Generation Failed", errorMessage)
    } finally {
      setCodingLoading(false)
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

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <motion.div
        variants={ANIMATION_VARIANTS.fadeIn}
        initial="initial"
        animate="animate"
        className="w-full"
      >
        {/* Page Title */}
        <motion.div
          variants={ANIMATION_VARIANTS.slideDown}
          initial="initial"
          animate="animate"
          className="mb-8"
        >
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Practice & Assessments</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Choose your assessment type and customize your learning experience with AI-powered questions and coding challenges
          </p>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div variants={ANIMATION_VARIANTS.slideUp} className="mb-8">
          <Card className="p-2 bg-gradient-to-r from-muted/30 to-muted/50 border-2 border-border/50">
            <div className="flex space-x-1">
              <motion.button
                onClick={() => handleTabSwitch("mcq")}
                disabled={isTabSwitching}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`flex-1 px-6 py-4 rounded-lg font-medium transition-all duration-300 relative overflow-hidden ${activeTab === "mcq"
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  } ${isTabSwitching ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <div className="flex items-center justify-center space-x-2 relative z-10">
                  <motion.svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    animate={activeTab === "mcq" ? { rotate: 360 } : { rotate: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </motion.svg>
                  <span className="font-semibold">MCQ Assessment</span>
                </div>
                {activeTab === "mcq" && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </motion.button>

              <motion.button
                onClick={() => handleTabSwitch("coding")}
                disabled={isTabSwitching}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`flex-1 px-6 py-4 rounded-lg font-medium transition-all duration-300 relative overflow-hidden ${activeTab === "coding"
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  } ${isTabSwitching ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <div className="flex items-center justify-center space-x-2 relative z-10">
                  <motion.svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    animate={activeTab === "coding" ? { rotate: 360 } : { rotate: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </motion.svg>
                  <span className="font-semibold">Coding Challenge</span>
                </div>
                {activeTab === "coding" && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </motion.button>
            </div>
          </Card>
        </motion.div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="relative"
        >
          {/* Loading overlay during tab switch */}
          {isTabSwitching && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg"
            >
              <div className="flex items-center space-x-2">
                <LoadingSpinner size="sm" />
                <span className="text-sm text-muted-foreground">Switching tabs...</span>
              </div>
            </motion.div>
          )}

          {activeTab === "mcq" ? (
            /* MCQ Assessment Tab */
            <Card className="p-8 bg-gradient-to-br from-card to-muted/20 border-2 border-border/50">
              <motion.div
                variants={ANIMATION_VARIANTS.slideDown}
                initial="initial"
                animate="animate"
                className="text-center mb-8"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-foreground mb-2">MCQ Assessment</h2>
                <p className="text-muted-foreground text-lg">Configure your multiple-choice assessment with AI-powered questions</p>
              </motion.div>

              {mcqError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200"
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {mcqError}
                  </div>
                </motion.div>
              )}

              <form onSubmit={handleMcqSubmit} className="space-y-6">
                <motion.div
                  variants={ANIMATION_VARIANTS.stagger}
                  initial="initial"
                  animate="animate"
                  className="space-y-6"
                >
                  <Input
                    type="text"
                    label="Topic"
                    value={mcqConfig.topic}
                    onChange={(e) => handleMcqInputChange("topic", e.target.value)}
                    placeholder="Enter topic (e.g., Mathematics, Science, History)"
                    disabled={mcqSubmitting}
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 16.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    }
                  />

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Number of Questions</label>
                    <div className="relative">
                      <input
                        type="range"
                        min="1"
                        max="50"
                        value={mcqConfig.qnCount}
                        onChange={(e) => handleMcqInputChange("qnCount", Number.parseInt(e.target.value))}
                        disabled={mcqSubmitting}
                        className="w-full h-2 bg-muted/30 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-sm text-muted-foreground mt-2">
                        <span>1</span>
                        <span className="text-foreground font-semibold">{mcqConfig.qnCount} questions</span>
                        <span>50</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-4">Difficulty Level</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {difficultyOptions.map((option) => (
                        <motion.button
                          key={option.value}
                          type="button"
                          onClick={() => handleMcqInputChange("difficulty", option.value)}
                          disabled={mcqSubmitting}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`p-4 rounded-lg border-2 transition-all duration-300 ${mcqConfig.difficulty === option.value
                              ? `border-border bg-gradient-to-r ${option.color} text-white shadow-lg`
                              : "border-border/40 bg-muted/20 text-foreground hover:border-border/60 hover:bg-muted/30"
                            }`}
                        >
                          <div className="text-center">
                            <div className="font-semibold">{option.label}</div>
                            {mcqConfig.difficulty === option.value && (
                              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mt-1">
                                <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </motion.div>
                            )}
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  variants={ANIMATION_VARIANTS.slideUp}
                  initial="initial"
                  animate="animate"
                  transition={{ delay: 0.3 }}
                  className="pt-6"
                >
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full"
                    isLoading={mcqSubmitting}
                    disabled={mcqSubmitting || !mcqConfig.topic.trim()}
                  >
                    {mcqSubmitting ? "AI Generating Questions..." : "Start MCQ Assessment"}
                  </Button>
                </motion.div>
              </form>

              {/* MCQ Assessment Preview */}
              <motion.div
                variants={ANIMATION_VARIANTS.slideUp}
                initial="initial"
                animate="animate"
                transition={{ delay: 0.5 }}
                className="mt-8 p-4 bg-muted/20 border border-border rounded-lg"
              >
                <h3 className="text-lg font-semibold text-foreground mb-2">MCQ Assessment Preview</h3>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>
                    <span className="font-medium">Topic:</span> {mcqConfig.topic || "Not specified"}
                  </p>
                  <p>
                    <span className="font-medium">Questions:</span> {mcqConfig.qnCount}
                  </p>
                  <p>
                    <span className="font-medium">Difficulty:</span> {mcqConfig.difficulty}
                  </p>
                  <p>
                    <span className="font-medium">Estimated Time:</span> {Math.ceil(mcqConfig.qnCount * 1.5)} minutes
                  </p>
                </div>
              </motion.div>
            </Card>
          ) : (
            /* Coding Challenge Tab */
            <div className="space-y-8">
              {/* Coding Header */}
              <motion.div
                variants={ANIMATION_VARIANTS.slideDown}
                initial="initial"
                animate="animate"
                className="text-center mb-8"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-foreground mb-2">Coding Challenge</h2>
                <p className="text-muted-foreground text-lg">Generate AI-powered coding problems and track your progress</p>
              </motion.div>

              {/* Coding Analytics Overview */}
              {codingLoading ? (
                <motion.div
                  variants={ANIMATION_VARIANTS.slideUp}
                  initial="initial"
                  animate="animate"
                  className="grid grid-cols-1 md:grid-cols-4 gap-6"
                >
                  {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="p-6 text-center">
                      <div className="animate-pulse">
                        <div className="h-8 bg-muted/30 rounded mb-2"></div>
                        <div className="h-4 bg-muted/20 rounded"></div>
                      </div>
                    </Card>
                  ))}
                </motion.div>
              ) : analytics ? (
                <motion.div
                  variants={ANIMATION_VARIANTS.stagger}
                  initial="initial"
                  animate="animate"
                  className="grid grid-cols-1 md:grid-cols-3 gap-6"
                >
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
              ) : (
                <motion.div
                  variants={ANIMATION_VARIANTS.slideUp}
                  initial="initial"
                  animate="animate"
                  className="text-center py-8"
                >
                  <Card className="p-6 bg-muted/20 border border-border/50">
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Analytics Yet</h3>
                    <p className="text-muted-foreground">Start solving coding problems to see your progress!</p>
                  </Card>
                </motion.div>
              )}

              {/* Problem Generation */}
              <Card className="p-8 bg-gradient-to-br from-card to-muted/20 border-2 border-border/50">
                <motion.div
                  variants={ANIMATION_VARIANTS.slideDown}
                  initial="initial"
                  animate="animate"
                  className="text-center mb-8"
                >
                  <h3 className="text-2xl font-bold text-foreground mb-2">Generate New Problem</h3>
                  <p className="text-muted-foreground">Create AI-powered coding challenges tailored to your skill level</p>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="flex flex-col">
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Select Topic</label>
                    <select
                      value={selectedTopic}
                      onChange={(e) => setSelectedTopic(e.target.value)}
                      className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
                        onClick={generateCodingProblem}
                        disabled={codingLoading || !selectedTopic || !selectedDifficulty}
                        className="flex-1"
                        variant="primary"
                      >
                        {codingLoading ? (
                          <>
                            <LoadingSpinner size="sm" />
                            <span className="ml-2">AI Generating Problem...</span>
                          </>
                        ) : (
                          "Generate Problem"
                        )}
                      </Button>

                      <Button
                        onClick={() => {
                          const randomTopic = popularTopics[Math.floor(Math.random() * popularTopics.length)]
                          const randomDifficulty = difficulties[Math.floor(Math.random() * difficulties.length)]
                          setSelectedTopic(randomTopic)
                          setSelectedDifficulty(randomDifficulty)
                        }}
                        disabled={codingLoading}
                        className="flex-1"
                        variant="outline"
                      >
                        {codingLoading ? (
                          <>
                            <LoadingSpinner size="sm" />
                            <span className="ml-2">Creating...</span>
                          </>
                        ) : (
                          "Quick Generate"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Recent Problems */}
              <Card className="p-8 bg-gradient-to-br from-card to-muted/20 border-2 border-border/50">
                <motion.div
                  variants={ANIMATION_VARIANTS.slideDown}
                  initial="initial"
                  animate="animate"
                  className="flex items-center justify-between mb-6"
                >
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">Recent Coding Problems</h2>
                    <p className="text-muted-foreground">Continue where you left off</p>
                  </div>
                  <Button onClick={() => (window.location.href = "/coding/problems")} variant="outline" size="sm">
                    View All
                  </Button>
                </motion.div>

                {codingLoading ? (
                  <div className="text-center py-12">
                    <LoadingSpinner size="lg" />
                    <p className="text-muted-foreground mt-4">Loading recent problems...</p>
                  </div>
                ) : recentProblems.length === 0 ? (
                  <div className="text-center py-12">
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
            </div>
          )}
        </motion.div>

        {/* Back Button */}
        <motion.div
          variants={ANIMATION_VARIANTS.slideUp}
          initial="initial"
          animate="animate"
          className="text-center mt-8"
        >
          <Button
            onClick={() => navigate("/dashboard")}
            variant="primary"
            size="lg"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </Button>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default UnifiedAssessment
