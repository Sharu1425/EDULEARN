"use client"

import type React from "react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, Sparkles, BookOpen, AlertCircle } from "lucide-react"
import type { AssessmentConfig } from "../types"
import { useToast } from "../contexts/ToastContext"
import { useAuth } from "../hooks/useAuth"
import Card from "../components/ui/Card"
import Button from "../components/ui/Button"
import Input from "../components/ui/Input"
import api from "../utils/api"

type TabType = "mcq" | "thinktrace"

const UnifiedAssessment: React.FC = () => {
  const { user } = useAuth()
  const { success, error: showError } = useToast()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<TabType>("mcq")

  const [mcqConfig, setMcqConfig] = useState<AssessmentConfig>({ topic: "Science", qnCount: 5, difficulty: "Easy" })
  const [mcqSubmitting, setMcqSubmitting] = useState(false)
  const [mcqError, setMcqError] = useState("")

  const [ttTopic, setTtTopic] = useState("")
  const [ttDifficulty, setTtDifficulty] = useState("medium")
  const [ttQnCount, setTtQnCount] = useState(5)
  const [ttSubmitting, setTtSubmitting] = useState(false)

  const difficultyOptions = [
    { value: "Very Easy", label: "Very Easy", color: "from-green-400 to-green-600" },
    { value: "Easy", label: "Easy", color: "from-emerald-400 to-teal-600" },
    { value: "Medium", label: "Medium", color: "from-yellow-400 to-orange-500" },
    { value: "Hard", label: "Hard", color: "from-orange-500 to-red-500" },
    { value: "Very Hard", label: "Very Hard", color: "from-red-500 to-red-700" },
  ]

  const ttDifficultyOptions = [
    { value: "easy", label: "Easy", color: "from-emerald-400 to-teal-600" },
    { value: "medium", label: "Medium", color: "from-yellow-400 to-orange-500" },
    { value: "hard", label: "Hard", color: "from-orange-500 to-red-500" },
  ]

  const handleMcqInputChange = (field: keyof AssessmentConfig, value: string | number) =>
    setMcqConfig((prev) => ({ ...prev, [field]: value }))

  const handleMcqSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (mcqSubmitting) return
    setMcqSubmitting(true)
    setMcqError("")
    try {
      if (!mcqConfig.topic.trim()) throw new Error("Topic is required")
      if (mcqConfig.qnCount < 1 || mcqConfig.qnCount > 50) throw new Error("Question count must be between 1 and 50")
      const response = await api.post("/api/topics/", mcqConfig, { timeout: 60000 })
      if (response.data.success) {
        success("MCQ Assessment Started!", `${mcqConfig.qnCount} questions on ${mcqConfig.topic} (${mcqConfig.difficulty})`)
        navigate("/assessment", { replace: true, state: { assessmentConfig: mcqConfig, isStudentGenerated: true } })
      } else {
        throw new Error(response.data.error || "Failed to start assessment")
      }
    } catch (error: any) {
      let msg = "Failed to start MCQ assessment. Please try again."
      if (error.code === "ECONNABORTED") msg = "Request timed out — try a simpler topic or again later."
      else if (error.response?.data?.detail) msg = error.response.data.detail
      else if (error.message) msg = error.message
      setMcqError(msg)
      showError("MCQ Assessment Start Failed", msg)
    } finally {
      setMcqSubmitting(false)
    }
  }

  const handleThinkTraceSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ttTopic.trim()) { showError("Topic required", "Please enter a topic for your ThinkTrace session"); return }
    setTtSubmitting(true)
    try {
      navigate("/thinktrace", { state: { topic: ttTopic, difficulty: ttDifficulty, question_count: ttQnCount, autoStart: true } })
    } finally {
      setTtSubmitting(false)
    }
  }

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: "mcq", label: "MCQ Assessment", icon: <CheckCircle2 className="h-4 w-4" /> },
    { id: "thinktrace", label: "ThinkTrace Interview", icon: <Sparkles className="h-4 w-4" /> },
  ]

  const TAB_HERO: Record<TabType, { badge: string; title: string; subtitle: string }> = {
    mcq: {
      badge: "Practice",
      title: "MCQ Assessment",
      subtitle: "AI-adaptive multiple-choice questions tailored to your level. Pick a topic, set the depth, and dive in.",
    },
    thinktrace: {
      badge: "AI Interview",
      title: "ThinkTrace Interview",
      subtitle: "An adaptive AI interview that reveals how you think — branching questions, cognitive profiling, and a full report.",
    },
  }

  return (
    <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      {/* Hero */}
      <Card appearance="glass" hover={false} className="relative mb-4 overflow-hidden p-7 sm:p-8">
        <div className="aurora-mesh" />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="relative z-10"
          >
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {activeTab === "mcq" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
              {TAB_HERO[activeTab].badge}
            </span>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{TAB_HERO[activeTab].title}</h1>
            <p className="mt-2 max-w-xl text-muted-foreground">{TAB_HERO[activeTab].subtitle}</p>
          </motion.div>
        </AnimatePresence>
      </Card>

      {/* Tab switcher with sliding indicator */}
      <Card size="sm" hover={false} className="mb-4 !p-1.5">
        <div className="flex gap-1.5">
          {tabs.map((t) => {
            const active = activeTab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className="relative flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors"
              >
                {active && (
                  <motion.span
                    layoutId="assessTabIndicator"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    className="absolute inset-0 rounded-lg bg-primary shadow-e2"
                  />
                )}
                <span className={`relative z-10 flex items-center gap-2 ${active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  {t.icon}
                  {t.label}
                </span>
              </button>
            )
          })}
        </div>
      </Card>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        >
        {activeTab === "mcq" ? (
          <Card size="lg" hover={false}>
            <form onSubmit={handleMcqSubmit} className="space-y-5">
              {mcqError && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {mcqError}
                </div>
              )}

              <Input
                type="text"
                label="Topic"
                value={mcqConfig.topic}
                onChange={(e) => handleMcqInputChange("topic", e.target.value)}
                placeholder="e.g. Mathematics, Science, History"
                disabled={mcqSubmitting}
                icon={<BookOpen className="h-4 w-4" />}
              />

              <div>
                <label className="mb-2 block text-sm font-medium text-muted-foreground">
                  Number of Questions — <span className="tabular font-semibold text-foreground">{mcqConfig.qnCount}</span>
                </label>
                <input
                  type="range" min="1" max="50"
                  value={mcqConfig.qnCount}
                  onChange={(e) => handleMcqInputChange("qnCount", Number.parseInt(e.target.value))}
                  disabled={mcqSubmitting}
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-muted-foreground">Difficulty Level</label>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {difficultyOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleMcqInputChange("difficulty", option.value)}
                      disabled={mcqSubmitting}
                      className={`rounded-lg border px-2 py-2 text-xs font-semibold transition-all ${
                        mcqConfig.difficulty === option.value
                          ? `border-transparent bg-gradient-to-r ${option.color} text-white shadow-e2`
                          : "border-border bg-muted/30 text-foreground hover:border-primary/40 hover:bg-muted/60"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                <span><span className="font-medium text-foreground">{mcqConfig.qnCount}</span> questions · <span className="font-medium text-foreground">{mcqConfig.difficulty}</span></span>
                <span>~{Math.ceil(mcqConfig.qnCount * 1.5)} min</span>
              </div>

              <Button type="submit" variant="primary" className="w-full" isLoading={mcqSubmitting} disabled={mcqSubmitting || !mcqConfig.topic.trim()}>
                {mcqSubmitting ? "Generating Questions…" : "Start MCQ Assessment"}
              </Button>
            </form>
          </Card>
        ) : (
          <Card size="lg" hover={false}>
            <form onSubmit={handleThinkTraceSubmit} className="space-y-5">
              <p className="text-sm text-muted-foreground">
                An adaptive AI interview that reveals <em>how</em> you think — branching questions, cognitive profiling, and a full report.
              </p>

              <Input
                type="text"
                label="Topic"
                value={ttTopic}
                onChange={(e) => setTtTopic(e.target.value)}
                placeholder="e.g. Data Structures, Recursion, Python OOP"
                disabled={ttSubmitting}
                icon={<BookOpen className="h-4 w-4" />}
              />

              <div>
                <label className="mb-2 block text-sm font-medium text-muted-foreground">Difficulty</label>
                <div className="grid grid-cols-3 gap-2">
                  {ttDifficultyOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTtDifficulty(opt.value)}
                      disabled={ttSubmitting}
                      className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-all ${
                        ttDifficulty === opt.value
                          ? `border-transparent bg-gradient-to-r ${opt.color} text-white shadow-e2`
                          : "border-border bg-muted/30 text-foreground hover:border-primary/40 hover:bg-muted/60"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-muted-foreground">
                  Number of Questions — <span className="tabular font-semibold text-foreground">{ttQnCount}</span>
                </label>
                <input
                  type="range" min="3" max="10"
                  value={ttQnCount}
                  onChange={(e) => setTtQnCount(parseInt(e.target.value))}
                  disabled={ttSubmitting}
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
                />
              </div>

              <Button type="submit" variant="primary" className="w-full" isLoading={ttSubmitting} disabled={ttSubmitting || !ttTopic.trim()}>
                {ttSubmitting ? "Starting ThinkTrace…" : "Start ThinkTrace Session"}
              </Button>
            </form>
          </Card>
        )}
      </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default UnifiedAssessment
