"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { useToast } from "../contexts/ToastContext"
import { useAuth } from "../hooks/useAuth"
import api from "../utils/api"
import Card from "../components/ui/Card"
import Button from "../components/ui/Button"
import AnimatedBackground from "../components/AnimatedBackground"
import { ANIMATION_VARIANTS } from "../utils/constants"

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

interface TimeSlot {
  _id: string
  batch_id: string
  teacher_id: string
  start_time: string
  end_time: string
  day_of_week: string
  subject: string
  topic: string
  ai_prep_status: 'pending' | 'ready'
}

const TeacherDashboard: React.FC = () => {
  const { user } = useAuth()
  const { error: showError, success: showSuccess } = useToast()
  const navigate = useNavigate()

  const [students, setStudents] = useState<Student[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  // Fix schedule type to include all necessary fields
  const [schedule, setSchedule] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  // Notifications moved to Navbar

  // Fetch dashboard data when the component mounts
  useEffect(() => {
    fetchDashboardData()
    // notifications handled globally in Navbar
    return () => { }
  }, [])

  // Early return if user is not available
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
      // Fetch students first
      const studentsResponse = await api.get("/api/teacher/students")
      if (studentsResponse.data.success) {
        setStudents(studentsResponse.data.students)
      }

      const batchesResponse = await api.get("/api/teacher/batches")
      if (batchesResponse.data && Array.isArray(batchesResponse.data)) {
        const allStudentsBatch = {
          id: "all",
          name: "All Students",
          studentCount: studentsResponse.data.students?.length || 0,
          createdAt: new Date().toISOString().split("T")[0],
        }

        const formattedBatches = [
          allStudentsBatch,
          ...batchesResponse.data.map((batch: any) => ({
            id: batch.batch_id,
            name: batch.batch_name,
            studentCount: batch.total_students,
            createdAt: new Date().toISOString().split("T")[0],
          })),
        ]

        setBatches(formattedBatches)
        console.log("✅ [TEACHER] Batches loaded:", formattedBatches.length)
      } else {
        setBatches([
          {
            id: "all",
            name: "All Students",
            studentCount: 0,
            createdAt: new Date().toISOString().split("T")[0],
          },
        ])
      }

      // Fetch Schedule
      try {
        const scheduleResponse = await api.get("/api/schedule/my-schedule")
        if (Array.isArray(scheduleResponse.data)) {
          setSchedule(scheduleResponse.data)
        }
      } catch (e) {
        console.error("Failed to fetch schedule", e)
      }

    } catch (err) {
      console.error("❌ [TEACHER] Failed to fetch dashboard data:", err)
      showError("Error", "Failed to load dashboard data")
      setStudents([])
      setBatches([
        {
          id: "all",
          name: "All Students",
          studentCount: 0,
          createdAt: new Date().toISOString().split("T")[0],
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  // Navigation functions
  const handleNavigateToStudentManagement = () => {
    navigate('/teacher/student-management')
  }

  const handleNavigateToAssessmentManagement = () => {
    navigate('/teacher/assessment-management')
  }

  // Schedule Navigation
  const handleNavigateToCreateSchedule = () => navigate('/teacher/create-schedule')

  // Delete Schedule

  // Delete Schedule
  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!window.confirm("Are you sure you want to delete this class?")) return
    try {
      await api.delete(`/api/schedule/${scheduleId}`)
      showSuccess("Success", "Class deleted successfully")
      fetchDashboardData()
    } catch (err) {
      console.error("Failed to delete schedule", err)
      showError("Error", "Failed to delete class")
    }
  }

  // Clear All Schedule
  const handleClearAllSchedule = async () => {
    if (!window.confirm("Are you sure you want to delete ALL upcoming classes? This cannot be undone.")) return
    try {
      await api.delete("/api/schedule/all")
      showSuccess("Success", "All classes deleted successfully")
      fetchDashboardData()
    } catch (err) {
      console.error("Failed to clear schedule", err)
      showError("Error", "Failed to clear schedule")
    }
  }

  // Start Live Session

  const handleStartLiveSession = async (batchId: string, timeslotId: string) => {
    // Open new tab immediately to avoid popup blockers
    const liveWindow = window.open('', '_blank');
    if (liveWindow) {
      liveWindow.document.write('<h1>Starting Live Session...</h1>');
    }

    try {
      // Notify backend to start session (and send notifications)
      console.log("🚀 Starting live session for Batch:", batchId, "Timeslot:", timeslotId)
      const response = await api.post("/api/sessions/start", {
        batch_id: batchId,
        timeslot_id: timeslotId,
      })
      console.log("✅ Session started response:", response.data)

      if (response.data && response.data.session_id) {
        // Notify students via socket (optional if REST handles it, but good for real-time)
        // For now, REST endpoint handles notifications.

        // Open live console in new tab
        const url = `/teacher/live/${batchId}`
        console.log("🔗 Opening Live Console at:", url)
        if (liveWindow) {
          liveWindow.location.href = url;
        } else {
          // Fallback if blocked
          navigate(url);
        }
        showSuccess("Live Status", "Session started and students notified!");
      } else {
        // Fallback if session_id is not returned or response is unexpected
        if (liveWindow) liveWindow.close();
        showError("Error", "Failed to start session: Unexpected response from server.");
      }
    } catch (err) {
      console.error("Failed to start session:", err);
      // Close the tab if start failed
      if (liveWindow) liveWindow.close();
      showError("Error", "Failed to start session");
    }
  };

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
            <motion.div variants={ANIMATION_VARIANTS.slideDown} className="text-center mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-foreground mb-2">Teacher Dashboard</h1>
                  <p className="text-muted-foreground text-base">
                    Welcome back, {user?.name || user?.email || "Teacher"}!
                  </p>
                </div>
                {/* Notifications are handled in Navbar */}
              </div>
            </motion.div>

            {/* Quick Stats */}
            <motion.div
              variants={ANIMATION_VARIANTS.slideUp}
              initial="initial"
              animate="animate"
              className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6"
            >
              <div className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 dark:from-blue-500/20 dark:to-blue-600/20 border border-blue-500/30 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-xs font-medium">Total Students</p>
                    <p className="text-xl font-bold text-foreground">{students.length}</p>
                  </div>
                  <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-500/10 to-purple-600/10 dark:from-purple-500/20 dark:to-purple-600/20 border border-purple-500/30 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-xs font-medium">Active Batches</p>
                    <p className="text-xl font-bold text-foreground">{batches.filter((b) => b.id !== "all").length}</p>
                  </div>
                  <div className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-500/10 to-green-600/10 dark:from-green-500/20 dark:to-green-600/20 border border-green-500/30 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-xs font-medium">Assessments</p>
                    <p className="text-xl font-bold text-foreground">12</p>
                  </div>
                  <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-orange-500/10 to-orange-600/10 dark:from-orange-500/20 dark:to-orange-600/20 border border-orange-500/30 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-xs font-medium">Avg. Progress</p>
                    <p className="text-xl font-bold text-foreground">
                      {students.length > 0
                        ? Math.round(students.reduce((acc, student) => acc + student.progress, 0) / students.length)
                        : 0}
                      %
                    </p>
                  </div>
                  <div className="w-6 h-6 bg-orange-500/20 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Main Management Sections */}
            <motion.div
              variants={ANIMATION_VARIANTS.slideUp}
              initial="initial"
              animate="animate"
              className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
            >
              {/* Student Management */}
              <motion.div variants={ANIMATION_VARIANTS.slideLeft}>
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
              </motion.div>

              {/* Assessment Management */}
              <motion.div variants={ANIMATION_VARIANTS.slideUp}>
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
              </motion.div>

              {/* Schedule Management */}
              <motion.div variants={ANIMATION_VARIANTS.slideRight}>
                <Card className="p-5 h-full">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">Schedule Management</h3>
                  </div>
                  <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                    Plan your upcoming classes, organize sessions, and manage your timetable.
                  </p>
                  <Button variant="primary" size="sm" className="w-full" onClick={handleNavigateToCreateSchedule}>
                    Manage Schedule
                  </Button>
                </Card>
              </motion.div>
            </motion.div>

            {/* Live Class Schedule Section */}
            <motion.div variants={ANIMATION_VARIANTS.slideUp} className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-foreground">Upcoming Classes</h2>
                {schedule.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAllSchedule}
                    className="text-red-400 hover:text-red-500 hover:bg-red-500/10"
                  >
                    Clear All
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4">
                {schedule.length > 0 ? (
                  schedule.map((slot) => {
                    const isNow = new Date(slot.start_time) <= new Date() && new Date(slot.end_time) > new Date();
                    return (
                      <Card key={slot._id} className="p-4 border-l-4 border-l-blue-500">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-bold text-foreground">{slot.subject} - {slot.topic}</h3>
                            <div className="text-sm text-muted-foreground flex gap-4 mt-1">
                              <span>📅 {new Date(slot.start_time).toLocaleDateString()}</span>
                              <span>⏰ {new Date(slot.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(slot.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              <span className="font-medium text-blue-400">Batch: {slot.batch_id}</span>
                            </div>
                            {slot.ai_prep_status === 'ready' && (
                              <span className="inline-block mt-2 px-2 py-0.5 bg-green-500/10 text-green-500 text-xs rounded-full border border-green-500/20">
                                ✨ AI Content Ready
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {isNow ? (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleStartLiveSession(slot.batch_id, slot._id)}
                              >
                                Go Live
                              </Button>
                            ) : (
                              <Button variant="secondary" size="sm" disabled className="opacity-50 cursor-not-allowed">
                                Starts Soon
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="ml-2 text-red-500 hover:text-red-700 hover:bg-red-500/10"
                              onClick={() => handleDeleteSchedule(slot._id)}
                              title="Delete Class"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 6h18"></path>
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                              </svg>
                            </Button>
                          </div>
                        </div>
                      </Card>
                    )
                  })
                ) : (
                  <div className="text-center py-8 text-muted-foreground bg-white/5 rounded-lg border border-white/10">
                    <p>No upcoming classes scheduled.</p>
                    <Button variant="ghost" size="sm" className="mt-2 text-blue-400 hover:text-blue-300" onClick={handleNavigateToCreateSchedule}>
                      + Create Schedule
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>

          </Card>
        </motion.div >
      </div >

      {/* Notifications overlay removed; handled in Navbar */}
    </>
  )
}

export default TeacherDashboard