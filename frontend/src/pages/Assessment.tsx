"use client"

import React, { useState, useEffect, useRef } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import { motion } from "framer-motion"
import { useAuth } from "../hooks/useAuth"
import { useToast } from "../contexts/ToastContext"
import Card from "../components/ui/Card"
import Button from "../components/ui/Button"
import LoadingState from "../components/LoadingState"
import ErrorState from "../components/ErrorState"
import api from "../utils/api"

interface Question {
  id: string
  question: string
  options: string[]
  correct_answer: number
  explanation?: string
  difficulty: string
  topic: string
}

interface Assessment {
  id: string
  title: string
  subject: string
  difficulty: string
  description: string
  time_limit: number
  question_count: number
  questions: Question[]
  type: string
}

const Assessment: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { success, error: showError } = useToast()

  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [timeLeft, setTimeLeft] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [testStarted, setTestStarted] = useState(false)
  const [testCompleted, setTestCompleted] = useState(false)
  const [assessmentType, setAssessmentType] = useState<'teacher' | 'student'>('teacher')
  const [isFetching, setIsFetching] = useState(false)
  const hasLoaded = useRef(false)

  useEffect(() => {
    fetchAssessment()
  }, [id]) // Only depend on id to prevent multiple calls

  // Debug effect to track assessment changes
  useEffect(() => {
    if (assessment) {
      console.log("🔄 [ASSESSMENT] Assessment loaded:", {
        id: assessment.id,
        title: assessment.title,
        questionCount: assessment.question_count,
        type: assessmentType
      })
    }
  }, [assessment, assessmentType])

  useEffect(() => {
    if (testStarted && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleSubmitTest()
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [testStarted, timeLeft])

  const fetchAssessment = async () => {
    // Prevent multiple simultaneous requests
    if (isFetching || hasLoaded.current) {
      console.log("⚠️ [ASSESSMENT] Request already in progress or already loaded, skipping...")
      return
    }

    try {
      setIsFetching(true)
      setLoading(true)
      hasLoaded.current = true

      console.log("🔍 [ASSESSMENT] Starting assessment fetch...")
      console.log("🔍 [ASSESSMENT] ID:", id)
      console.log("🔍 [ASSESSMENT] Location state:", location.state)

      // Check if configuration was passed from AssessConfig (student-generated)
      const state = location.state as any
      if (state?.isStudentGenerated && state?.assessmentConfig) {
        console.log("📋 [ASSESSMENT] Loading student-generated assessment from config...")
        await loadStudentGeneratedAssessment(state.assessmentConfig)
        return
      }

      // If ID is provided, try to fetch as teacher-created assessment
      if (id) {
        console.log("📋 [ASSESSMENT] Loading teacher-created assessment...")
        await loadTeacherCreatedAssessment(id)
        return
      }

      // If no ID and no state, this is an invalid route
      throw new Error("No assessment ID provided and no configuration found")

    } catch (err: any) {
      console.error("❌ [ASSESSMENT] Error fetching assessment:", err)
      showError("Error", "Failed to load assessment. Please try again.")
      navigate("/dashboard")
    } finally {
      setLoading(false)
      setIsFetching(false)
    }
  }

  const loadStudentGeneratedAssessment = async (config: any) => {
    const { topic, qnCount, difficulty } = config
    const totalTime = getDifficultyTime(difficulty, qnCount)

    console.log("🤖 [ASSESSMENT] Fetching questions from Gemini AI...")
    console.log("🤖 [ASSESSMENT] Params:", { topic, difficulty, count: qnCount })

    // Fetch questions from Gemini AI (always generates unique questions)
    const geminiResponse = await api.get("/db/questions", {
      params: { topic, difficulty, count: qnCount }
    })

    console.log("📊 [ASSESSMENT] Questions fetched:", geminiResponse.data.length, "questions")

    if (!Array.isArray(geminiResponse.data) || geminiResponse.data.length === 0) {
      throw new Error("No questions were generated. Please try again.")
    }

    // Create assessment object for student-generated assessment
    const studentAssessment: Assessment = {
      id: 'student-generated',
      title: `${topic} Assessment`,
      subject: topic,
      difficulty: difficulty,
      description: `AI-generated ${difficulty} assessment on ${topic}`,
      time_limit: Math.ceil(totalTime / 60), // Convert to minutes
      question_count: qnCount,
      questions: geminiResponse.data,
      type: 'mcq'
    }

    setAssessment(studentAssessment)
    setTimeLeft(totalTime)
    setAnswers(new Array(qnCount).fill(-1))
    setAssessmentType('student')
    console.log("✅ [ASSESSMENT] Loaded student-generated assessment")
  }

  const loadTeacherCreatedAssessment = async (assessmentId: string) => {
    console.log("🔍 [ASSESSMENT] Fetching teacher assessment details for ID:", assessmentId)

    // Try teacher assessment endpoint first
    try {
      const response = await api.get(`/api/assessments/teacher/${assessmentId}`)

      if (!response.data || !response.data.questions || response.data.questions.length === 0) {
        throw new Error("Teacher assessment not found or has no questions")
      }

      setAssessment(response.data)
      setTimeLeft(response.data.time_limit * 60) // Convert minutes to seconds
      setAnswers(new Array(response.data.question_count).fill(-1))
      setAssessmentType('teacher')
      console.log("✅ [ASSESSMENT] Loaded teacher-created assessment")
      return
    } catch (error) {
      console.log("⚠️ [ASSESSMENT] Teacher assessment endpoint failed, trying regular assessment endpoint...")
    }

    // Fallback to regular assessment endpoint
    const response = await api.get(`/api/assessments/${assessmentId}/questions`)

    if (!response.data || !response.data.questions || response.data.questions.length === 0) {
      throw new Error("Assessment not found or has no questions")
    }

    setAssessment(response.data)
    setTimeLeft(response.data.time_limit * 60) // Convert minutes to seconds
    setAnswers(new Array(response.data.question_count).fill(-1))
    setAssessmentType('teacher')
    console.log("✅ [ASSESSMENT] Loaded teacher-created assessment")
  }

  const getDifficultyTime = (difficulty: string, questionCount: number) => {
    const timePerQuestion = {
      easy: 60, // 1 minute per question
      medium: 90, // 1.5 minutes per question
      hard: 120, // 2 minutes per question
    }
    return (timePerQuestion[difficulty as keyof typeof timePerQuestion] || 90) * questionCount
  }

  const startTest = () => {
    setTestStarted(true)
  }

  const handleAnswerSelect = (questionIndex: number, answerIndex: number) => {
    console.log(`📝 [ASSESSMENT] Answer selected: Question ${questionIndex + 1}, Answer ${answerIndex}`)
    const newAnswers = [...answers]
    newAnswers[questionIndex] = answerIndex
    setAnswers(newAnswers)
    console.log(`📝 [ASSESSMENT] Updated answers:`, newAnswers)
  }

  const handleSubmitTest = async () => {
    if (submitting) return

    try {
      setSubmitting(true)

      // Calculate score
      let score = 0
      console.log("📊 [ASSESSMENT] Calculating score...")
      console.log("📊 [ASSESSMENT] Answers array:", answers)
      console.log("📊 [ASSESSMENT] Questions:", assessment?.questions.length)

      assessment?.questions.forEach((question, index) => {
        const userAnswer = answers[index]
        const correctAnswer = question.correct_answer
        const isCorrect = userAnswer === correctAnswer

        console.log(`📊 [ASSESSMENT] Question ${index + 1}: User=${userAnswer}, Correct=${correctAnswer}, IsCorrect=${isCorrect}`)

        if (isCorrect) {
          score++
        }
      })

      const percentage = Math.round((score / (assessment?.question_count || 1)) * 100)
      console.log(`📊 [ASSESSMENT] Final score calculated: ${score}/${assessment?.question_count} (${percentage}%)`)
      console.log("📊 [ASSESSMENT] Submission Payload preparation...", {
        assessmentType,
        score,
        total_questions: assessment?.question_count,
        user_answers_sample: answers.slice(0, 3)
      })

      if (assessmentType === 'teacher') {
        // Submit to teacher-created assessment endpoint
        const submission = {
          assessment_id: id,
          student_id: user?.id || '',
          answers: answers,
          time_taken: assessment?.time_limit ? (assessment.time_limit * 60) - timeLeft : 0,
          score: score,
          percentage: percentage,
          submitted_at: new Date().toISOString(),
          is_completed: true
        }

        try {
          // Try teacher assessment submit endpoint first
          const res = await api.post(`/api/assessments/teacher/${id}/submit`, submission)
          
          // Use backend-calculated score (frontend score is 0 because correct_answer is hidden for security)
          const backendScore = res.data.score ?? score
          const backendPercentage = res.data.percentage ?? percentage
          const backendTotal = res.data.total_questions ?? assessment?.question_count ?? 0
          
          success("Success", `Test completed! Your score: ${backendScore}/${backendTotal} (${Math.round(backendPercentage)}%)`)

          // Prepare result state for Results page
          const resultState = {
            score: backendScore,
            totalQuestions: backendTotal,
            topic: assessment?.subject || '',
            difficulty: assessment?.difficulty || '',
            questions: assessment?.questions.map((q, idx) => ({
              id: q.id,
              question: q.question,
              options: q.options,
              answer: q.options[q.correct_answer] ?? '', // correct_answer may be null (hidden)
              correct_answer: q.correct_answer,
              explanation: q.explanation,
              difficulty: assessment?.difficulty || '',
              topic: assessment?.subject || ''
            })) || [],
            userAnswers: answers.map((answerIndex, questionIndex) => {
              const question = assessment?.questions[questionIndex];
              return answerIndex >= 0 && question?.options[answerIndex]
                ? question.options[answerIndex]
                : '';
            }),
            timeTaken: assessment?.time_limit ? (assessment.time_limit * 60) - timeLeft : 0,
            explanations: assessment?.questions.map((q, idx) => ({
              questionIndex: idx,
              explanation: q.explanation || "",
            })) || [],
            questionReviews: res.data.question_reviews || []
          };

          // Navigate to Results page with state
          navigate("/results", { state: resultState });
          return
        } catch (error: any) {
          // Do NOT fall back to generic submit - it uses a different question ordering/shuffle
          // which would show wrong (dummy) questions in the results review.
          // Surface the real error to the user instead.
          console.error("[ASSESSMENT] Teacher assessment submit failed:", error)
          const errMsg = error?.response?.data?.detail || error?.message || "Submission failed"
          throw new Error(`Teacher assessment submission failed: ${errMsg}`)
        }

      } else {
        // Submit to student-generated assessment endpoint (existing system)
        const result = {
          user_id: user?.id,
          score: score,
          total_questions: assessment?.question_count || 0,
          questions: assessment?.questions.map((q) => ({
            question: q.question,
            options: q.options,
            answer: q.options[q.correct_answer],
            explanation: q.explanation,
          })) || [],
          user_answers: answers.map((answerIndex, questionIndex) => {
            const question = assessment?.questions[questionIndex]
            const userAnswerText = answerIndex >= 0 && question?.options[answerIndex]
              ? question.options[answerIndex]
              : ''

            console.log(`📝 [ASSESSMENT] API Question ${questionIndex + 1}: AnswerIndex=${answerIndex}, AnswerText="${userAnswerText}"`)

            return userAnswerText
          }),
          topic: assessment?.subject || '',
          difficulty: assessment?.difficulty || '',
          time_taken: assessment?.time_limit ? (assessment.time_limit * 60) - timeLeft : 0,
          explanations: assessment?.questions.map((q, idx) => ({
            questionIndex: idx,
            explanation: q.explanation || "",
          })) || []
        }

        await api.post("/api/results", result)

        success("Assessment Complete!", `You scored ${score}/${assessment?.question_count}`)

        // Map user answers properly
        const mappedUserAnswers = answers.map((answerIndex, questionIndex) => {
          const question = assessment?.questions[questionIndex]
          const userAnswerText = answerIndex >= 0 && question?.options[answerIndex]
            ? question.options[answerIndex]
            : ''

          console.log(`📝 [ASSESSMENT] Question ${questionIndex + 1}: AnswerIndex=${answerIndex}, AnswerText="${userAnswerText}"`)

          return userAnswerText
        })

        console.log("📝 [ASSESSMENT] Mapped user answers:", mappedUserAnswers)

        const resultState = {
          score: score,
          totalQuestions: assessment?.question_count || 0,
          topic: assessment?.subject || '',
          difficulty: assessment?.difficulty || '',
          questions: assessment?.questions || [],
          userAnswers: mappedUserAnswers,
          timeTaken: assessment?.time_limit ? (assessment.time_limit * 60) - timeLeft : 0,
          explanations: assessment?.questions.map((q, idx) => ({
            questionIndex: idx,
            explanation: q.explanation || "",
          })) || []
        }

        navigate("/results", { state: resultState })
      }

    } catch (err: any) {
      console.error("❌ [ASSESSMENT] Error submitting test:", err)
      showError("Error", "Failed to submit test. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState size="lg" />
      </div>
    )
  }

  if (!assessment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <ErrorState
            title="Assessment Not Found"
            message="The assessment you're looking for doesn't exist or you don't have access to it."
            onBack={() => navigate("/dashboard")}
            backText="Return to Dashboard"
            showCard={true}
          />
        </Card>
      </div>
    )
  }

  if (testCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold text-green-400 mb-4">Test Completed!</h2>
          <p className="text-gray-300 mb-6">Your test has been submitted successfully. Redirecting to results...</p>
          <LoadingState size="md" />
        </Card>
      </div>
    )
  }

  if (!testStarted) {
    return (
      <div className="min-h-screen pt-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl font-bold text-white mb-4">{assessment.title}</h1>
            <p className="text-gray-300 text-lg">{assessment.description}</p>
            {assessmentType === 'teacher' && (
              <p className="text-blue-300 text-sm mt-2">Created by Teacher</p>
            )}
            {assessmentType === 'student' && (
              <p className="text-blue-300 text-sm mt-2">AI-Generated Assessment</p>
            )}
          </motion.div>

          <Card className="p-8 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400 mb-2">{assessment.question_count}</div>
                <div className="text-gray-300">Questions</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400 mb-2">{assessment.time_limit}</div>
                <div className="text-gray-300">Minutes</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400 mb-2">{assessment.difficulty}</div>
                <div className="text-gray-300">Difficulty</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-400 mb-2">{assessment.subject}</div>
                <div className="text-gray-300">Subject</div>
              </div>
            </div>

            <div className="text-center">
              <Button
                onClick={startTest}
                className="px-8 py-3 text-lg"
                variant="primary"
              >
                Start Test
              </Button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  const currentQuestion = assessment.questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / assessment.question_count) * 100

  console.log(`🔍 [ASSESSMENT] Current question index: ${currentQuestionIndex}`)
  console.log(`🔍 [ASSESSMENT] Current answer: ${answers[currentQuestionIndex]}`)
  console.log(`🔍 [ASSESSMENT] All answers:`, answers)

  return (
    <div className="min-h-screen pt-20 px-4 bg-gray-900">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-white">{assessment.title}</h1>
            <div className="text-right">
              <div className="text-2xl font-bold text-red-400">{formatTime(timeLeft)}</div>
              <div className="text-sm text-gray-400">Time Remaining</div>
            </div>
          </div>

          <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex justify-between text-sm text-gray-400">
            <span>Question {currentQuestionIndex + 1} of {assessment.question_count}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
        </motion.div>

        {/* Question */}
        <motion.div
          key={currentQuestionIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="p-8 mb-6">
            <h2 className="text-xl font-semibold text-white mb-6">
              {currentQuestion.question}
            </h2>

            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(currentQuestionIndex, index)}
                  className={`w-full p-4 text-left rounded-lg border transition-all duration-200 ${answers[currentQuestionIndex] === index
                      ? 'bg-blue-600 border-blue-400 text-white'
                      : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500'
                    }`}
                >
                  <div className="flex items-center">
                    <div className={`w-6 h-6 rounded-full border-2 mr-3 flex items-center justify-center ${answers[currentQuestionIndex] === index
                        ? 'border-white bg-white text-blue-600'
                        : 'border-gray-400'
                      }`}>
                      {answers[currentQuestionIndex] === index && '✓'}
                    </div>
                    <span>{String.fromCharCode(65 + index)}. {option}</span>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button
            onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
            disabled={currentQuestionIndex === 0}
            variant="secondary"
          >
            Previous
          </Button>

          <div className="flex space-x-2">
            {assessment.questions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${index === currentQuestionIndex
                    ? 'bg-blue-600 text-white'
                    : answers[index] !== -1
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          {currentQuestionIndex === assessment.questions.length - 1 ? (
            <Button
              onClick={handleSubmitTest}
              disabled={submitting}
              variant="primary"
            >
              {submitting ? 'Submitting...' : 'Submit Test'}
            </Button>
          ) : (
            <Button
              onClick={() => setCurrentQuestionIndex(Math.min(assessment.questions.length - 1, currentQuestionIndex + 1))}
              variant="primary"
            >
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default Assessment