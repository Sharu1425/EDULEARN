"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { useToast } from "../contexts/ToastContext"
import { useAuth } from "../hooks/useAuth"
import api from "../utils/api"
import Card from "../components/ui/Card"
import Button from "../components/ui/Button"
import AnimatedBackground from "../components/AnimatedBackground"
import { ANIMATION_VARIANTS } from "../utils/constants"
import TeacherThinkTraceAnalytics from "../components/teacher/TeacherThinkTraceAnalytics"

interface Student {
  id: string
  name: string
  email: string
  progress: number
  lastActive: string
  batch?: string
  batchId?: string
}

interface Batch {
  id: string
  name: string
  studentCount: number
  createdAt?: string
}

const TeacherDashboard: React.FC = () => {
  const { user } = useAuth()
  const { error: showError, success: showSuccess } = useToast()
  const navigate = useNavigate()

  const [students, setStudents] = useState<Student[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [sessionStarting, setSessionStarting] = useState(false)

  useEffect(() => {
    fetchDashboardData()
    return () => { }
  }, [])

  if (!user) {
    return (
      <div className="min-h-screen pt-20 px-4 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-blue-200 mb-4">Loading...</h1>
          <p className="text-blue-300">Please wait while we load your dashboard.</p>
        </div>
      </div>
    )
  }

  const fetchDashboardData = async () => {
    try {
      const studentsResponse = await api.get("/api/teacher/students")
      if (studentsResponse.data.success) {
        setStudents(studentsResponse.data.students)
      }

      const batchesResponse = await api.get("/api/teacher/batches")
      console.log("DEBUG [TEACHER] Raw batches response:", batchesResponse.data)
      
      if (batchesResponse.data && Array.isArray(batchesResponse.data)) {
        const formattedBatches = batchesResponse.data.map((batch: any) => {
          const bId = batch.id || batch._id || batch.batch_id
          const bName = batch.name || batch.batch_name || "Unnamed Batch"
          const bCount = batch.student_count || batch.total_students || 0
          
          return {
            id: bId,
            name: bName,
            studentCount: bCount,
            createdAt: batch.created_at || new Date().toISOString().split("T")[0],
          }
        }).filter(b => b.id) // Only include if has ID
        
        console.log("DEBUG [TEACHER] Formatted batches:", formattedBatches)
        setBatches(formattedBatches)
      } else {
        console.warn("DEBUG [TEACHER] Batches response not an array:", batchesResponse.data)
        setBatches([])
      }
    } catch (err) {
      console.error("❌ [TEACHER] Failed to fetch dashboard data:", err)
      showError("Error", "Failed to load dashboard data")
      setStudents([])
      setBatches([])
    } finally {
      setLoading(false)
    }
  }

  const handleNavigateToStudentManagement = () => navigate('/teacher/student-management')
  const handleNavigateToAssessmentManagement = () => navigate('/teacher/assessment-management')

  const handleStartLiveSession = async (batchId: string) => {
    if (!batchId) {
      showError("Error", "No batch ID provided")
      return
    }
    setSessionStarting(true)
    const liveWindow = window.open('', '_blank')
    if (liveWindow) {
      liveWindow.document.write('<h2 style="font-family:sans-serif;padding:2rem">Starting Live Session...</h2>')
    }
    try {
      const response = await api.post("/api/livesession/sessions/start", { batch_id: batchId })
      if (response.data && response.data.session_id) {
        const url = `/teacher/live/${batchId}`
        if (liveWindow) {
          liveWindow.location.href = url
        } else {
          navigate(url)
        }
        setShowBatchModal(false)
        showSuccess("Live Session Started", "Students will be notified. Opening console...")
      } else {
        if (liveWindow) liveWindow.close()
        showError("Error", "Unexpected response from server.")
      }
    } catch (err) {
      console.error("Failed to start session:", err)
      if (liveWindow) liveWindow.close()
      showError("Error", "Failed to start session")
    } finally {
      setSessionStarting(false)
    }
  }

  if (loading) {
    return (
      <>
        <AnimatedBackground />
        <div className="min-h-screen pt-20 px-4 flex items-center justify-center relative z-10">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Loading Teacher Dashboard...</h1>
            <p className="text-muted-foreground">Please wait while we load your data.</p>
          </div>
        </div>
      </>
    )
  }

  const selectableBatches = batches.filter(b => b.id !== 'all')

  return (
    <>
      <AnimatedBackground />
      <div className="min-h-screen pt-16 px-4 relative z-10">
        <motion.div
          variants={ANIMATION_VARIANTS.fadeIn}
          initial="initial"
          animate="animate"
          className="max-w-6xl mx-auto"
        >
          <Card className="p-6 mb-6">
            {/* Header */}
            <motion.div variants={ANIMATION_VARIANTS.slideDown} className="text-center mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-foreground mb-2">Teacher Dashboard</h1>
                  <p className="text-muted-foreground text-base">
                    Welcome back, {user?.name || user?.email || "Teacher"}!
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Quick Stats */}
            <motion.div
              variants={ANIMATION_VARIANTS.slideUp}
              initial="initial"
              animate="animate"
              className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6"
            >
              {[
                {
                  label: "Total Students", value: students.length,
                  color: "blue",
                  icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                },
                {
                  label: "Active Batches", value: selectableBatches.length,
                  color: "purple",
                  icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                },
                {
                  label: "Assessments", value: 12,
                  color: "green",
                  icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                },
                {
                  label: "Avg. Progress",
                  value: students.length > 0 ? `${Math.round(students.reduce((a, s) => a + s.progress, 0) / students.length)}%` : "0%",
                  color: "orange",
                  icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                },
              ].map((stat) => (
                <div key={stat.label} className={`bg-gradient-to-r from-${stat.color}-500/10 to-${stat.color}-600/10 dark:from-${stat.color}-500/20 dark:to-${stat.color}-600/20 border border-${stat.color}-500/30 rounded-lg p-3`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-xs font-medium">{stat.label}</p>
                      <p className="text-xl font-bold text-foreground">{stat.value}</p>
                    </div>
                    <div className={`w-6 h-6 bg-${stat.color}-500/20 rounded-full flex items-center justify-center`}>
                      <svg className={`w-3 h-3 text-${stat.color}-600 dark:text-${stat.color}-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Management Cards */}
            <motion.div
              variants={ANIMATION_VARIANTS.slideUp}
              initial="initial"
              animate="animate"
              className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
            >
              <Card className="p-5 h-full">
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Student Management</h3>
                </div>
                <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                  View and manage all your students, track their progress, and provide feedback.
                </p>
                <Button variant="primary" size="sm" className="w-full" onClick={handleNavigateToStudentManagement}>
                  Manage Students
                </Button>
              </Card>

              <Card className="p-5 h-full">
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Assessment Management</h3>
                </div>
                <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                  Create custom assessments and coding challenges for your students.
                </p>
                <Button variant="primary" size="sm" className="w-full" onClick={handleNavigateToAssessmentManagement}>
                  Manage Assessments
                </Button>
              </Card>

              <Card className="p-5 h-full">
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-red-500 to-rose-500 flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Live Sessions</h3>
                </div>
                <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                  Launch an AI-powered live classroom assessment room for one of your batches.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full bg-red-600 hover:bg-red-700"
                  onClick={() => setShowBatchModal(true)}
                >
                  🔴 Start Live Room
                </Button>
              </Card>
            </motion.div>

            {/* ThinkTrace Analytics */}
            <motion.div variants={ANIMATION_VARIANTS.slideUp} className="mb-6 border-t border-zinc-200 dark:border-zinc-800 pt-8 mt-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-foreground">ThinkTrace Intelligence Insights</h2>
                  <p className="text-sm text-muted-foreground mt-1">Class-wide cognitive tracking and adaptive interview performance.</p>
                </div>
              </div>
              <TeacherThinkTraceAnalytics />
            </motion.div>
          </Card>
        </motion.div>
      </div>

      {/* Batch Picker Modal */}
      <AnimatePresence>
        {showBatchModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => !sessionStarting && setShowBatchModal(false)}
            />

            {/* Modal */}
            <motion.div
              className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              {/* Header */}
              <div className="px-6 pt-6 pb-4 border-b border-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">Start Live Session</h2>
                      <p className="text-sm text-gray-400">Select a batch to begin</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowBatchModal(false)}
                    disabled={sessionStarting}
                    className="text-gray-500 hover:text-white transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Batch List */}
              <div className="p-6 space-y-3 max-h-80 overflow-y-auto">
                {selectableBatches.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <p className="text-sm">No batches found.</p>
                    <p className="text-xs mt-1">Create a batch via Student Management first.</p>
                  </div>
                ) : (
                  selectableBatches.map((batch) => (
                    <button
                      key={batch.id}
                      onClick={() => handleStartLiveSession(batch.id)}
                      disabled={sessionStarting}
                      className="w-full flex items-center justify-between p-4 rounded-xl bg-gray-800/60 border border-gray-700 hover:border-red-500/50 hover:bg-red-900/10 transition-all group disabled:opacity-50 disabled:cursor-not-allowed text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500/20 to-rose-600/20 flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-red-400">
                            {(batch.name || "?").charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-white group-hover:text-red-300 transition-colors">{batch.name}</p>
                          <p className="text-xs text-gray-400">{batch.studentCount} student{batch.studentCount !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {sessionStarting ? (
                          <span className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <span className="text-xs font-bold text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">Launch →</span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Footer hint */}
              <div className="px-6 py-4 border-t border-gray-800 bg-gray-950/50">
                <p className="text-xs text-gray-500 text-center">
                  A live console will open in a new tab. Students will be able to join using the session code.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default TeacherDashboard