"use client"

import type React from "react"
import { motion } from "framer-motion"
import { CheckCircle, XCircle, Clock, Trophy, Target, TrendingUp } from "lucide-react"

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

const AssessmentResults: React.FC<AssessmentResultsProps> = ({ result, onClose }) => {
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return "text-green-400"
    if (percentage >= 80) return "text-blue-400"
    if (percentage >= 70) return "text-yellow-400"
    if (percentage >= 60) return "text-orange-400"
    return "text-red-400"
  }

  const getGradeText = (percentage: number) => {
    if (percentage >= 90) return "Excellent!"
    if (percentage >= 80) return "Good Job!"
    if (percentage >= 70) return "Well Done!"
    if (percentage >= 60) return "Not Bad!"
    return "Keep Practicing!"
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="panel p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto bg-surface text-fg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-fg">Assessment Results</h2>
          <button onClick={onClose} className="text-muted-fg hover:text-fg transition-colors">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Score Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-elevated rounded-lg p-4 border border-base">
            <div className="flex items-center space-x-2 mb-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <span className="text-muted-fg font-medium">Score</span>
            </div>
            <div className={`text-2xl font-bold ${getGradeColor(result.percentage || 0)}`}>
              {result.score || 0}/{result.total_questions || 0}
            </div>
            <div className="text-sm text-muted-fg">{(result.percentage || 0).toFixed(1)}%</div>
          </div>

          <div className="bg-elevated rounded-lg p-4 border border-base">
            <div className="flex items-center space-x-2 mb-2">
              <Target className="w-5 h-5 text-green-400" />
              <span className="text-muted-fg font-medium">Accuracy</span>
            </div>
            <div className={`text-2xl font-bold ${getGradeColor(result.percentage || 0)}`}>
              {(result.percentage || 0).toFixed(1)}%
            </div>
            <div className="text-sm text-muted-fg">{getGradeText(result.percentage || 0)}</div>
          </div>

          <div className="bg-elevated rounded-lg p-4 border border-base">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="w-5 h-5 text-blue-400" />
              <span className="text-muted-fg font-medium">Time Taken</span>
            </div>
            <div className="text-2xl font-bold text-blue-400">{formatTime(result.time_taken || 0)}</div>
            <div className="text-sm text-muted-fg">Attempt #{result.attempt_number || 1}</div>
          </div>

          <div className="bg-elevated rounded-lg p-4 border border-base">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              <span className="text-muted-fg font-medium">Performance</span>
            </div>
            <div className={`text-2xl font-bold ${getGradeColor(result.percentage || 0)}`}>
              {(result.percentage || 0) >= 80 ? "A" : (result.percentage || 0) >= 70 ? "B" : (result.percentage || 0) >= 60 ? "C" : "D"}
            </div>
            <div className="text-sm text-muted-fg">Grade</div>
          </div>
        </div>

        {/* Detailed Results */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-fg mb-4">Question Review</h3>

          {(result.questions || []).map((question, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-4 rounded-lg border ${
                question.is_correct ? "border-green-500/30 bg-green-900/20" : "border-red-500/30 bg-red-900/20"
              }`}
            >
              <div className="flex items-start space-x-3 mb-3">
                {question.is_correct ? (
                  <CheckCircle className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400 mt-1 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <h4 className="text-fg font-medium mb-2">
                    Question {index + 1}: {question.question}
                  </h4>

                  <div className="space-y-2">
                    {question.options?.map((option, optIndex) => (
                      <div
                        key={optIndex}
                        className={`p-2 rounded text-sm ${
                          optIndex === question.correct_answer
                            ? "bg-green-800/30 text-green-300 border border-green-500/30"
                            : optIndex === question.user_answer && !question.is_correct
                              ? "bg-red-800/30 text-red-300 border border-red-500/30"
                              : "bg-elevated text-muted-fg"
                        }`}
                      >
                        {optIndex === question.correct_answer && "✓ "}
                        {optIndex === question.user_answer && !question.is_correct && "✗ "}
                        {option}
                      </div>
                    ))}
                  </div>

                  {question.explanation && (
                    <div className="mt-3 p-3 bg-elevated rounded border border-base">
                      <p className="text-sm text-muted-fg">
                        <strong>Explanation:</strong> {question.explanation}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-elevated hover:bg-base text-fg rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default AssessmentResults
