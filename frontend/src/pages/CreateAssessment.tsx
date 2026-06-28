"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useNavigate, useSearchParams } from "react-router-dom"
import { 
  FileText, 
  Code, 
  Sparkles, 
  Plus, 
  Trash2, 
  ArrowLeft,
  Save,
  Eye,
  Users
} from "lucide-react"
import { useToast } from "../contexts/ToastContext"
import { useAuth } from "../hooks/useAuth"
import Card from "../components/ui/Card"
import Button from "../components/ui/Button"
import Input from "../components/ui/Input"
import api from "../utils/api"
import { ANIMATION_VARIANTS } from "../utils/constants"
import { getErrorMessage } from "../utils/errorHandler"

type AssessmentType = "ai" | "mcq" | "ai_coding"

interface Batch {
  id: string
  name: string
  studentCount: number
  createdAt: string
}

interface Question {
  question: string
  options: string[]
  correct_answer: number
  explanation: string
}

const CreateAssessment: React.FC = () => {
  const { user } = useAuth()
  const { success, error: showError } = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  const [activeType, setActiveType] = useState<AssessmentType>(
    (searchParams.get("type") as AssessmentType) || "mcq"
  )
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [batches, setBatches] = useState<Batch[]>([])
  
  // Common fields
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [difficulty, setDifficulty] = useState("medium")
  const [timeLimit, setTimeLimit] = useState(30)
  const [selectedBatches, setSelectedBatches] = useState<string[]>([])
  
  // AI Generation fields
  const [topic, setTopic] = useState("")
  const [questionCount, setQuestionCount] = useState(10)
  
  // MCQ fields
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    question: "",
    options: ["", "", "", ""],
    correct_answer: 0,
    explanation: ""
  })
  
  // Preview state
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    fetchBatches()
  }, [])

  const fetchBatches = async () => {
    try {
      const response = await api.get("/api/teacher/batches")
      if (response.data && Array.isArray(response.data)) {
        const formattedBatches = response.data.map((batch: any) => ({
          id: batch.id,
          name: batch.name,
          studentCount: batch.student_count,
          createdAt: batch.created_at
        }))
        setBatches(formattedBatches)
      }
    } catch (err: any) {
      console.error("Failed to fetch batches:", err)
    }
  }

  const assessmentTypes = [
    {
      id: "mcq" as AssessmentType,
      name: "Manual MCQ",
      icon: FileText,
      color: "blue",
      description: "Create multiple choice questions manually"
    },
    {
      id: "ai" as AssessmentType,
      name: "AI Generated",
      icon: Sparkles,
      color: "purple",
      description: "Generate questions automatically using AI"
    },
    {
      id: "ai_coding" as AssessmentType,
      name: "AI Coding",
      icon: Code,
      color: "blue",
      description: "Create and auto-grade AI-powered coding problems"
    },
  ]

  const validateBasicInfo = () => {
    if (!title.trim()) {
      showError("Validation Error", "Please enter an assessment title")
      return false
    }
    if (title.length > 200) {
      showError("Validation Error", "Title must be less than 200 characters")
      return false
    }
    if (selectedBatches.length === 0) {
      showError("Validation Error", "Please select at least one batch")
      return false
    }
    return true
  }

  const handleAddQuestion = () => {
    if (!currentQuestion.question.trim()) {
      showError("Validation Error", "Please enter a question")
      return
    }
    
    const filledOptions = currentQuestion.options.filter(opt => opt.trim() !== "")
    if (filledOptions.length < 2) {
      showError("Validation Error", "Please provide at least 2 options")
      return
    }
    
    if (filledOptions.length > 6) {
      showError("Validation Error", "Maximum 6 options allowed")
      return
    }

    setQuestions([...questions, currentQuestion])
    setCurrentQuestion({
      question: "",
      options: ["", "", "", ""],
      correct_answer: 0,
      explanation: ""
    })
    success("Question Added", `Question ${questions.length + 1} added successfully`)
  }

  const handleRemoveQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index))
    success("Question Removed", "Question removed successfully")
  }

  const handleCreateAssessment = async () => {
    console.log("🎯 [CREATE-ASSESSMENT] Starting assessment creation process")
    console.log("📝 [CREATE-ASSESSMENT] Assessment details:", {
      title,
      type: activeType,
      difficulty,
      selectedBatches,
      topic: activeType === "ai" ? topic : undefined,
      questionCount: activeType === "ai" ? questionCount : undefined,
      questionsCount: activeType === "mcq" ? questions.length : undefined
    })
    
    if (!validateBasicInfo()) return

    setLoading(true)
    try {
      let response

      if (activeType === "ai") {
        if (!topic.trim()) {
          showError("Validation Error", "Please enter a topic")
          setLoading(false)
          return
        }
        if (questionCount < 1 || questionCount > 100) {
          showError("Validation Error", "Question count must be between 1 and 100")
          setLoading(false)
          return
        }

        console.log("🤖 [CREATE-ASSESSMENT] Creating AI-generated assessment...")
        const assessmentData = {
          title,
          topic,
          difficulty,
          question_count: questionCount,
          batches: selectedBatches,
          type: "ai_generated"
        }
        console.log("📤 [CREATE-ASSESSMENT] Sending assessment data:", assessmentData)
        
        response = await api.post("/api/teacher/assessments/create", assessmentData)
        console.log("📥 [CREATE-ASSESSMENT] Assessment creation response:", response.data)
        
      } else if (activeType === "mcq") {
        if (questions.length === 0) {
          showError("Validation Error", "Please add at least one question")
          setLoading(false)
          return
        }

        console.log("📝 [CREATE-ASSESSMENT] Creating manual MCQ assessment...")
        const assessmentData = {
          title,
          description,
          difficulty,
          questions,
          batches: selectedBatches,
          time_limit: timeLimit,
          type: "mcq",
          question_count: questions.length
        }
        console.log("📤 [CREATE-ASSESSMENT] Sending assessment data:", assessmentData)
        
        response = await api.post("/api/teacher/assessments/create", assessmentData)
        console.log("📥 [CREATE-ASSESSMENT] Assessment creation response:", response.data)
        
      } else if (activeType === "ai_coding") {
        if (!topic.trim()) {
          showError("Validation Error", "Please enter a topic for the AI Coding assessment.")
          setLoading(false)
          return
        }
        if (questionCount < 1 || questionCount > 50) {
          showError("Validation Error", "Number of questions must be between 1 and 50 for AI Coding.")
          setLoading(false)
          return
        }

        console.log("💻 [CREATE-ASSESSMENT] Creating AI coding assessment...")
        const assessmentData = {
          title,
          description,
          difficulty,
          topic,
          question_count: questionCount,
          type: "ai_coding",
          time_limit: timeLimit,
          batches: selectedBatches
        }
        console.log("📤 [CREATE-ASSESSMENT] Sending assessment data:", assessmentData)
        
        response = await api.post("/api/teacher/assessments/create", assessmentData)
        console.log("📥 [CREATE-ASSESSMENT] Assessment creation response:", response.data)
      }

      if (response?.data) {
        const assessmentId = response.data.assessment_id || response.data.id
        console.log("✅ [CREATE-ASSESSMENT] Assessment created successfully! ID:", assessmentId)

        // Always assign batches for teacher-created assessments
        if (selectedBatches.length > 0 && assessmentId) {
          console.log("🔗 [CREATE-ASSESSMENT] Assigning batches to assessment...")
          console.log("📤 [CREATE-ASSESSMENT] Batch IDs to assign:", selectedBatches)
          
          try {
            const assignResponse = await api.post(`/api/assessments/teacher/${assessmentId}/assign-batches`, selectedBatches)
            console.log("✅ [CREATE-ASSESSMENT] Batch assignment successful:", assignResponse.data)
          } catch (err) {
            console.error("❌ [CREATE-ASSESSMENT] Failed to assign batches:", err)
            const errorMessage = getErrorMessage(err, "Failed to assign batches")
            showError("Batch Assignment Failed", errorMessage)
            return
          }
        }

        // Publish teacher assessment so students can see it
        console.log("📢 [CREATE-ASSESSMENT] Publishing assessment...")
        try {
          const publishResponse = await api.post(`/api/assessments/teacher/${assessmentId}/publish`)
          console.log("✅ [CREATE-ASSESSMENT] Assessment published successfully:", publishResponse.data)
        } catch (err) {
          console.error("❌ [CREATE-ASSESSMENT] Failed to publish assessment:", err)
          const errorMessage = getErrorMessage(err, "Failed to publish assessment")
          showError("Publish Failed", errorMessage)
          return
        }

        console.log("🎉 [CREATE-ASSESSMENT] Complete assessment creation flow successful!")
        success("Assessment Published", response.data.message || "Assessment published and assigned!")
        navigate("/teacher/assessment-management")
      }
    } catch (err: any) {
      console.error("❌ [CREATE-ASSESSMENT] Failed to create assessment:", err)
      const errorMessage = getErrorMessage(err, "Failed to create assessment")
      showError("Creation Failed", errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const renderTypeSelector = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {assessmentTypes.map((type) => {
        const Icon = type.icon
        const isActive = activeType === type.id
        return (
          <motion.button
            key={type.id}
            onClick={() => setActiveType(type.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`p-6 rounded-xl border-2 transition-all ${
              isActive
                ? `border-${type.color}-500 bg-${type.color}-500/20`
                : "border-border bg-card hover:border-muted"
            }`}
          >
            <Icon className={`h-12 w-12 mx-auto mb-3 ${isActive ? `text-${type.color}-400` : "text-muted-foreground"}`} />
            <h3 className={`text-lg font-semibold mb-2 ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
              {type.name}
            </h3>
            <p className="text-sm text-muted-foreground">{type.description}</p>
          </motion.button>
        )
      })}
    </div>
  )

  const renderBasicInfo = () => (
    <Card className="p-6 mb-6">
      <h3 className="text-xl font-bold text-foreground mb-4">Basic Information</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Assessment Title *</label>
          <Input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter assessment title"
            maxLength={200}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground mt-1">{title.length}/200 characters</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter assessment description (optional)"
            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Difficulty *</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Time Limit (minutes) *</label>
            <Input
              type="number"
              value={timeLimit}
              onChange={(e) => setTimeLimit(Number(e.target.value))}
              min={1}
              max={300}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </Card>
  )

  const renderAIGenerationForm = () => (
    <Card className="p-6 mb-6">
      <h3 className="text-xl font-bold text-foreground mb-4">AI Generation Settings</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Topic *</label>
          <Input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., Python Basics, Data Structures, etc."
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Number of Questions *</label>
          <Input
            type="number"
            value={questionCount}
            onChange={(e) => setQuestionCount(Number(e.target.value))}
            min={1}
            max={100}
            className="w-full"
          />
        </div>

        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
          <h4 className="font-semibold text-emerald-400 mb-2">AI Features</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>✓ Automatically generates questions based on topic</li>
            <li>✓ Adaptive difficulty levels</li>
            <li>✓ Includes explanations for answers</li>
            <li>✓ Covers comprehensive topic understanding</li>
          </ul>
        </div>
      </div>
    </Card>
  )

  const renderMCQForm = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-xl font-bold text-foreground mb-4">Add Question</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Question *</label>
            <textarea
              value={currentQuestion.question}
              onChange={(e) => setCurrentQuestion({ ...currentQuestion, question: e.target.value })}
              placeholder="Enter your question"
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Options (2-6) *</label>
            {currentQuestion.options.map((option, index) => (
              <div key={index} className="flex items-center gap-2 mb-2">
                <input
                  type="radio"
                  name="correct_answer"
                  checked={currentQuestion.correct_answer === index}
                  onChange={() => setCurrentQuestion({ ...currentQuestion, correct_answer: index })}
                  className="w-4 h-4"
                />
                <Input
                  type="text"
                  value={option}
                  onChange={(e) => {
                    const newOptions = [...currentQuestion.options]
                    newOptions[index] = e.target.value
                    setCurrentQuestion({ ...currentQuestion, options: newOptions })
                  }}
                  placeholder={`Option ${index + 1}${index < 2 ? " (required)" : " (optional)"}`}
                  className="flex-1"
                />
              </div>
            ))}
            <p className="text-xs text-muted-foreground mt-1">Select the radio button for the correct answer</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Explanation (Optional)</label>
            <textarea
              value={currentQuestion.explanation}
              onChange={(e) => setCurrentQuestion({ ...currentQuestion, explanation: e.target.value })}
              placeholder="Explain why this is the correct answer"
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              rows={2}
            />
          </div>

          <Button onClick={handleAddQuestion} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </Button>
        </div>
      </Card>

      {questions.length > 0 && (
        <Card className="p-6">
          <h3 className="text-xl font-bold text-foreground mb-4">Questions Added ({questions.length})</h3>
          <div className="space-y-3">
            {questions.map((q, index) => (
              <div key={index} className="p-4 bg-muted/30 rounded-lg border border-border">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium text-foreground mb-2">{index + 1}. {q.question}</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {q.options.filter(opt => opt.trim()).map((opt, i) => (
                        <li key={i} className={q.correct_answer === i ? "text-green-400 font-medium" : ""}>
                          {String.fromCharCode(65 + i)}. {opt} {q.correct_answer === i && "✓"}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveQuestion(index)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )

  const renderBatchSelection = () => (
    <Card className="p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-5 w-5 text-primary" />
        <h3 className="text-xl font-bold text-foreground">Assign to Batches *</h3>
      </div>
      <div className="space-y-3">
        {batches.length === 0 ? (
          <p className="text-muted-foreground">No batches available. Create a batch first.</p>
        ) : (
          <>
            {batches.map((batch) => (
              <div
                key={batch.id}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedBatches.includes(batch.id)
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-muted"
                }`}
                onClick={() => {
                  setSelectedBatches(prev =>
                    prev.includes(batch.id)
                      ? prev.filter(id => id !== batch.id)
                      : [...prev, batch.id]
                  )
                }}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedBatches.includes(batch.id)}
                    onChange={() => {}}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">{batch.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {batch.studentCount} students • Created {new Date(batch.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
      {selectedBatches.length > 0 && (
        <div className="mt-4 p-3 bg-primary/10 rounded-lg">
          <p className="text-sm text-foreground">
            Selected {selectedBatches.length} batch{selectedBatches.length !== 1 ? "es" : ""}
          </p>
        </div>
      )}
    </Card>
  )

  return (
    <div className="px-4 py-6 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button
            variant="ghost"
            onClick={() => navigate("/teacher/assessment-management")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Assessment Management
          </Button>
          
          <h1 className="text-4xl font-bold text-foreground mb-2">Create Assessment</h1>
          <p className="text-muted-foreground">Choose a type and create your assessment</p>
        </motion.div>

        {renderTypeSelector()}
        {renderBasicInfo()}

        {activeType === "ai" && renderAIGenerationForm()}
        {activeType === "mcq" && renderMCQForm()}
        {activeType === "ai_coding" && (
          <Card className="p-6 mb-6">
            <h3 className="text-xl font-bold text-foreground mb-4">AI Coding Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label htmlFor="topic" className="block font-medium mb-1">Topics <span className="text-red-500">*</span></label>
                <Input
                  id="topic"
                  type="text"
                  placeholder="Enter topic (e.g., Data Structures, Loops)"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="questionCount" className="block font-medium mb-1">Number of Questions <span className="text-red-500">*</span></label>
                <Input
                  id="questionCount"
                  type="number"
                  min={1}
                  max={50}
                  value={questionCount}
                  onChange={e => setQuestionCount(Number(e.target.value))}
                  required
                />
              </div>
            </div>
            <div className="bg-primary-800 p-4 rounded-lg border border-primary-500/30 mb-4">
              <h4 className="text-lg font-bold mb-2 text-primary-200">AI Coding Challenge Features</h4>
              <ul className="list-disc pl-6 text-primary-300 text-base space-y-1">
                <li>Real-time code execution and testing</li>
                <li>Multiple programming languages supported</li>
                <li>Automated test case generation</li>
                <li>Performance and complexity analysis</li>
              </ul>
            </div>
            {/* Other settings if necessary... */}
          </Card>
        )}

        {renderBatchSelection()}

        <div className="flex gap-4 justify-end">
          <Button
            variant="secondary"
            onClick={() => setShowPreview(!showPreview)}
            disabled={activeType === "mcq" && questions.length === 0}
          >
            <Eye className="h-4 w-4 mr-2" />
            {showPreview ? "Hide" : "Show"} Preview
          </Button>
          <Button
            onClick={handleCreateAssessment}
            disabled={loading}
            className="min-w-[200px]"
          >
            {loading ? (
              "Creating..."
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create Assessment
              </>
            )}
          </Button>
        </div>

        {showPreview && (
          <Card className="p-6 mt-6 border-2 border-primary/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                Assessment Preview
              </h3>
              <span className="text-sm text-muted-foreground">Student View</span>
            </div>
            
            <div className="bg-muted/30 rounded-lg p-6 space-y-6">
              {/* Header */}
              <div className="border-b border-border pb-4">
                <h4 className="font-bold text-2xl text-foreground mb-2">{title || "Untitled Assessment"}</h4>
                {description && <p className="text-muted-foreground">{description}</p>}
                <div className="flex gap-6 text-sm text-muted-foreground mt-3">
                  <span className="flex items-center gap-1">
                    <span className="font-medium">Difficulty:</span>
                    <span className={`capitalize font-semibold ${
                      difficulty === "easy" ? "text-green-500" :
                      difficulty === "medium" ? "text-yellow-500" :
                      "text-red-500"
                    }`}>{difficulty}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="font-medium">Time Limit:</span>
                    <span className="text-foreground font-semibold">{timeLimit} minutes</span>
                  </span>
                  {activeType === "mcq" && questions.length > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="font-medium">Questions:</span>
                      <span className="text-foreground font-semibold">{questions.length}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Questions Preview */}
              {activeType === "mcq" && questions.length > 0 ? (
                <div className="space-y-6">
                  <h5 className="font-semibold text-foreground">Sample Questions:</h5>
                  {questions.slice(0, 3).map((q, index) => (
                    <div key={index} className="bg-background rounded-lg p-4 border border-border">
                      <p className="font-medium text-foreground mb-3">
                        Question {index + 1}: {q.question}
                      </p>
                      <div className="space-y-2">
                        {q.options.filter(opt => opt.trim()).map((option, optIndex) => (
                          <div
                            key={optIndex}
                            className={`p-3 rounded-md border transition-colors ${
                              q.correct_answer === optIndex
                                ? "border-green-500/50 bg-green-500/10"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                q.correct_answer === optIndex
                                  ? "border-green-500 bg-green-500"
                                  : "border-muted-foreground"
                              }`}>
                                {q.correct_answer === optIndex && (
                                  <span className="text-white text-xs">✓</span>
                                )}
                              </div>
                              <span className="text-foreground">{option}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {q.explanation && (
                        <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-md">
                          <p className="text-sm text-blue-300">
                            <span className="font-semibold">Explanation:</span> {q.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                  {questions.length > 3 && (
                    <p className="text-sm text-muted-foreground text-center">
                      ... and {questions.length - 3} more question{questions.length - 3 !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              ) : activeType === "ai" ? (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                  <p className="text-foreground">
                    <span className="font-semibold text-emerald-400">AI-Generated Assessment</span>
                    <br />
                    <span className="text-sm text-muted-foreground">
                      {questionCount} questions will be automatically generated on topic: <span className="font-semibold text-foreground">{topic || "Not specified"}</span>
                    </span>
                  </p>
                </div>
              ) : activeType === "ai_coding" ? (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                  <p className="text-foreground">
                    <span className="font-semibold text-emerald-400">AI Coding Assessment</span>
                    <br />
                    <span className="text-sm text-muted-foreground">
                      {questionCount} coding problems will be automatically generated on topic: <span className="font-semibold text-foreground">{topic || "Not specified"}</span>
                    </span>
                  </p>
                </div>
              ) : null}

              {/* Assignment Info */}
              {selectedBatches.length > 0 && (
                <div className="border-t border-border pt-4">
                  <h5 className="font-semibold text-foreground mb-2">Assigned To:</h5>
                  <div className="flex flex-wrap gap-2">
                    {batches
                      .filter(b => selectedBatches.includes(b.id))
                      .map((batch) => (
                        <span
                          key={batch.id}
                          className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-medium"
                        >
                          {batch.name} ({batch.studentCount} students)
                        </span>
                      ))}

                  </div>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

export default CreateAssessment


