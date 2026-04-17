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
import { ANIMATION_VARIANTS } from "../utils/constants"
import { Sparkles, Users, BookOpen, Video, BarChart3 } from "lucide-react"

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
      <div className="min-h-screen pt-20 px-4 flex items-center justify-center relative z-10">
        <div className="text-center">
          <Sparkles className="h-8 w-8 mx-auto mb-4 text-cyan-400 animate-pulse" />
          <h1 className="text-2xl font-bold gradient-text mb-2">Loading Teacher Dashboard...</h1>
          <p className="text-muted-foreground">Please wait while we load your data.</p>
        </div>
      </div>
    )
  }

  const selectableBatches = batches.filter(b => b.id !== 'all')

  return (
    <>
      <div className="min-h-screen pt-16 px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          variants={ANIMATION_VARIANTS.fadeIn}
          initial="initial"
          animate="animate"
          className="max-w-6xl mx-auto py-8"
        >
          {/* Header */}
          <motion.div variants={ANIMATION_VARIANTS.slideDown} className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-black gradient-text mb-1">Teacher Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {user?.name || user?.email || "Teacher"}!
            </p>
          </motion.div>

            {/* Quick Stats */}
            <motion.div
              variants={ANIMATION_VARIANTS.stagger}
              initial="initial"
              animate="animate"
              className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10"
            >
              {[
                {
                  label: "Total Students", value: students.length,
                  gradient: "from-cyan-400 to-blue-500",
                  glow: "rgba(34,211,238,0.3)",
                  Icon: Users,
                },
                {
                  label: "Active Batches", value: selectableBatches.length,
                  gradient: "from-violet-400 to-purple-500",
                  glow: "rgba(139,92,246,0.3)",
                  Icon: BookOpen,
                },
                {
                  label: "Assessments", value: 12,
                  gradient: "from-emerald-400 to-teal-500",
                  glow: "rgba(52,211,153,0.3)",
                  Icon: BarChart3,
                },
                {
                  label: "Avg. Progress",
                  value: students.length > 0 ? `${Math.round(students.reduce((a, s) => a + s.progress, 0) / students.length)}%` : "0%",
                  gradient: "from-orange-400 to-rose-500",
                  glow: "rgba(249,115,22,0.3)",
                  Icon: BarChart3,
                },
              ].map((stat) => (
                <motion.div key={stat.label} variants={ANIMATION_VARIANTS.slideUp}>
                  <Card className="p-6 relative overflow-hidden group">
                    <div className="flex items-start justify-between relative z-10">
                      <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{stat.label}</p>
                        <p className="text-3xl font-black text-foreground tabular-nums tracking-tight">{stat.value}</p>
                      </div>
                      <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg shadow-black/10 transition-transform group-hover:scale-110 duration-300`}>
                        <stat.Icon className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    {/* Background glow blob */}
                    <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-500"
                      style={{ background: stat.glow, filter: "blur(20px)" }} />
                  </Card>
                </motion.div>
              ))}
            </motion.div>

          {/* Management Cards */}
          <motion.div
            variants={ANIMATION_VARIANTS.stagger}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {[
              {
                gradient: "from-cyan-400 to-blue-500",
                glow: "rgba(34,211,238,0.3)",
                Icon: Users,
                title: "Student Management",
                desc: "View and manage all your students, track their progress, and provide feedback.",
                btnLabel: "Manage Students",
                onClick: handleNavigateToStudentManagement,
              },
              {
                gradient: "from-emerald-400 to-teal-500",
                glow: "rgba(52,211,153,0.3)",
                Icon: BookOpen,
                title: "Assessment Management",
                desc: "Create custom AI-generated assessments and coding challenges for your students.",
                btnLabel: "Manage Assessments",
                onClick: handleNavigateToAssessmentManagement,
              },
              {
                gradient: "from-red-400 to-rose-500",
                glow: "rgba(239,68,68,0.3)",
                Icon: Video,
                title: "Live Sessions",
                desc: "Launch an AI-powered live classroom assessment room for one of your batches.",
                btnLabel: "Start Live Room",
                onClick: () => setShowBatchModal(true),
                specialBtn: true,
              },
            ].map((item) => (
              <motion.div key={item.title} variants={ANIMATION_VARIANTS.slideUp}>
                <Card className="p-8 h-full flex flex-col group relative overflow-hidden">
                   <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                   
                   <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-6 shadow-lg shadow-black/10 group-hover:scale-110 transition-transform duration-300 relative z-10`}>
                     <item.Icon className="h-6 w-6 text-white" />
                   </div>
                   
                   <h3 className="text-xl font-bold text-foreground mb-3 relative z-10">{item.title}</h3>
                   <p className="text-muted-foreground text-sm leading-relaxed mb-8 flex-1 relative z-10">
                     {item.desc}
                   </p>
                   
                   <Button
                     onClick={item.onClick}
                     variant={item.specialBtn ? "primary" : "outline"}
                     className={item.specialBtn ? "w-full bg-gradient-to-r from-red-500 to-rose-600 border-none shadow-lg shadow-red-500/25" : "w-full"}
                   >
                     {item.btnLabel}
                   </Button>
                </Card>
              </motion.div>
            ))}
          </motion.div>
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
              className="relative bg-background/80 border border-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              {/* Header */}
              <div className="px-8 pt-8 pb-6 border-b border-foreground/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500/20 to-rose-600/20 flex items-center justify-center shrink-0 shadow-inner">
                      <Video className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-foreground tracking-tight">Start Live Session</h2>
                      <p className="text-sm text-muted-foreground mt-0.5">Select a batch to begin your session</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowBatchModal(false)}
                    disabled={sessionStarting}
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-foreground/5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground transition-all duration-300"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Batch List */}
              <div className="p-8 space-y-4 max-h-96 overflow-y-auto">
                {selectableBatches.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 rounded-full bg-foreground/5 flex items-center justify-center mx-auto mb-4">
                       <Users className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                    <p className="text-foreground font-medium">No batches found</p>
                    <p className="text-sm text-muted-foreground mt-1 px-10">
                      You need to create a batch via Student Management before starting a session.
                    </p>
                  </div>
                ) : (
                  selectableBatches.map((batch) => (
                    <button
                      key={batch.id}
                      onClick={() => handleStartLiveSession(batch.id)}
                      disabled={sessionStarting}
                      className="w-full flex items-center justify-between p-5 rounded-2xl bg-foreground/5 border border-transparent hover:border-red-500/30 hover:bg-red-500/5 transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shrink-0 shadow-lg shadow-red-500/20">
                          <span className="text-sm font-black text-white">
                            {(batch.name || "?").charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-foreground group-hover:text-red-500 transition-colors">{batch.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{batch.studentCount} active student{batch.studentCount !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {sessionStarting ? (
                          <span className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-red-500/0 group-hover:bg-red-500/10 flex items-center justify-center transition-all duration-300">
                             <span className="text-lg font-bold text-red-500 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-1 group-hover:translate-x-0">→</span>
                          </div>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Footer hint */}
              <div className="px-8 py-5 border-t border-foreground/5 bg-foreground/[0.02]">
                <p className="text-xs text-muted-foreground text-center leading-relaxed">
                  A live console will open in a new tab. Your students in the selected batch will receive a notification to join.
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