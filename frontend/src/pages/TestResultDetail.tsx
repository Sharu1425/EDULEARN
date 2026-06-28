"use client"

import React, { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { FileText, CheckCircle2, Clock, Hash, Zap, Brain, Lightbulb, Check, X } from "lucide-react"
import Card from "../components/ui/Card"
import Button from "../components/ui/Button"
import StatTile from "../components/ui/StatTile"
import ProgressRing from "../components/ui/ProgressRing"
import LoadingState from "../components/LoadingState"
import ErrorState from "../components/ErrorState"
import api from "../utils/api"

interface TestResult {
  submission_id: string
  assessment_id: string
  title: string
  subject: string
  difficulty: string
  score: number
  percentage: number
  time_taken: number
  submitted_at: string
  total_questions: number
  questions?: QuestionResult[]
  user_answers?: string[]
  ai_feedback?: any
}

interface QuestionResult {
  question_index?: number
  question: string
  options?: string[]
  correct_answer: string | number
  correct_answer_index?: number
  user_answer: string | number
  user_answer_index?: number
  is_correct: boolean
  explanation?: string
  type?: string
  reference_solution?: string
}

const TestResultDetail: React.FC = () => {
  const { resultId } = useParams<{ resultId: string }>()
  const navigate = useNavigate()

  const [result, setResult] = useState<TestResult | null>(null)
  const [questionReviews, setQuestionReviews] = useState<QuestionResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (resultId) {
      fetchResult()
    }
  }, [resultId])

  const fetchResult = async () => {
    try {
      setLoading(true)

      // Get detailed result directly using the result ID
      const response = await api.get(`/api/results/${resultId}/detailed`)

      if (response.data.success) {
        const resultData = response.data.result
        const reviews = response.data.question_reviews || []

        setResult({
          submission_id: resultData.id,
          assessment_id: resultData.id,
          title: resultData.topic || "Test Result",
          subject: resultData.topic || "",
          difficulty: resultData.difficulty || "medium",
          score: resultData.score,
          percentage: resultData.percentage,
          submitted_at: resultData.date,
          total_questions: resultData.total_questions,
          time_taken: resultData.time_taken || 0,
          questions: resultData.questions || [],
          user_answers: resultData.user_answers || [],
          ai_feedback: resultData.ai_feedback
        })

        setQuestionReviews(reviews)
      } else {
        setError("Result not found")
      }

    } catch (err: any) {
      console.error("Error fetching result:", err)
      setError("Failed to load test result. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getScoreMessage = (percentage: number) => {
    if (percentage >= 90) return "Excellent work!"
    if (percentage >= 80) return "Great job!"
    if (percentage >= 70) return "Good effort!"
    if (percentage >= 60) return "Not bad! There's room for improvement!"
    return "Don't give up! Practice more!"
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <LoadingState size="lg" />
      </div>
    )
  }

  if (error || !result) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <ErrorState
          title="Result Not Found"
          message={error || "The test result you're looking for doesn't exist."}
          onBack={() => navigate("/dashboard")}
          backText="Return to Dashboard"
          showCard={true}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Card appearance="glass" hover={false} className="relative overflow-hidden p-7 text-center sm:p-9">
          <div className="aurora-mesh" />
          <div className="relative z-10">
            <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Test Results</h1>
            <p className="mt-2 text-muted-foreground">{result.title}</p>
          </div>
        </Card>
      </motion.div>

      {/* Score + metrics */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="p-6 sm:p-8">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center sm:gap-10">
            <ProgressRing progress={parseFloat(result.percentage.toString())} size={150} />
            <div className="text-center sm:text-left">
              <h2 className="font-heading text-2xl font-bold text-foreground">{getScoreMessage(result.percentage)}</h2>
              <p className="mt-1 text-muted-foreground">
                You scored <span className="font-semibold text-foreground">{result.score}</span> out of{" "}
                <span className="font-semibold text-foreground">{result.total_questions}</span>.
              </p>
            </div>
          </div>

          {/* Metric tiles */}
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-5">
            <StatTile label="Questions" value={result.total_questions} icon={<FileText className="h-4 w-4" />} accent="primary" />
            <StatTile label="Correct" value={result.score} icon={<CheckCircle2 className="h-4 w-4" />} accent="success" />
            <StatTile label="Time Taken" value={formatTime(result.time_taken)} icon={<Clock className="h-4 w-4" />} accent="info" />
            <StatTile label="Topic" value={result.subject || "N/A"} icon={<Hash className="h-4 w-4" />} accent="secondary" />
            <StatTile label="Difficulty" value={result.difficulty || "N/A"} icon={<Zap className="h-4 w-4" />} accent="accent" />
          </div>
        </Card>
      </motion.div>

      {/* Question Review */}
      {questionReviews.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="p-6 sm:p-8">
            <h3 className="mb-6 font-heading text-xl font-bold text-foreground">Question Review</h3>
            <div className="space-y-6">
              {questionReviews.map((question, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06 * index }}
                  className={`overflow-hidden rounded-2xl border ${question.is_correct ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"}`}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between gap-4 border-b border-border/60 p-5">
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-lg font-bold text-white">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-heading text-lg font-semibold text-foreground">
                          Question {index + 1} of {questionReviews.length}
                        </h4>
                        <div className="mt-1 flex items-center gap-1.5">
                          {question.is_correct ? (
                            <span className="flex items-center gap-1 text-sm font-medium text-success"><Check className="h-4 w-4" /> Correct</span>
                          ) : (
                            <span className="flex items-center gap-1 text-sm font-medium text-destructive"><X className="h-4 w-4" /> Incorrect</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Question Content */}
                  <div className="p-6 sm:p-8">
                    <div className="mb-6 rounded-xl border border-border bg-muted/40 p-5">
                      <p className="text-lg leading-relaxed text-foreground">{question.question}</p>
                    </div>

                    {/* Options */}
                    {question.type === 'coding' ? (
                      <div className="mb-6 space-y-4">
                        <div className="whitespace-pre-wrap rounded-lg border border-border bg-muted/50 p-5 font-mono text-sm text-foreground">
                          <div className="mb-2 font-semibold text-muted-foreground">Your Code:</div>
                          {question.user_answer || 'No code submitted.'}
                        </div>

                        {/* Reference Solution for Coding Question */}
                        {question.reference_solution && (
                          <div className="whitespace-pre-wrap rounded-lg border border-success/20 bg-success/5 p-5 font-mono text-sm text-foreground">
                            <div className="mb-2 flex items-center gap-2 font-semibold text-success">
                              <CheckCircle2 className="h-4 w-4" /> Reference Answer:
                            </div>
                            {question.reference_solution}
                          </div>
                        )}

                        {/* AI Feedback for Coding Question */}
                        {result.ai_feedback && (
                          <div className="rounded-xl border border-info/30 bg-info/10 p-5">
                            <div className="mb-4 flex items-center gap-2 text-info">
                              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-info/15"><Brain className="h-5 w-5" /></span>
                              <h4 className="text-lg font-bold">AI Code Insights</h4>
                            </div>

                            {result.ai_feedback.overall_score && (
                              <div className="mb-4 flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Quality Score:</span>
                                <span className="text-xl font-bold text-info">{result.ai_feedback.overall_score}/100</span>
                              </div>
                            )}

                            <div className="space-y-4">
                              {result.ai_feedback.correctness && (
                                <div>
                                  <div className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Correctness</div>
                                  <ul className="space-y-1">
                                    {result.ai_feedback.correctness.issues?.map((issue: string, i: number) => (
                                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                        <span className="mt-1 text-destructive">•</span><span>{issue}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {result.ai_feedback.performance && (
                                <div>
                                  <div className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Performance</div>
                                  <div className="flex gap-3">
                                    <span className="rounded bg-info/10 px-2 py-0.5 text-xs text-foreground">Time: {result.ai_feedback.performance.time_complexity}</span>
                                    <span className="rounded bg-info/10 px-2 py-0.5 text-xs text-foreground">Space: {result.ai_feedback.performance.space_complexity}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                        {question.options?.map((option, optIndex) => {
                          // Handle correct answer matching - check both text and index
                          let isCorrectAnswer = false
                          if (question.correct_answer !== undefined && question.correct_answer !== null) {
                            if (typeof question.correct_answer === 'string') {
                              isCorrectAnswer = option.trim() === question.correct_answer.trim()
                            }
                            else if (question.correct_answer_index !== undefined && question.correct_answer_index === optIndex) {
                              isCorrectAnswer = true
                            }
                            else if (typeof question.correct_answer === 'number' && question.correct_answer === optIndex) {
                              isCorrectAnswer = true
                            }
                          }

                          // Handle user answer matching - check both text and index
                          let isUserAnswer = false
                          if (question.user_answer !== undefined && question.user_answer !== null) {
                            if (typeof question.user_answer === 'string') {
                              isUserAnswer = option.trim() === question.user_answer.trim()
                            }
                            else if (question.user_answer_index !== undefined && question.user_answer_index === optIndex) {
                              isUserAnswer = true
                            }
                            else if (typeof question.user_answer === 'number' && question.user_answer === optIndex) {
                              isUserAnswer = true
                            }
                          }

                          const isWrongUserAnswer = isUserAnswer && !question.is_correct && !isCorrectAnswer
                          const isCorrectUserAnswer = isUserAnswer && question.is_correct

                          const showAsCorrect = isCorrectAnswer
                          const showAsWrong = isWrongUserAnswer && !isCorrectAnswer

                          return (
                            <div
                              key={optIndex}
                              className={`rounded-lg border p-4 text-left transition-colors ${showAsCorrect
                                ? "border-success/40 bg-success/10"
                                : showAsWrong
                                  ? "border-destructive/40 bg-destructive/10"
                                  : "border-border bg-muted/40"
                                }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex flex-1 items-center gap-3">
                                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${showAsCorrect
                                    ? "bg-success text-white"
                                    : showAsWrong
                                      ? "bg-destructive text-white"
                                      : "border border-border bg-muted text-foreground"
                                    }`}>
                                    {String.fromCharCode(65 + optIndex)}
                                  </div>
                                  <span className="flex-1 text-base font-medium text-foreground">{option}</span>
                                </div>
                                {/* Icons and Labels on the right */}
                                <div className="flex items-center gap-2">
                                  {showAsCorrect && (
                                    <span className="rounded-full bg-success/20 px-3 py-1 text-sm font-semibold text-success">Correct</span>
                                  )}
                                  {isCorrectUserAnswer && (
                                    <span className="rounded-full bg-success/20 px-3 py-1 text-sm font-semibold text-success">Your Choice</span>
                                  )}
                                  {showAsWrong && (
                                    <span className="rounded-full bg-destructive/20 px-3 py-1 text-sm font-semibold text-destructive">Your Choice</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Explanation */}
                    <div className="mt-6">
                      <div className="mb-3 flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-warning" />
                        <h5 className="font-heading text-lg font-semibold text-foreground">Explanation</h5>
                      </div>
                      {question.explanation && question.explanation.trim() !== '' && question.explanation !== 'No explanation available for this question.' ? (
                        <div className="rounded-lg border border-info/30 bg-info/10 p-4">
                          <p className="whitespace-pre-wrap leading-relaxed text-foreground">{question.explanation}</p>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-border bg-muted/40 p-4">
                          <p className="text-sm italic leading-relaxed text-muted-foreground">No explanation available for this question.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col justify-center gap-3 sm:flex-row"
      >
        <Button onClick={() => navigate("/dashboard")} variant="primary" size="lg">Back to Dashboard</Button>
        <Button onClick={() => navigate("/assessconfig")} variant="secondary" size="lg">Take Another Test</Button>
      </motion.div>
    </div>
  )
}

export default TestResultDetail
