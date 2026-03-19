"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useToast } from "../../contexts/ToastContext"
import Card from "../ui/Card"
import Button from "../ui/Button"
import api from "../../utils/api"
import { ANIMATION_VARIANTS } from "../../utils/constants"

interface AssessmentAnalyticsProps {
  assessmentId: string
  onClose: () => void
}

interface QuestionAnalysis {
  question_index: number
  question_text: string
  correct_answer: string
  total_attempts: number
  correct_attempts: number
  accuracy: number
  difficulty_level: "easy" | "medium" | "hard"
}

interface BatchPerformance {
  [batch: string]: {
    scores: number[]
    count: number
    average: number
    highest: number
    lowest: number
  }
}

interface TimeAnalysis {
  average_time: number
  fastest_completion: number
  slowest_completion: number
  median_time: number
}

interface ScoreDistribution {
  excellent: number
  good: number
  average: number
  poor: number
}

interface Submission {
  student_id: string
  student_name: string
  student_email: string
  batch: string
  score: number
  total_questions: number
  percentage: number
  time_taken: number
  submitted_at: string
  answers: string[]
  questions: any[]
}

interface AssessmentAnalyticsData {
  assessment: {
    id: string
    title: string
    subject: string
    difficulty: string
    total_questions: number
    time_limit: number
  }
  analytics: {
    total_submissions: number
    average_score: number
    completion_rate: number
    question_analysis: QuestionAnalysis[]
    batch_performance: BatchPerformance
    time_analysis: TimeAnalysis
    score_distribution: ScoreDistribution
  }
  submissions: Submission[]
}

