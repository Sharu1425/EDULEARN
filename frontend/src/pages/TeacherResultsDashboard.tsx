"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { useToast } from "../contexts/ToastContext"
import Card from "../components/ui/Card"
import Button from "../components/ui/Button"
import AnimatedBackground from "../components/AnimatedBackground"
import PerformanceAnalytics from "../components/teacher/PerformanceAnalytics"
import api from "../utils/api"
import { ANIMATION_VARIANTS } from "../utils/constants"
import { AssessmentHistory } from "../components/teacher/assessment-management"

interface Student {
  id: string
  name: string
  email: string
  batch: string
  batch_id: string
  total_assessments: number
  average_score: number
  recent_average: number
  subject_averages: Record<string, number>
  last_activity: string | null
  performance_trend: "improving" | "declining" | "stable"
}

interface ClassStatistics {
  total_students: number
  class_average: number
  top_performers: Student[]
  struggling_students: Student[]
  students_with_recent_activity: number
}

interface AssessmentResult {
  result_id: string
  assessment_id: string
  assessment_title: string
  assessment_type: "regular" | "teacher_assigned" | "ai_generated" | "coding"
  subject: string
  difficulty: string
  score: number
  total_questions: number
  percentage: number
  time_taken: number
  submitted_at: string
  is_completed: boolean
}

interface StudentDetailedResults {
  student: {
    id: string
    name: string
    email: string
    batch: string
    batch_id: string
  }
  results: AssessmentResult[]
  performance_insights: {
    total_assessments: number
    completed_assessments: number
    average_score: number
    subject_performance: Record<string, any>
    recent_activity: AssessmentResult[]
  }
}

