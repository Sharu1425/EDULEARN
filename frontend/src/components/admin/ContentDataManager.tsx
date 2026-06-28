/**
 * Content & Data Manager Component
 * Admin interface for viewing and managing database content (Assessments, Questions, Results)
 */
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Database,
  FileText,
  HelpCircle,
  TrendingUp,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  RefreshCw,
} from 'lucide-react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import LoadingState from '../LoadingState'
import ErrorState from '../ErrorState'
import { useToast } from '../../contexts/ToastContext'
import api from '../../utils/api'

interface Assessment {
  id: string
  title: string
  subject: string
  difficulty: string
  type: string
  question_count: number
  status: string
  is_active: boolean
  created_by: string
  created_at: string
  assigned_batches: string[]
}

interface Question {
  id: string
  assessment_id: string
  question_number: number
  question: string
  options: string[]
  correct_answer: string
  explanation: string
  difficulty: string
  topic: string
  status: string
  teacher_name: string
  generated_at: string
}

interface Result {
  id: string
  type: string
  student_id: string
  student_name: string
  assessment_id: string
  assessment_title: string
  score: number
  total_questions: number
  percentage: number
  time_taken: number
  submitted_at: string
}

const ContentDataManager: React.FC = () => {
  const { success, error: showError } = useToast()
  const [activeTab, setActiveTab] = useState<'assessments' | 'questions' | 'results'>('assessments')

  // Assessments state
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [assessmentsLoading, setAssessmentsLoading] = useState(false)
  const [assessmentsError, setAssessmentsError] = useState<string | null>(null)
  const [assessmentSearch, setAssessmentSearch] = useState('')

  // Questions state
  const [questions, setQuestions] = useState<Question[]>([])
  const [questionsLoading, setQuestionsLoading] = useState(false)
  const [questionsError, setQuestionsError] = useState<string | null>(null)
  const [questionSearch, setQuestionSearch] = useState('')

  // Results state
  const [results, setResults] = useState<Result[]>([])
  const [resultsLoading, setResultsLoading] = useState(false)
  const [resultsError, setResultsError] = useState<string | null>(null)
  const [resultSearch, setResultSearch] = useState('')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  // Fetch Assessments
  const fetchAssessments = async () => {
    setAssessmentsLoading(true)
    setAssessmentsError(null)
    try {
      const response = await api.get('/api/admin/content/assessments', {
        params: { skip: 0, limit: 100 }
      })
      setAssessments(response.data.assessments || [])
    } catch (err: any) {
      setAssessmentsError(err.response?.data?.detail || 'Failed to load assessments')
    } finally {
      setAssessmentsLoading(false)
    }
  }

  // Fetch Questions
  const fetchQuestions = async () => {
    setQuestionsLoading(true)
    setQuestionsError(null)
    try {
      const response = await api.get('/api/admin/content/questions', {
        params: { skip: 0, limit: 100 }
      })
      setQuestions(response.data.questions || [])
    } catch (err: any) {
      setQuestionsError(err.response?.data?.detail || 'Failed to load questions')
    } finally {
      setQuestionsLoading(false)
    }
  }

  // Fetch Results
  const fetchResults = async () => {
    setResultsLoading(true)
    setResultsError(null)
    try {
      const response = await api.get('/api/admin/content/results', {
        params: { skip: 0, limit: 100 }
      })
      setResults(response.data.results || [])
    } catch (err: any) {
      setResultsError(err.response?.data?.detail || 'Failed to load results')
    } finally {
      setResultsLoading(false)
    }
  }

  // Delete Assessment
  const handleDeleteAssessment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this assessment? This will also delete all related questions and results.')) return

    try {
      await api.delete(`/api/admin/content/assessments/${id}`)
      success('Assessment Deleted', 'Assessment and related data deleted successfully')
      fetchAssessments()
    } catch (err: any) {
      showError('Delete Failed', err.response?.data?.detail || 'Failed to delete assessment')
    }
  }

  // Delete Question
  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return

    try {
      await api.delete(`/api/admin/content/questions/${id}`)
      success('Question Deleted', 'Question deleted successfully')
      fetchQuestions()
    } catch (err: any) {
      showError('Delete Failed', err.response?.data?.detail || 'Failed to delete question')
    }
  }

  // Delete Result
  const handleDeleteResult = async (id: string) => {
    if (!confirm('Are you sure you want to delete this result?')) return

    try {
      await api.delete(`/api/admin/content/results/${id}`)
      success('Result Deleted', 'Result deleted successfully')
      fetchResults()
    } catch (err: any) {
      showError('Delete Failed', err.response?.data?.detail || 'Failed to delete result')
    }
  }

  // Toggle Assessment Active Status
  const handleToggleAssessmentStatus = async (id: string, currentStatus: boolean) => {
    try {
      await api.put(`/api/admin/content/assessments/${id}`, {
        is_active: !currentStatus
      })
      success('Status Updated', `Assessment ${!currentStatus ? 'activated' : 'deactivated'} successfully`)
      fetchAssessments()
    } catch (err: any) {
      showError('Update Failed', err.response?.data?.detail || 'Failed to update assessment status')
    }
  }

  useEffect(() => {
    if (activeTab === 'assessments') fetchAssessments()
    else if (activeTab === 'questions') fetchQuestions()
    else if (activeTab === 'results') fetchResults()
  }, [activeTab])

  // Filter data based on search
  const filteredAssessments = assessments.filter(a =>
    a.title.toLowerCase().includes(assessmentSearch.toLowerCase()) ||
    a.subject.toLowerCase().includes(assessmentSearch.toLowerCase()) ||
    a.created_by.toLowerCase().includes(assessmentSearch.toLowerCase())
  )

  const filteredQuestions = questions.filter(q =>
    q.question.toLowerCase().includes(questionSearch.toLowerCase()) ||
    q.topic.toLowerCase().includes(questionSearch.toLowerCase()) ||
    q.teacher_name.toLowerCase().includes(questionSearch.toLowerCase())
  )

  const filteredResults = results.filter(r =>
    r.student_name.toLowerCase().includes(resultSearch.toLowerCase()) ||
    r.assessment_title.toLowerCase().includes(resultSearch.toLowerCase())
  )

  // Pagination
  const getPaginatedData = (data: any[]) => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return data.slice(startIndex, endIndex)
  }

  const totalPages = (data: any[]) => Math.ceil(data.length / itemsPerPage)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Content & Data Manager</h2>
          <p className="text-muted-foreground mt-1">View and manage platform database content</p>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            if (activeTab === 'assessments') fetchAssessments()
            else if (activeTab === 'questions') fetchQuestions()
            else if (activeTab === 'results') fetchResults()
          }}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => {
            setActiveTab('assessments')
            setCurrentPage(1)
          }}
          className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'assessments'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="h-4 w-4" />
          Assessments ({assessments.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('questions')
            setCurrentPage(1)
          }}
          className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'questions'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <HelpCircle className="h-4 w-4" />
          Questions ({questions.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('results')
            setCurrentPage(1)
          }}
          className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'results'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Results ({results.length})
        </button>
      </div>

      {/* Assessments Tab */}
      {activeTab === 'assessments' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card className="p-6">
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search assessments by title, subject, or creator..."
                  value={assessmentSearch}
                  onChange={(e) => setAssessmentSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
                />
              </div>
            </div>

            {assessmentsLoading ? (
              <LoadingState message="Loading assessments..." />
            ) : assessmentsError ? (
              <ErrorState message={assessmentsError} />
            ) : filteredAssessments.length === 0 ? (
              <div className="text-center py-12">
                <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No assessments found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Title</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Subject</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Type</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Difficulty</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Questions</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Status</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Created By</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getPaginatedData(filteredAssessments).map((assessment) => (
                        <tr key={assessment.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 text-sm text-foreground">{assessment.title}</td>
                          <td className="px-4 py-3 text-sm text-foreground">{assessment.subject}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              assessment.type === 'manual' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
                            }`}>
                              {assessment.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              assessment.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                              assessment.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {assessment.difficulty}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-foreground">{assessment.question_count}</td>
                          <td className="px-4 py-3 text-sm">
                            <button
                              onClick={() => handleToggleAssessmentStatus(assessment.id, assessment.is_active)}
                              className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 ${
                                assessment.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                              }`}
                            >
                              {assessment.is_active ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                              {assessment.is_active ? 'Active' : 'Inactive'}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-sm text-foreground">{assessment.created_by}</td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleDeleteAssessment(assessment.id)}
                                className="p-1 hover:bg-red-500/20 rounded text-red-400 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages(filteredAssessments) > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <Button
                      variant="secondary"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => p - 1)}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-foreground">
                      Page {currentPage} of {totalPages(filteredAssessments)}
                    </span>
                    <Button
                      variant="secondary"
                      disabled={currentPage === totalPages(filteredAssessments)}
                      onClick={() => setCurrentPage(p => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </Card>
        </motion.div>
      )}

      {/* Questions Tab */}
      {activeTab === 'questions' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card className="p-6">
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search questions by content, topic, or teacher..."
                  value={questionSearch}
                  onChange={(e) => setQuestionSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
                />
              </div>
            </div>

            {questionsLoading ? (
              <LoadingState message="Loading questions..." />
            ) : questionsError ? (
              <ErrorState message={questionsError} />
            ) : filteredQuestions.length === 0 ? (
              <div className="text-center py-12">
                <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No questions found</p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {getPaginatedData(filteredQuestions).map((question) => (
                    <div key={question.id} className="p-4 bg-card rounded-lg border border-border hover:border-blue-500/50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-semibold text-muted-foreground">Q{question.question_number}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                              question.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                              question.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {question.difficulty}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-400">
                              {question.topic}
                            </span>
                          </div>
                          <p className="text-sm text-foreground mb-2">{question.question}</p>
                          <div className="text-xs text-muted-foreground">
                            Created by: {question.teacher_name} • {new Date(question.generated_at).toLocaleDateString()}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteQuestion(question.id)}
                          className="p-2 hover:bg-red-500/20 rounded text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages(filteredQuestions) > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <Button
                      variant="secondary"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => p - 1)}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-foreground">
                      Page {currentPage} of {totalPages(filteredQuestions)}
                    </span>
                    <Button
                      variant="secondary"
                      disabled={currentPage === totalPages(filteredQuestions)}
                      onClick={() => setCurrentPage(p => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </Card>
        </motion.div>
      )}

      {/* Results Tab */}
      {activeTab === 'results' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card className="p-6">
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search results by student or assessment..."
                  value={resultSearch}
                  onChange={(e) => setResultSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
                />
              </div>
            </div>

            {resultsLoading ? (
              <LoadingState message="Loading results..." />
            ) : resultsError ? (
              <ErrorState message={resultsError} />
            ) : filteredResults.length === 0 ? (
              <div className="text-center py-12">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No results found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Student</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Assessment</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Score</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Percentage</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Time Taken</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Submitted</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getPaginatedData(filteredResults).map((result) => (
                        <tr key={result.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 text-sm text-foreground">{result.student_name}</td>
                          <td className="px-4 py-3 text-sm text-foreground">{result.assessment_title}</td>
                          <td className="px-4 py-3 text-sm text-foreground">
                            {result.score}/{result.total_questions}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              result.percentage >= 80 ? 'bg-green-500/20 text-green-400' :
                              result.percentage >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {result.percentage.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-foreground">{Math.round(result.time_taken / 60)}m</td>
                          <td className="px-4 py-3 text-sm text-foreground">
                            {new Date(result.submitted_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <button
                              onClick={() => handleDeleteResult(result.id)}
                              className="p-1 hover:bg-red-500/20 rounded text-red-400 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages(filteredResults) > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <Button
                      variant="secondary"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => p - 1)}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-foreground">
                      Page {currentPage} of {totalPages(filteredResults)}
                    </span>
                    <Button
                      variant="secondary"
                      disabled={currentPage === totalPages(filteredResults)}
                      onClick={() => setCurrentPage(p => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </Card>
        </motion.div>
      )}
    </div>
  )
}

export default ContentDataManager

