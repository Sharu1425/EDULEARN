"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import type { AssessmentConfig } from "../types"
import { useToast } from "../contexts/ToastContext"
import { useAuth } from "../hooks/useAuth"
import Card from "../components/ui/Card"
import Button from "../components/ui/Button"
import Input from "../components/ui/Input"
import LoadingSpinner from "../components/ui/LoadingSpinner"
import api from "../utils/api"
import { ANIMATION_VARIANTS } from "../utils/constants"

type TabType = "mcq" | "thinktrace"

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

  // ThinkTrace state
  const [ttTopic, setTtTopic] = useState("")
  const [ttDifficulty, setTtDifficulty] = useState("medium")
  const [ttQnCount, setTtQnCount] = useState(5)
  const [ttSubmitting, setTtSubmitting] = useState(false)

  const difficultyOptions = [
    { value: "Very Easy", label: "Very Easy", color: "from-green-400 to-green-600" },
    { value: "Easy", label: "Easy", color: "from-blue-400 to-blue-600" },
    { value: "Medium", label: "Medium", color: "from-yellow-400 to-orange-500" },
    { value: "Hard", label: "Hard", color: "from-orange-500 to-red-500" },
    { value: "Very Hard", label: "Very Hard", color: "from-red-500 to-red-700" },
  ]

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
    // No side-effect needed on thinktrace tab switch
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

  // ThinkTrace submit handler
  const handleThinkTraceSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ttTopic.trim()) {
      showError("Topic required", "Please enter a topic for your ThinkTrace session")
      return
    }
    setTtSubmitting(true)
    try {
      navigate("/thinktrace", {
        state: { topic: ttTopic, difficulty: ttDifficulty, question_count: ttQnCount, autoStart: true }
      })
    } finally {
      setTtSubmitting(false)
    }
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
            Choose your assessment type and customize your learning experience with AI-powered questions and adaptive interviews
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
                onClick={() => handleTabSwitch("thinktrace")}
                disabled={isTabSwitching}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`flex-1 px-6 py-4 rounded-lg font-medium transition-all duration-300 relative overflow-hidden ${activeTab === "thinktrace"
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
                    animate={activeTab === "thinktrace" ? { rotate: 360 } : { rotate: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </motion.svg>
                  <span className="font-semibold">ThinkTrace Interview</span>
                </div>
                {activeTab === "thinktrace" && (
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
                              ? `border-transparent bg-gradient-to-r ${option.color} text-white shadow-lg`
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
            /* ThinkTrace Tab */
            <Card className="p-8 bg-gradient-to-br from-card to-muted/20 border-2 border-border/50">
              <motion.div
                variants={ANIMATION_VARIANTS.slideDown}
                initial="initial"
                animate="animate"
                className="text-center mb-8"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-violet-500/10 mb-4">
                  <svg className="w-8 h-8 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-foreground mb-2">ThinkTrace Interview</h2>
                <p className="text-muted-foreground text-lg">An AI-powered adaptive interview that reveals <em>how</em> you think, not just what you know</p>
              </motion.div>

              {/* Feature Highlights */}
              <motion.div
                variants={ANIMATION_VARIANTS.stagger}
                initial="initial"
                animate="animate"
                className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
              >
                {[
                  { icon: "", title: "Adaptive Questions", desc: "AI branches questions based on your answers" },
                  { icon: "", title: "Cognitive Profiling", desc: "Reveals your decision patterns and learning style" },
                  { icon: "", title: "Detailed Review", desc: "Get a full ThinkTrace Report after the session" },
                ].map((item) => (
                  <div key={item.title} className="p-4 bg-violet-500/5 border border-violet-500/20 rounded-xl text-center">
                    <div className="text-2xl mb-2">{item.icon}</div>
                    <div className="font-semibold text-foreground text-sm">{item.title}</div>
                    <div className="text-muted-foreground text-xs mt-1">{item.desc}</div>
                  </div>
                ))}
              </motion.div>

              <form onSubmit={handleThinkTraceSubmit} className="space-y-6">
                <Input
                  type="text"
                  label="Topic"
                  value={ttTopic}
                  onChange={(e) => setTtTopic(e.target.value)}
                  placeholder="e.g., Data Structures, Recursion, Python OOP"
                  disabled={ttSubmitting}
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  }
                />



                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-4">Difficulty</label>
                  <div className="grid grid-cols-3 gap-3">
                    {(["easy", "medium", "hard"] as const).map((d) => (
                      <motion.button
                        key={d}
                        type="button"
                        onClick={() => setTtDifficulty(d)}
                        disabled={ttSubmitting}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`p-4 rounded-lg border-2 transition-all duration-300 capitalize ${
                          ttDifficulty === d
                            ? "border-violet-500 bg-violet-600 text-white shadow-lg shadow-violet-500/20"
                            : "border-border/40 bg-muted/20 text-foreground hover:border-border/60"
                        }`}
                      >
                        {d === "easy" ? "" : d === "medium" ? "" : ""} {d.charAt(0).toUpperCase() + d.slice(1)}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Number of Questions</label>
                  <div className="relative">
                    <input
                      type="range" min="3" max="10"
                      value={ttQnCount}
                      onChange={(e) => setTtQnCount(parseInt(e.target.value))}
                      disabled={ttSubmitting}
                      className="w-full h-2 bg-muted/30 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground mt-2">
                      <span>3</span>
                      <span className="text-foreground font-semibold">{ttQnCount} questions</span>
                      <span>10</span>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full !bg-gradient-to-r !from-violet-600 !to-purple-600 hover:!from-violet-700 hover:!to-purple-700"
                  isLoading={ttSubmitting}
                  disabled={ttSubmitting || !ttTopic.trim()}
                >
                  {ttSubmitting ? "Starting ThinkTrace..." : " Start ThinkTrace Session"}
                </Button>
              </form>
            </Card>
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