const TeacherResultsDashboard: React.FC = () => {
  const { error: showError } = useToast()
  const navigate = useNavigate()
  
  const [activeTab, setActiveTab] = useState<"overview" | "student-details">("overview")
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [classStatistics, setClassStatistics] = useState<ClassStatistics | null>(null)
  const [studentPerformance, setStudentPerformance] = useState<Student[]>([])
  const [studentDetailedResults, setStudentDetailedResults] = useState<StudentDetailedResults | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedBatch, setSelectedBatch] = useState<string>("all")
  const [recentAssessments, setRecentAssessments] = useState<any[]>([])

  useEffect(() => {
    fetchClassPerformance()
    fetchTeacherAssessments()
  }, [])

  const fetchTeacherAssessments = async () => {
    try {
      const res = await api.get("/api/teacher/assessments")
      if (Array.isArray(res.data)) {
        const recent = [...res.data]
          .sort((a: any, b: any) => new Date(b.created_at || b.createdAt || 0).getTime() - new Date(a.created_at || a.createdAt || 0).getTime())
          .slice(0, 5)
        setRecentAssessments(recent)
      }
    } catch (e) {
      console.warn("⚠️ [TEACHER RESULTS] Unable to fetch recent assessments", e)
    }
  }

  const fetchClassPerformance = async () => {
    try {
      setLoading(true)
      const response = await api.get("/api/assessments/teacher/class-performance")
      
      if (response.data.success) {
        setClassStatistics(response.data.class_statistics)
        setStudentPerformance(response.data.student_performance)
        console.log("✅ [TEACHER] Class performance loaded:", response.data.class_statistics)
      } else {
        showError("Error", "Failed to load class performance data")
      }
    } catch (err) {
      console.error("❌ [TEACHER] Failed to fetch class performance:", err)
      showError("Error", "Failed to load class performance data")
    } finally {
      setLoading(false)
    }
  }

  const fetchStudentDetailedResults = async (studentId: string) => {
    try {
      setLoading(true)
      const response = await api.get(`/api/assessments/teacher/student-results/${studentId}`)
      
      if (response.data.success) {
        setStudentDetailedResults(response.data)
        setActiveTab("student-details")
        console.log("✅ [TEACHER] Student detailed results loaded:", response.data.student.name)
      } else {
        showError("Error", "Failed to load student detailed results")
      }
    } catch (err) {
      console.error("❌ [TEACHER] Failed to fetch student results:", err)
      showError("Error", "Failed to load student detailed results")
    } finally {
      setLoading(false)
    }
  }

  const handleStudentClick = (student: Student) => {
    setSelectedStudent(student)
    fetchStudentDetailedResults(student.id)
  }

  const handleAssessmentClick = (assessmentId: string) => {
    navigate(`/teacher/assessment/${assessmentId}/results`)
  }

  const handleBackToOverview = () => {
    setActiveTab("overview")
    setSelectedStudent(null)
    setStudentDetailedResults(null)
  }

  const filteredStudents = selectedBatch === "all" 
    ? studentPerformance 
    : studentPerformance.filter(student => student.batch_id === selectedBatch)

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return "text-green-400"
    if (score >= 80) return "text-blue-400"
    if (score >= 60) return "text-yellow-400"
    return "text-red-400"
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "improving":
        return "📈"
      case "declining":
        return "📉"
      default:
        return "➡️"
    }
  }

  const getAssessmentTypeIcon = (type: string) => {
    switch (type) {
      case "regular":
        return "📝"
      case "teacher_assigned":
        return "👨‍🏫"
      case "ai_generated":
        return "🤖"
      case "coding":
        return "💻"
      default:
        return "📊"
    }
  }

  if (loading && !classStatistics) {
    return (
      <>
        <AnimatedBackground />
        <div className="min-h-screen pt-20 px-4 flex items-center justify-center relative z-10">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-blue-200 mb-4">Loading Results Dashboard...</h1>
            <p className="text-blue-300">Please wait while we load the performance data.</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <AnimatedBackground />
      <div className="min-h-screen pt-16 px-4 relative z-10">
        <motion.div
          variants={ANIMATION_VARIANTS.fadeIn}
          initial="initial"
          animate="animate"
          className="max-w-7xl mx-auto"
        >
          {/* Recent Tests Section */}
          <AssessmentHistory 
            recentAssessments={recentAssessments}
            onAssessmentClick={handleAssessmentClick}
          />

          {/* Header */}
          <Card className="p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-blue-200 mb-2">Assessment Results Dashboard</h1>
                <p className="text-blue-300">Comprehensive view of student performance across all assessments</p>
              </div>
              <Button 
                variant="secondary" 
                onClick={() => navigate("/teacher-dashboard")}
                className="flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Dashboard
              </Button>
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-blue-900/20 rounded-lg p-1">
              <button
                onClick={() => setActiveTab("overview")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "overview"
                    ? "bg-blue-500 text-white"
                    : "text-blue-300 hover:text-blue-200 hover:bg-blue-800/30"
                }`}
              >
                Class Overview
              </button>
              {selectedStudent && (
                <button
                  onClick={() => setActiveTab("student-details")}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "student-details"
                      ? "bg-blue-500 text-white"
                      : "text-blue-300 hover:text-blue-200 hover:bg-blue-800/30"
                  }`}
                >
                  {selectedStudent.name} - Detailed Results
                </button>
              )}
            </div>
          </Card>

          {/* Class Overview Tab */}
          {activeTab === "overview" && classStatistics && (
            <motion.div
              variants={ANIMATION_VARIANTS.slideUp}
              initial="initial"
              animate="animate"
            >
              {/* Class Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-300 text-sm font-medium">Total Students</p>
                      <p className="text-2xl font-bold text-blue-200">{classStatistics.total_students}</p>
                    </div>
                    <div className="w-10 h-10 bg-blue-500/30 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-300 text-sm font-medium">Class Average</p>
                      <p className="text-2xl font-bold text-blue-200">{classStatistics.class_average.toFixed(1)}%</p>
                    </div>
                    <div className="w-10 h-10 bg-green-500/30 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-300 text-sm font-medium">Top Performers</p>
                      <p className="text-2xl font-bold text-blue-200">{classStatistics.top_performers.length}</p>
                    </div>
                    <div className="w-10 h-10 bg-yellow-500/30 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-300 text-sm font-medium">Need Support</p>
                      <p className="text-2xl font-bold text-blue-200">{classStatistics.struggling_students.length}</p>
                    </div>
                    <div className="w-10 h-10 bg-red-500/30 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Top Performers */}
              {classStatistics.top_performers.length > 0 && (
                <Card className="p-6 mb-6">
                  <h3 className="text-xl font-semibold text-blue-200 mb-4 flex items-center gap-2">
                    <span className="text-yellow-400">🏆</span>
                    Top Performers
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {classStatistics.top_performers.map((student, index) => (
                      <motion.div
                        key={student.id}
                        variants={ANIMATION_VARIANTS.slideUp}
                        initial="initial"
                        animate="animate"
                        transition={{ delay: index * 0.1 }}
                        className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-lg p-4 cursor-pointer hover:from-yellow-500/20 hover:to-orange-500/20 transition-all"
                        onClick={() => handleStudentClick(student)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl">
                            {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                          </span>
                          <span className="text-yellow-400 font-bold">{student.average_score.toFixed(1)}%</span>
                        </div>
                        <h4 className="font-semibold text-blue-200">{student.name}</h4>
                        <p className="text-blue-300 text-sm">{student.batch}</p>
                        <p className="text-blue-400 text-xs mt-1">
                          {student.total_assessments} assessments • {getTrendIcon(student.performance_trend)}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Student Performance Table */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-blue-200">Student Performance</h3>
                  <div className="flex items-center gap-2">
                    <label className="text-blue-300 text-sm">Filter by batch:</label>
                    <select
                      value={selectedBatch}
                      onChange={(e) => setSelectedBatch(e.target.value)}
                      className="bg-blue-900/30 border border-blue-500/30 rounded-md px-3 py-1 text-blue-200 text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400"
                    >
                      <option value="all">All Batches</option>
                      {Array.from(new Set(studentPerformance.map(s => s.batch_id))).map(batchId => {
                        const student = studentPerformance.find(s => s.batch_id === batchId)
                        return (
                          <option key={batchId} value={batchId}>
                            {student?.batch || "Unknown Batch"}
                          </option>
                        )
                      })}
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-blue-500/30">
                        <th className="text-left py-3 px-4 text-blue-300 font-medium">Student</th>
                        <th className="text-left py-3 px-4 text-blue-300 font-medium">Batch</th>
                        <th className="text-left py-3 px-4 text-blue-300 font-medium">Avg Score</th>
                        <th className="text-left py-3 px-4 text-blue-300 font-medium">Recent Avg</th>
                        <th className="text-left py-3 px-4 text-blue-300 font-medium">Assessments</th>
                        <th className="text-left py-3 px-4 text-blue-300 font-medium">Trend</th>
                        <th className="text-left py-3 px-4 text-blue-300 font-medium">Last Activity</th>
                        <th className="text-left py-3 px-4 text-blue-300 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((student, index) => (
                        <motion.tr
                          key={student.id}
                          variants={ANIMATION_VARIANTS.slideUp}
                          initial="initial"
                          animate="animate"
                          transition={{ delay: index * 0.05 }}
                          className="border-b border-blue-500/20 hover:bg-blue-900/10 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div>
                              <p className="text-blue-200 font-medium">{student.name}</p>
                              <p className="text-blue-400 text-sm">{student.email}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-blue-300">{student.batch}</td>
                          <td className="py-3 px-4">
                            <span className={`font-semibold ${getPerformanceColor(student.average_score)}`}>
                              {student.average_score.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`font-semibold ${getPerformanceColor(student.recent_average)}`}>
                              {student.recent_average.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-blue-300">{student.total_assessments}</td>
                          <td className="py-3 px-4">
                            <span className="flex items-center gap-1">
                              {getTrendIcon(student.performance_trend)}
                              <span className="text-blue-300 text-sm capitalize">{student.performance_trend}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4 text-blue-300 text-sm">
                            {student.last_activity 
                              ? new Date(student.last_activity).toLocaleDateString()
                              : "No activity"
                            }
                          </td>
                          <td className="py-3 px-4">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleStudentClick(student)}
                              className="text-xs"
                            >
                              View Details
                            </Button>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Student Details Tab */}
          {activeTab === "student-details" && studentDetailedResults && (
            <motion.div
              variants={ANIMATION_VARIANTS.slideUp}
              initial="initial"
              animate="animate"
            >
              {/* Student Header */}
              <Card className="p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-blue-200 mb-2">
                      {studentDetailedResults.student.name}
                    </h2>
                    <p className="text-blue-300">
                      {studentDetailedResults.student.email} • {studentDetailedResults.student.batch}
                    </p>
                  </div>
                  <Button variant="secondary" onClick={handleBackToOverview}>
                    Back to Overview
                  </Button>
                </div>

                {/* Performance Insights */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-lg p-4">
                    <p className="text-blue-300 text-sm font-medium">Total Assessments</p>
                    <p className="text-2xl font-bold text-blue-200">
                      {studentDetailedResults.performance_insights.total_assessments}
                    </p>
                  </div>
                  <div className="bg-gradient-to-r from-green-500/20 to-green-600/20 border border-green-500/30 rounded-lg p-4">
                    <p className="text-green-300 text-sm font-medium">Average Score</p>
                    <p className="text-2xl font-bold text-green-200">
                      {studentDetailedResults.performance_insights.average_score.toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30 rounded-lg p-4">
                    <p className="text-yellow-300 text-sm font-medium">Completed</p>
                    <p className="text-2xl font-bold text-yellow-200">
                      {studentDetailedResults.performance_insights.completed_assessments}
                    </p>
                  </div>
                  <div className="bg-gradient-to-r from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-lg p-4">
                    <p className="text-purple-300 text-sm font-medium">Subjects</p>
                    <p className="text-2xl font-bold text-purple-200">
                      {Object.keys(studentDetailedResults.performance_insights.subject_performance).length}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Performance Analytics */}
              <PerformanceAnalytics studentId={studentDetailedResults.student.id} />

              {/* Assessment Results */}
              <Card className="p-6">
                <h3 className="text-xl font-semibold text-blue-200 mb-4">Assessment History</h3>
                <div className="space-y-4">
                  {studentDetailedResults.results.map((result, index) => (
                    <motion.div
                      key={result.result_id}
                      variants={ANIMATION_VARIANTS.slideUp}
                      initial="initial"
                      animate="animate"
                      transition={{ delay: index * 0.1 }}
                      className="bg-gradient-to-r from-blue-900/20 via-blue-800/10 to-blue-900/20 border border-blue-500/30 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getAssessmentTypeIcon(result.assessment_type)}</span>
                          <div>
                            <h4 className="font-semibold text-blue-200">{result.assessment_title}</h4>
                            <p className="text-blue-300 text-sm">
                              {result.subject} • {result.difficulty} • {result.assessment_type.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-2xl font-bold ${getPerformanceColor(result.percentage)}`}>
                            {result.percentage.toFixed(1)}%
                          </p>
                          <p className="text-blue-300 text-sm">
                            {result.score}/{result.total_questions} questions
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-blue-400">
                        <span>Time taken: {Math.floor(result.time_taken / 60)}m {result.time_taken % 60}s</span>
                        <span>Submitted: {new Date(result.submitted_at).toLocaleDateString()}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}
        </motion.div>
      </div>
    </>
  )
}

export default TeacherResultsDashboard
