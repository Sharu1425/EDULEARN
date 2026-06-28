"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import Card from "../components/ui/Card"
import Button from "../components/ui/Button"
import LoadingState from "../components/LoadingState"
import ErrorState from "../components/ErrorState"
import api from "../utils/api"
import { ANIMATION_VARIANTS } from "../utils/constants"

interface AssessmentItem {
  id: string
  title: string
  topic?: string
  subject?: string
  difficulty: string
  description?: string
  time_limit?: number
  question_count?: number
  created_at?: string
  status?: string
  type?: string
}

const TeacherAssessmentHistory: React.FC = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assessments, setAssessments] = useState<AssessmentItem[]>([])
  const [search, setSearch] = useState("")
  const [difficulty, setDifficulty] = useState("all")
  const [status, setStatus] = useState("all")

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        // Use teacher assessments endpoint - fetches only from teacher_assessments collection
        const res = await api.get("/api/teacher/assessments")
        const list: AssessmentItem[] = Array.isArray(res.data) ? res.data : []
        setAssessments(list)
      } catch (err: any) {
        console.error("Failed to load assessments:", err)
        setError(err?.response?.data?.detail || "Failed to load assessments")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return assessments.filter(a => {
      const matchesSearch = !q || a.title.toLowerCase().includes(q) || (a.topic || a.subject || "").toLowerCase().includes(q)
      const matchesDiff = difficulty === "all" || a.difficulty === difficulty
      const matchesStatus = status === "all" || (a.status || "").toLowerCase() === status
      return matchesSearch && matchesDiff && matchesStatus
    }).sort((a, b) => {
      const ad = a.created_at ? new Date(a.created_at).getTime() : 0
      const bd = b.created_at ? new Date(b.created_at).getTime() : 0
      return bd - ad
    })
  }, [assessments, search, difficulty, status])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <LoadingState size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Card className="p-8 text-center">
          <ErrorState 
            title="Unable to load history" 
            message={error} 
            onBack={() => navigate("/teacher/assessment-management")} 
            backText="Back" 
            showCard={true} 
          />
        </Card>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-6">
      <motion.div
        variants={ANIMATION_VARIANTS.fadeIn}
        initial="initial"
        animate="animate"
        className="max-w-7xl mx-auto space-y-6"
      >
        <Card appearance="glass" hover={false} className="relative overflow-hidden p-7 sm:p-8">
          <div className="aurora-mesh" />
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Assessment History</h1>
              <p className="mt-2 text-muted-foreground">All assessments you have posted</p>
            </div>
            <Button variant="primary" onClick={() => navigate("/teacher/assessment-management")}>Back</Button>
          </div>
        </Card>

        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or subject..."
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary placeholder:text-muted-foreground"
            />
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary placeholder:text-muted-foreground"
            >
              <option value="all">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary placeholder:text-muted-foreground"
            >
              <option value="all">All Status</option>
              <option value="active">active</option>
              <option value="draft">draft</option>
              <option value="archived">archived</option>
            </select>
          </div>
        </Card>

        <Card className="p-6">
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-foreground">No assessments found.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((a, idx) => (
                <motion.div
                  key={a.id}
                  variants={ANIMATION_VARIANTS.slideUp}
                  initial="initial"
                  animate="animate"
                  transition={{ delay: idx * 0.03 }}
                  className="bg-gradient-to-br from-muted/30 to-muted/50 rounded-lg border border-border p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-foreground">{a.title}</h3>
                    <span className="text-xs px-2 py-1 rounded bg-primary/10 border border-primary/30 text-primary capitalize">{a.difficulty}</span>
                  </div>
                  <p className="text-muted-foreground text-sm mb-3">{a.topic || a.subject}</p>
                  <div className="text-muted-foreground text-xs mb-4">
                    <span>Questions: {a.question_count ?? "-"}</span>
                    <span className="mx-2">•</span>
                    <span>Time: {a.time_limit ?? "-"} min</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <Button variant="primary" size="sm" onClick={() => navigate(`/teacher/assessment/${a.id}/results`)}>
                      View Results
                    </Button>
                    <span className="text-muted-foreground text-xs">{a.created_at ? new Date(a.created_at).toLocaleString() : ""}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  )
}

export default TeacherAssessmentHistory