const AssessmentAnalytics: React.FC<AssessmentAnalyticsProps> = ({ assessmentId, onClose }) => {
  const { error: showError } = useToast()
  const [data, setData] = useState<AssessmentAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"overview" | "questions" | "students">("overview")

  useEffect(() => {
    fetchAnalytics()
  }, [assessmentId])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/api/assessments/teacher/assessment-analytics/${assessmentId}`)

      if (response.data.success) {
        setData(response.data)
        console.log("✅ [ANALYTICS] Assessment analytics loaded:", response.data.assessment.title)
      } else {
        showError("Error", "Failed to load assessment analytics")
      }
    } catch (err) {
      console.error("❌ [ANALYTICS] Failed to fetch analytics:", err)
      showError("Error", "Failed to load assessment analytics")
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-400"
    if (score >= 80) return "text-blue-400"
    if (score >= 60) return "text-yellow-400"
    return "text-red-400"
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "text-green-400"
      case "medium":
        return "text-yellow-400"
      case "hard":
        return "text-red-400"
      default:
        return "text-blue-400"
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-blue-900 rounded-lg p-6 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-blue-200 mb-2">Loading Analytics...</h3>
            <p className="text-blue-300">Please wait while we analyze the assessment data.</p>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-blue-900 rounded-lg p-6 max-w-md w-full mx-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-red-400 mb-2">Error</h3>
            <p className="text-blue-300 mb-4">Failed to load assessment analytics.</p>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        variants={ANIMATION_VARIANTS.slideUp}
        initial="initial"
        animate="animate"
        className="bg-blue-900 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-blue-500/30">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-blue-200 mb-2">
                {data.assessment.title} - Analytics
              </h2>
              <p className="text-blue-300">
                {data.assessment.subject} • {data.assessment.difficulty} • {data.assessment.total_questions} questions
              </p>
            </div>
            <Button variant="secondary" onClick={onClose}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-blue-800/30 rounded-lg p-1">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === "overview"
                  ? "bg-blue-500 text-white"
                  : "text-blue-300 hover:text-blue-200 hover:bg-blue-800/50"
                }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("questions")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === "questions"
                  ? "bg-blue-500 text-white"
                  : "text-blue-300 hover:text-blue-200 hover:bg-blue-800/50"
                }`}
            >
              Question Analysis
            </button>
            <button
              onClick={() => setActiveTab("students")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === "students"
                  ? "bg-blue-500 text-white"
                  : "text-blue-300 hover:text-blue-200 hover:bg-blue-800/50"
                }`}
            >
              Student Results
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <motion.div
              variants={ANIMATION_VARIANTS.slideUp}
              initial="initial"
              animate="animate"
            >
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-300 text-sm font-medium">Total Submissions</p>
                      <p className="text-2xl font-bold text-blue-200">{data.analytics.total_submissions}</p>
                    </div>
                    <div className="w-10 h-10 bg-blue-500/30 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-300 text-sm font-medium">Average Score</p>
                      <p className="text-2xl font-bold text-blue-200">{data.analytics.average_score.toFixed(1)}%</p>
                    </div>
                    <div className="w-10 h-10 bg-green-500/30 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-300 text-sm font-medium">Completion Rate</p>
                      <p className="text-2xl font-bold text-blue-200">{data.analytics.completion_rate}%</p>
                    </div>
                    <div className="w-10 h-10 bg-yellow-500/30 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-300 text-sm font-medium">Time Limit</p>
                      <p className="text-2xl font-bold text-blue-200">{data.assessment.time_limit}m</p>
                    </div>
                    <div className="w-10 h-10 bg-purple-500/30 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Score Distribution */}
              <Card className="p-6 mb-6">
                <h3 className="text-xl font-semibold text-blue-200 mb-4">Score Distribution</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-400 mb-2">
                      {data.analytics.score_distribution.excellent}
                    </div>
                    <p className="text-blue-300 text-sm">Excellent (90%+)</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-400 mb-2">
                      {data.analytics.score_distribution.good}
                    </div>
                    <p className="text-blue-300 text-sm">Good (80-89%)</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-400 mb-2">
                      {data.analytics.score_distribution.average}
                    </div>
                    <p className="text-blue-300 text-sm">Average (60-79%)</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-400 mb-2">
                      {data.analytics.score_distribution.poor}
                    </div>
                    <p className="text-blue-300 text-sm">Poor (&lt;60%)</p>
                  </div>
                </div>
              </Card>

              {/* Batch Performance */}
              {Object.keys(data.analytics.batch_performance).length > 0 && (
                <Card className="p-6 mb-6">
                  <h3 className="text-xl font-semibold text-blue-200 mb-4">Batch Performance</h3>
                  <div className="space-y-4">
                    {Object.entries(data.analytics.batch_performance).map(([batch, performance]) => (
                      <div key={batch} className="bg-blue-800/20 border border-blue-500/30 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-blue-200">{batch}</h4>
                          <span className="text-blue-300 text-sm">{performance.count} students</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-blue-400">Average</p>
                            <p className="font-semibold text-blue-200">{performance.average.toFixed(1)}%</p>
                          </div>
                          <div>
                            <p className="text-blue-400">Highest</p>
                            <p className="font-semibold text-green-400">{performance.highest.toFixed(1)}%</p>
                          </div>
                          <div>
                            <p className="text-blue-400">Lowest</p>
                            <p className="font-semibold text-red-400">{performance.lowest.toFixed(1)}%</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Time Analysis */}
              {data.analytics.time_analysis && (
                <Card className="p-6">
                  <h3 className="text-xl font-semibold text-blue-200 mb-4">Time Analysis</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-blue-400 text-sm">Average Time</p>
                      <p className="font-semibold text-blue-200">{formatTime(data.analytics.time_analysis.average_time)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-blue-400 text-sm">Fastest</p>
                      <p className="font-semibold text-green-400">{formatTime(data.analytics.time_analysis.fastest_completion)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-blue-400 text-sm">Slowest</p>
                      <p className="font-semibold text-red-400">{formatTime(data.analytics.time_analysis.slowest_completion)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-blue-400 text-sm">Median</p>
                      <p className="font-semibold text-yellow-400">{formatTime(data.analytics.time_analysis.median_time)}</p>
                    </div>
                  </div>
                </Card>
              )}
            </motion.div>
          )}

          {/* Question Analysis Tab */}
          {activeTab === "questions" && (
            <motion.div
              variants={ANIMATION_VARIANTS.slideUp}
              initial="initial"
              animate="animate"
            >
              <Card className="p-6">
                <h3 className="text-xl font-semibold text-blue-200 mb-4">Question Analysis</h3>
                <div className="space-y-4">
                  {data.analytics.question_analysis.map((question, index) => (
                    <div key={index} className="bg-blue-800/20 border border-blue-500/30 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-blue-200 mb-2">
                            Question {question.question_index + 1}
                          </h4>
                          <p className="text-blue-300 text-sm mb-2">{question.question_text}</p>
                          <p className="text-blue-400 text-xs">
                            Correct Answer: <span className="font-medium">{question.correct_answer}</span>
                          </p>
                        </div>
                        <div className="text-right ml-4">
                          <p className={`text-2xl font-bold ${getScoreColor(question.accuracy)}`}>
                            {question.accuracy.toFixed(1)}%
                          </p>
                          <p className="text-blue-300 text-sm">
                            {question.correct_attempts}/{question.total_attempts} correct
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-medium ${getDifficultyColor(question.difficulty_level)}`}>
                          {question.difficulty_level.toUpperCase()}
                        </span>
                        <div className="w-full bg-blue-800/30 rounded-full h-2 ml-4">
                          <div
                            className={`h-2 rounded-full ${question.accuracy >= 80 ? 'bg-green-400' :
                                question.accuracy >= 60 ? 'bg-yellow-400' : 'bg-red-400'
                              }`}
                            style={{ width: `${question.accuracy}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {/* Student Results Tab */}
          {activeTab === "students" && (
            <motion.div
              variants={ANIMATION_VARIANTS.slideUp}
              initial="initial"
              animate="animate"
            >
              <Card className="p-6">
                <h3 className="text-xl font-semibold text-blue-200 mb-4">Student Results</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-blue-500/30">
                        <th className="text-left py-3 px-4 text-blue-300 font-medium">Student</th>
                        <th className="text-left py-3 px-4 text-blue-300 font-medium">Batch</th>
                        <th className="text-left py-3 px-4 text-blue-300 font-medium">Score</th>
                        <th className="text-left py-3 px-4 text-blue-300 font-medium">Time Taken</th>
                        <th className="text-left py-3 px-4 text-blue-300 font-medium">Submitted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.submissions.map((submission, index) => (
                        <motion.tr
                          key={submission.student_id}
                          variants={ANIMATION_VARIANTS.slideUp}
                          initial="initial"
                          animate="animate"
                          transition={{ delay: index * 0.05 }}
                          className="border-b border-blue-500/20 hover:bg-blue-900/10 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div>
                              <p className="text-blue-200 font-medium">{submission.student_name}</p>
                              <p className="text-blue-400 text-sm">{submission.student_email}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-blue-300">{submission.batch}</td>
                          <td className="py-3 px-4">
                            <span className={`font-semibold ${getScoreColor(submission.percentage)}`}>
                              {submission.percentage.toFixed(1)}%
                            </span>
                            <p className="text-blue-400 text-xs">
                              {submission.score}/{submission.total_questions}
                            </p>
                          </td>
                          <td className="py-3 px-4 text-blue-300">
                            {formatTime(submission.time_taken)}
                          </td>
                          <td className="py-3 px-4 text-blue-300 text-sm">
                            {new Date(submission.submitted_at).toLocaleDateString()}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default AssessmentAnalytics
