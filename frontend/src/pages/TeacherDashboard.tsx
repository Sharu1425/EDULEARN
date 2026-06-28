"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { useToast } from "../contexts/ToastContext"
import { useAuth } from "../hooks/useAuth"
import api from "../utils/api"
import Card from "../components/ui/Card"
import Button from "../components/ui/Button"
import Badge from "../components/ui/Badge"
import StatTile from "../components/ui/StatTile"
import ProgressRing from "../components/ui/ProgressRing"
import LoadingSpinner from "../components/ui/LoadingSpinner"
import assessmentService from "../api/assessmentService"
import { staggerContainer, staggerItem } from "../lib/motion"
import { Sparkles, Users, BookOpen, Video, BarChart3, ChevronRight, ArrowRight, X } from "lucide-react"

interface Student { id: string; name: string; email: string; progress: number; lastActive: string; batch?: string; batchId?: string }
interface Batch { id: string; name: string; studentCount: number; createdAt?: string }

const TypedText: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
  const reduce = useReducedMotion()
  const [shown, setShown] = useState("")
  useEffect(() => {
    if (reduce) { setShown(text); return }
    setShown("")
    let i = 0
    const id = window.setInterval(() => {
      i += 1
      setShown(text.slice(0, i))
      if (i >= text.length) window.clearInterval(id)
    }, 65)
    return () => window.clearInterval(id)
  }, [text, reduce])

  return (
    <span className={className}>
      {shown}
      {!reduce && shown.length < text.length && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ repeat: Number.POSITIVE_INFINITY, duration: 0.8 }}
          className="inline-block w-1.5 h-[0.8em] bg-current ml-1 align-middle"
        />
      )}
    </span>
  )
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
  const [assessmentsCount, setAssessmentsCount] = useState(0)

  useEffect(() => { fetchDashboardData() }, [])

  const fetchDashboardData = async () => {
    try {
      const studentsResponse = await api.get("/api/teacher/students")
      if (studentsResponse.data.success) setStudents(studentsResponse.data.students)

      const batchesResponse = await api.get("/api/teacher/batches")
      if (batchesResponse.data && Array.isArray(batchesResponse.data)) {
        const formattedBatches = batchesResponse.data.map((batch: any) => ({
          id: batch.id || batch._id || batch.batch_id,
          name: batch.name || batch.batch_name || "Unnamed Batch",
          studentCount: batch.student_count || batch.total_students || 0,
          createdAt: batch.created_at || new Date().toISOString().split("T")[0],
        })).filter((b: Batch) => b.id)
        setBatches(formattedBatches)
      } else {
        setBatches([])
      }

      try {
        const assessmentsData = await assessmentService.getTeacherAssessments()
        if (assessmentsData && Array.isArray(assessmentsData)) setAssessmentsCount(assessmentsData.length)
      } catch (err) {
        console.error("[TEACHER] assessments count failed", err)
      }
    } catch (err) {
      console.error("[TEACHER] dashboard data failed", err)
      showError("Error", "Failed to load dashboard data")
      setStudents([]); setBatches([])
    } finally {
      setLoading(false)
    }
  }

  const handleStartLiveSession = async (batchId: string) => {
    if (!batchId) { showError("Error", "No batch ID provided"); return }
    setSessionStarting(true)
    const liveWindow = window.open("", "_blank")
    if (liveWindow) liveWindow.document.write('<h2 style="font-family:sans-serif;padding:2rem">Starting Live Session...</h2>')
    try {
      const response = await api.post("/api/livesession/sessions/start", { batch_id: batchId })
      if (response.data && response.data.session_id) {
        const url = `/teacher/live/${batchId}`
        if (liveWindow) liveWindow.location.href = url; else navigate(url)
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

  if (!user) {
    return <div className="flex h-full items-center justify-center p-10"><LoadingSpinner size="lg" text="Loading user data…" /></div>
  }

  const name = user?.name || user?.username || (user?.email ? user.email.split("@")[0] : "Teacher")
  const selectableBatches = batches.filter(b => b.id !== "all")
  const avgProgress = students.length ? Math.round(students.reduce((a, s) => a + (s.progress || 0), 0) / students.length) : 0

  const actions = [
    { title: "Student Management", desc: "Track progress & feedback", Icon: Users, accent: "primary", onClick: () => navigate("/teacher/student-management") },
    { title: "Assessment Management", desc: "Create AI assessments", Icon: BookOpen, accent: "secondary", onClick: () => navigate("/teacher/assessment-management") },
    { title: "Results & Analytics", desc: "Class performance insights", Icon: BarChart3, accent: "info", onClick: () => navigate("/teacher/results-dashboard") },
    { title: "Live Sessions", desc: "Launch a live classroom", Icon: Video, accent: "destructive", onClick: () => setShowBatchModal(true) },
  ]

  return (
    <>
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6">
        {/* Hero + progress ring */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <motion.div variants={staggerItem} className="lg:col-span-2">
            <Card appearance="glass" hover={false} className="relative h-full overflow-hidden p-7 sm:p-9">
              <div className="aurora-mesh" />
              <div className="relative z-10 flex h-full flex-col">
                <Badge variant="ai" className="mb-4 w-fit"><Sparkles className="h-3 w-3" /> Teacher console</Badge>
                <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  Welcome back, <TypedText text={name} className="text-gradient-primary" />
                </h1>
                <p className="mt-2 max-w-md text-muted-foreground">
                  Manage batches, assessments, and live sessions. Press{" "}
                  <kbd className="rounded border border-border bg-muted/60 px-1.5 text-xs font-medium">⌘K</kbd> to jump anywhere.
                </p>
                <div className="mt-auto flex flex-wrap gap-3 pt-6">
                  <Button variant="primary" onClick={() => navigate("/teacher/create-assessment")}><BookOpen className="h-4 w-4" /> New Assessment</Button>
                  <Button variant="outline" onClick={() => setShowBatchModal(true)}>Start Live Room <ArrowRight className="h-4 w-4" /></Button>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div variants={staggerItem}>
            <Card className="flex h-full flex-col items-center justify-center p-6 text-center">
              <ProgressRing progress={loading ? 0 : avgProgress} size={128} />
              <p className="mt-3 text-sm text-muted-foreground">Average class progress</p>
            </Card>
          </motion.div>
        </div>

        {/* Stat tiles */}
        <motion.div variants={staggerItem} className="grid grid-cols-3 gap-4">
          {loading ? (
            <>
              <div className="h-32 rounded-2xl bg-muted/60 animate-pulse" />
              <div className="h-32 rounded-2xl bg-muted/60 animate-pulse" />
              <div className="h-32 rounded-2xl bg-muted/60 animate-pulse" />
            </>
          ) : (
            <>
              <StatTile label="Students" value={students.length} icon={<Users className="h-4 w-4" />} accent="primary" />
              <StatTile label="Batches" value={selectableBatches.length} icon={<BookOpen className="h-4 w-4" />} accent="secondary" />
              <StatTile label="Assessments" value={assessmentsCount} icon={<BarChart3 className="h-4 w-4" />} accent="info" />
            </>
          )}
        </motion.div>

        {/* Action tiles */}
        <motion.div variants={staggerItem} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {actions.map((a) => (
            <Card key={a.title} onClick={a.onClick} className="group h-full p-5">
              <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-110"
                style={{ background: `hsl(var(--${a.accent}) / 0.12)`, color: `hsl(var(--${a.accent}))` }}>
                <a.Icon className="h-5 w-5" />
              </span>
              <div className="flex items-center gap-1 font-heading font-bold text-foreground">
                {a.title}
                <ChevronRight className="h-4 w-4 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{a.desc}</p>
            </Card>
          ))}
        </motion.div>
      </motion.div>

      {/* Batch Picker Modal */}
      <AnimatePresence>
        {showBatchModal && (
          <motion.div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-md backdrop-saturate-150" onClick={() => !sessionStarting && setShowBatchModal(false)} />
            <motion.div
              className="glass relative w-full max-w-lg overflow-hidden rounded-3xl shadow-e4 dark:shadow-e4-dark"
              initial={{ scale: 0.95, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 12 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
            >
              <div className="flex items-center justify-between border-b border-border/60 px-6 py-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-destructive/15 text-destructive"><Video className="h-6 w-6" /></span>
                  <div>
                    <h2 className="font-heading text-lg font-bold text-foreground">Start Live Session</h2>
                    <p className="text-sm text-muted-foreground">Select a batch to begin</p>
                  </div>
                </div>
                <button onClick={() => setShowBatchModal(false)} disabled={sessionStarting}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="max-h-96 space-y-2.5 overflow-y-auto p-6">
                {selectableBatches.length === 0 ? (
                  <div className="py-10 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><Users className="h-7 w-7" /></div>
                    <p className="font-medium text-foreground">No batches found</p>
                    <p className="mt-1 px-8 text-sm text-muted-foreground">Create a batch in Student Management before starting a session.</p>
                  </div>
                ) : selectableBatches.map((batch) => (
                  <button key={batch.id} onClick={() => handleStartLiveSession(batch.id)} disabled={sessionStarting}
                    className="group flex w-full items-center justify-between rounded-2xl border border-border bg-muted/30 p-4 text-left transition-all hover:border-destructive/30 hover:bg-destructive/5 disabled:opacity-50">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-destructive to-rose-600 text-sm font-black text-white">{(batch.name || "?").charAt(0).toUpperCase()}</span>
                      <div>
                        <p className="font-bold text-foreground group-hover:text-destructive">{batch.name}</p>
                        <p className="text-xs text-muted-foreground">{batch.studentCount} student{batch.studentCount !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    {sessionStarting ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-destructive border-t-transparent" /> : <ArrowRight className="h-4 w-4 text-destructive opacity-0 transition-opacity group-hover:opacity-100" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default TeacherDashboard
