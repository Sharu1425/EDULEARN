"use client"

import type React from "react"
import { useEffect } from "react"
import { motion } from "framer-motion"
import { CheckCircle, XCircle, Clock, Trophy, Target, TrendingUp } from "lucide-react"
import Overlay from "./ui/Overlay"
import Button from "./ui/Button"
import Badge from "./ui/Badge"
import { staggerContainer, staggerItem } from "../lib/motion"
import { useCountUp } from "../hooks/useCountUp"
import { celebrate } from "../lib/celebrate"

interface QuestionResult {
  question: string
  options?: string[]
  correct_answer: number
  user_answer: number
  explanation?: string
  is_correct: boolean
}

interface AssessmentResult {
  id: string
  assessment_id: string
  student_id: string
  student_name: string
  score: number
  total_questions: number
  percentage: number
  time_taken: number
  submitted_at: string
  attempt_number: number
  questions: QuestionResult[]
}

interface AssessmentResultsProps {
  result: AssessmentResult
  onClose: () => void
}

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

const gradeToken = (p: number) =>
  p >= 80 ? "success" : p >= 70 ? "info" : p >= 60 ? "warning" : "destructive"

const gradeText = (p: number) =>
  p >= 90 ? "Excellent!" : p >= 80 ? "Good Job!" : p >= 70 ? "Well Done!" : p >= 60 ? "Not Bad!" : "Keep Practicing!"

const letterGrade = (p: number) => (p >= 80 ? "A" : p >= 70 ? "B" : p >= 60 ? "C" : "D")

const AssessmentResults: React.FC<AssessmentResultsProps> = ({ result, onClose }) => {
  const percentage = result.percentage || 0
  const token = gradeToken(percentage)
  const animPct = useCountUp(percentage, { decimals: 1 })

  // Win moment — confetti on a passing score (no-op under reduced motion).
  useEffect(() => {
    if (percentage >= 80) {
      const t = setTimeout(() => celebrate(), 250)
      return () => clearTimeout(t)
    }
  }, [percentage])

  return (
    <Overlay isOpen onClose={onClose} className="max-w-4xl">
      <div className="glass max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-e4 dark:shadow-e4-dark">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Assessment Results</h2>
          <button onClick={onClose} className="text-muted-foreground transition-colors hover:text-foreground" aria-label="Close">
            <XCircle className="h-6 w-6" />
          </button>
        </div>

        {/* Score Summary */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-400" />
              <span className="font-medium text-muted-foreground">Score</span>
            </div>
            <div className="tabular text-2xl font-bold" style={{ color: `hsl(var(--${token}))` }}>
              {result.score || 0}/{result.total_questions || 0}
            </div>
            <div className="text-sm text-muted-foreground">{percentage.toFixed(1)}%</div>
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Target className="h-5 w-5 text-success" />
              <span className="font-medium text-muted-foreground">Accuracy</span>
            </div>
            <div className="tabular text-2xl font-bold" style={{ color: `hsl(var(--${token}))` }}>
              {animPct.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">{gradeText(percentage)}</div>
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Clock className="h-5 w-5 text-info" />
              <span className="font-medium text-muted-foreground">Time Taken</span>
            </div>
            <div className="tabular text-2xl font-bold text-info">{formatTime(result.time_taken || 0)}</div>
            <div className="text-sm text-muted-foreground">Attempt #{result.attempt_number || 1}</div>
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="mb-2 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="font-medium text-muted-foreground">Performance</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: `hsl(var(--${token}))` }}>
              {letterGrade(percentage)}
            </div>
            <div className="text-sm text-muted-foreground">Grade</div>
          </div>
        </div>

        {/* Detailed Results */}
        <h3 className="mb-4 text-lg font-semibold text-foreground">Question Review</h3>
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
          {(result.questions || []).map((question, index) => (
            <motion.div
              key={index}
              variants={staggerItem}
              className={`rounded-xl border p-4 ${
                question.is_correct ? "border-success/30 bg-success/10" : "border-destructive/30 bg-destructive/10"
              }`}
            >
              <div className="mb-3 flex items-start gap-3">
                {question.is_correct ? (
                  <CheckCircle className="mt-1 h-5 w-5 shrink-0 text-success" />
                ) : (
                  <XCircle className="mt-1 h-5 w-5 shrink-0 text-destructive" />
                )}
                <div className="flex-1">
                  <h4 className="mb-2 font-medium text-foreground">
                    Question {index + 1}: {question.question}
                  </h4>
                  <div className="space-y-2">
                    {question.options?.map((option, optIndex) => (
                      <div
                        key={optIndex}
                        className={`rounded-lg p-2 text-sm border ${
                          optIndex === question.correct_answer
                            ? "border-success/30 bg-success/15 text-success"
                            : optIndex === question.user_answer && !question.is_correct
                              ? "border-destructive/30 bg-destructive/15 text-destructive"
                              : "border-transparent bg-muted/40 text-muted-foreground"
                        }`}
                      >
                        {optIndex === question.correct_answer && "✓ "}
                        {optIndex === question.user_answer && !question.is_correct && "✗ "}
                        {option}
                      </div>
                    ))}
                  </div>
                  {question.explanation && (
                    <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
                      <p className="text-sm text-muted-foreground">
                        <strong className="text-foreground">Explanation:</strong> {question.explanation}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <div className="mt-6 flex justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Overlay>
  )
}

export default AssessmentResults
