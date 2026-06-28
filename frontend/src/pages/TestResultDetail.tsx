"use client"

import React, { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
// import { useAuth } from "../hooks/useAuth"  // Not used in this component
// import { useToast } from "../contexts/ToastContext"  // Not used in this component
import Card from "../components/ui/Card"
import Button from "../components/ui/Button"
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
  // const { user } = useAuth()  // Not used in this component
  // const { error: showError } = useToast()  // Not used in this component
  
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
        
        console.log("📊 [RESULT DETAIL] Full response:", response.data)
        console.log("📊 [RESULT DETAIL] Question reviews:", reviews)
        if (reviews.length > 0) {
          console.log("📊 [RESULT DETAIL] Sample review:", reviews[0])
          console.log("📊 [RESULT DETAIL] Sample review keys:", Object.keys(reviews[0]))
          console.log("📊 [RESULT DETAIL] Correct answer:", reviews[0].correct_answer)
          console.log("📊 [RESULT DETAIL] Correct answer index:", reviews[0].correct_answer_index)
          console.log("📊 [RESULT DETAIL] User answer:", reviews[0].user_answer)
          console.log("📊 [RESULT DETAIL] User answer index:", reviews[0].user_answer_index)
          console.log("📊 [RESULT DETAIL] Explanation:", reviews[0].explanation)
        }
        
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
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState size="lg" />
      </div>
    )
  }

  if (error || !result) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <ErrorState
            title="Result Not Found"
            message={error || "The test result you're looking for doesn't exist."}
            onBack={() => navigate("/dashboard")}
            backText="Return to Dashboard"
            showCard={true}
          />
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-20 px-4 bg-background">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-foreground mb-4">Test Results</h1>
          <p className="text-muted-foreground text-lg">{result.title}</p>
        </motion.div>

        {/* Score Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <Card className="p-8 text-center" appearance="solid">
            {/* Circular Score */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
              className="mb-6"
            >
              <div className="w-48 h-48 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-orange-500/50">
                <span className="text-5xl font-bold text-white">{parseFloat(result.percentage.toString()).toFixed(2)}%</span>
              </div>
              
              {/* Motivational Message */}
              <div className="flex items-center justify-center space-x-2 mb-6">
                <h2 className="text-2xl font-bold text-foreground">
                  {getScoreMessage(result.percentage)}
                </h2>
                <div className="flex space-x-1">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                </div>
              </div>
            </motion.div>

            {/* Progress Bar */}
            <div className="w-full bg-muted rounded-full h-4 mb-8">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${result.percentage}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
                className="bg-gradient-to-r from-yellow-500 to-orange-500 h-4 rounded-full shadow-lg"
              />
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { 
                  label: "Total Questions", 
                  value: result.total_questions, 
                  icon: (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )
                },
                { 
                  label: "Correct Answers", 
                  value: result.score, 
                  icon: (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )
                },
                { 
                  label: "Time Taken", 
                  value: formatTime(result.time_taken), 
                  icon: (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )
                },
                { 
                  label: "Topic", 
                  value: result.subject || "N/A", 
                  icon: (
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded"></div>
                      <div className="w-2 h-2 bg-red-500 rounded"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded"></div>
                    </div>
                  )
                },
                { 
                  label: "Difficulty", 
                  value: result.difficulty || "N/A", 
                  icon: (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  )
                }
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                  className="p-5 rounded-lg bg-card border border-border shadow-sm text-center"
                >
                  <div className="flex justify-center mb-3 text-foreground">
                    {stat.icon}
                  </div>
                  <p className="text-foreground font-bold text-xl mb-1">
                    {stat.value}
                  </p>
                  <p className="text-muted-foreground text-sm">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Assessment Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <Card className="p-6">
            <h3 className="text-xl font-semibold text-foreground mb-4">Assessment Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-muted-foreground">Subject:</span>
                <span className="text-foreground ml-2">{result.subject}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Difficulty:</span>
                <span className="text-foreground ml-2 capitalize">{result.difficulty}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total Questions:</span>
                <span className="text-foreground ml-2">{result.total_questions}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Time Taken:</span>
                <span className="text-foreground ml-2">{formatTime(result.time_taken)}</span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Question Review */}
        {questionReviews.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-8"
          >
            <Card className="p-6">
              <h3 className="text-xl font-semibold text-foreground mb-6">Question Review</h3>
              <div className="space-y-8">
                {questionReviews.map((question, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className="backdrop-blur-xl border rounded-2xl shadow-sm overflow-hidden bg-card border-border"
                  >
                    {/* Header */}
                    <div className="p-6 border-b border-border">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
                            {index + 1}
                          </div>
                          <div>
                            <h4 className="text-xl font-semibold text-foreground">
                              Question {index + 1} of {questionReviews.length}
                            </h4>
                            <div className="flex items-center space-x-2 mt-1">
                              {question.is_correct ? (
                                <div className="flex items-center space-x-1 text-green-400">
                                  <span className="text-lg">✓</span>
                                  <span className="text-sm font-medium">Correct</span>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-1 text-red-400">
                                  <span className="text-lg">✗</span>
                                  <span className="text-sm font-medium">Incorrect</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Question Content */}
                    <div className="p-8">
                      <div className="p-6 rounded-xl mb-8 border bg-muted/50 border-border">
                        <p className="text-xl leading-relaxed text-foreground font-sans">
                          {question.question}
                        </p>
                      </div>

                      {/* Options */}
                        {question.type === 'coding' ? (
                          <div className="space-y-4 mb-6">
                            <div className="p-5 rounded-lg border bg-muted border-border text-foreground font-mono text-sm whitespace-pre-wrap">
                              <div className="mb-2 text-emerald-600 dark:text-emerald-400 font-semibold">Your Code:</div>
                              {question.user_answer || 'No code submitted.'}
                            </div>

                            {/* Actual Answer for Coding Question */}
                            {question.reference_solution && (
                              <div className="p-5 rounded-lg border bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-100 font-mono text-sm whitespace-pre-wrap shadow-sm shadow-emerald-500/10">
                                <div className="mb-2 text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-2">
                                  <span className="text-lg">✅</span> Actual Answer:
                                </div>
                                {question.reference_solution}
                              </div>
                            )}

                            {/* AI Feedback for Coding Question */}
                            {result.ai_feedback && (
                              <div className="bg-muted border-border rounded-xl p-5 border">
                                <div className="flex items-center space-x-2 mb-4 text-emerald-600 dark:text-emerald-400">
                                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                  </div>
                                  <h4 className="font-bold text-lg">AI Code Insights</h4>
                                </div>
                                
                                {result.ai_feedback.overall_score && (
                                  <div className="mb-4 flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Quality Score:</span>
                                    <span className="text-xl font-bold text-foreground">{result.ai_feedback.overall_score}/100</span>
                                  </div>
                                )}

                                <div className="space-y-4">
                                  {result.ai_feedback.correctness && (
                                    <div>
                                      <div className="text-xs text-muted-foreground uppercase tracking-widest mb-2 font-bold">Correctness</div>
                                      <ul className="space-y-1">
                                        {result.ai_feedback.correctness.issues?.map((issue: string, i: number) => (
                                          <li key={i} className="text-sm text-red-200 flex items-start space-x-2">
                                            <span className="text-red-400 mt-1">•</span>
                                            <span>{issue}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  
                                  {result.ai_feedback.performance && (
                                    <div>
                                      <div className="text-xs text-muted-foreground uppercase tracking-widest mb-2 font-bold">Performance</div>
                                      <div className="flex space-x-3 mb-2">
                                        <span className="text-xs bg-muted px-2 py-0.5 rounded text-foreground">Time: {result.ai_feedback.performance.time_complexity}</span>
                                        <span className="text-xs bg-muted px-2 py-0.5 rounded text-foreground">Space: {result.ai_feedback.performance.space_complexity}</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            {question.options?.map((option, optIndex) => {
                              // Handle correct answer matching - check both text and index
                              let isCorrectAnswer = false
                              if (question.correct_answer !== undefined && question.correct_answer !== null) {
                                // If correct_answer is text, compare directly
                                if (typeof question.correct_answer === 'string') {
                                  isCorrectAnswer = option.trim() === question.correct_answer.trim()
                                }
                                // If correct_answer_index is provided and matches
                                else if (question.correct_answer_index !== undefined && question.correct_answer_index === optIndex) {
                                  isCorrectAnswer = true
                                }
                                // If correct_answer is the same as option index
                                else if (typeof question.correct_answer === 'number' && question.correct_answer === optIndex) {
                                  isCorrectAnswer = true
                                }
                              }
                              
                              // Handle user answer matching - check both text and index
                              let isUserAnswer = false
                              if (question.user_answer !== undefined && question.user_answer !== null) {
                                // If user_answer is text, compare directly
                                if (typeof question.user_answer === 'string') {
                                  isUserAnswer = option.trim() === question.user_answer.trim()
                                }
                                // If user_answer_index is provided and matches
                                else if (question.user_answer_index !== undefined && question.user_answer_index === optIndex) {
                                  isUserAnswer = true
                                }
                                // If user_answer is the same as option index
                                else if (typeof question.user_answer === 'number' && question.user_answer === optIndex) {
                                  isUserAnswer = true
                                }
                              }
                              
                              const isWrongUserAnswer = isUserAnswer && !question.is_correct && !isCorrectAnswer
                              const isCorrectUserAnswer = isUserAnswer && question.is_correct
                              
                              // Priority: Correct answer always shows in green, wrong user answer shows in red (if not correct)
                              const showAsCorrect = isCorrectAnswer
                              const showAsWrong = isWrongUserAnswer && !isCorrectAnswer
                              
                              return (
                                <div
                                  key={optIndex}
                                  className={`
                                    group relative p-5 rounded-lg text-left transition-all duration-300
                                    ${showAsCorrect
                                      ? "bg-green-600 border-2 border-green-500" 
                                      : showAsWrong
                                        ? "bg-red-600 border-2 border-red-500 text-white"
                                        : "bg-card border border-border hover:border-emerald-500/50 text-foreground"
                                    }
                                  `}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3 flex-1">
                                      <div className={`
                                        w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                                        ${showAsCorrect
                                          ? "bg-green-700 text-white" 
                                          : showAsWrong
                                            ? "bg-red-700 text-white"
                                            : "bg-muted border border-border text-foreground"
                                        }
                                      `}>
                                        {String.fromCharCode(65 + optIndex)}
                                      </div>
                                      <span className={`
                                        font-medium text-base
                                        ${showAsCorrect || showAsWrong
                                          ? "font-semibold text-white" 
                                          : "text-foreground"
                                        }
                                      `}>
                                        {option}
                                      </span>
                                    </div>
                                    {/* Icons and Labels on the right */}
                                    <div className="flex items-center space-x-2">
                                      {showAsCorrect && (
                                        <>
                                          <span className="text-green-200 text-xl font-bold">✓</span>
                                          <span className="px-3 py-1 rounded-full bg-green-700/50 text-white text-sm font-semibold">
                                            Correct
                                          </span>
                                        </>
                                      )}
                                      {isCorrectUserAnswer && (
                                        <span className="px-3 py-1 rounded-full bg-green-700/50 text-white text-sm font-semibold">
                                          Your Choice
                                        </span>
                                      )}
                                      {showAsWrong && (
                                        <>
                                          <span className="text-red-200 text-xl font-bold">✗</span>
                                          <span className="px-3 py-1 rounded-full bg-red-700/50 text-white text-sm font-semibold">
                                            Your Choice
                                          </span>
                                        </>
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
                        <div className="flex items-center space-x-2 mb-3">
                          <span className="text-amber-400 text-xl">💡</span>
                          <h5 className="text-foreground font-semibold text-lg">Explanation</h5>
                        </div>
                        {question.explanation && question.explanation.trim() !== '' && question.explanation !== 'No explanation available for this question.' ? (
                          <div className="bg-emerald-500/10 rounded-lg p-4 border border-emerald-500/20">
                            <p className="text-foreground text-base leading-relaxed whitespace-pre-wrap">
                              {question.explanation}
                            </p>
                          </div>
                        ) : (
                          <div className="bg-muted rounded-lg p-4 border border-border">
                            <p className="text-muted-foreground text-sm leading-relaxed italic">
                              No explanation available for this question.
                            </p>
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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Button
            onClick={() => navigate("/dashboard")}
            variant="primary"
            className="px-8 py-3"
          >
            Back to Dashboard
          </Button>
          <Button
            onClick={() => navigate("/assessconfig")}
            variant="secondary"
            className="px-8 py-3"
          >
            Take Another Test
          </Button>
        </motion.div>
      </div>
    </div>
  )
}

export default TestResultDetail