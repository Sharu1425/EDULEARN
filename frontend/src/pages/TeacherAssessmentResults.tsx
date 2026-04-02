"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { motion } from "framer-motion"
import Card from "../components/ui/Card"
import Button from "../components/ui/Button"
import LoadingState from "../components/LoadingState"
import ErrorState from "../components/ErrorState"
import api from "../utils/api"
import { ANIMATION_VARIANTS } from "../utils/constants"

interface AssessmentInfo {
  id: string
  title: string
  subject: string
  difficulty: string
  description?: string
  time_limit?: number
  question_count?: number
}

interface AssessmentStudentResult {
  student_id: string
  student_name: string
  student_email: string
  score: number
  percentage: number
  time_taken: number
  submitted_at: string
  total_questions: number
  is_malpractice?: boolean
}

interface TeacherStudentResultItem {
  result_id: string
  assessment_id: string
  assessment_title: string
  percentage: number
  score: number
  total_questions: number
  time_taken: number
  submitted_at: string
}

const TeacherAssessmentResults: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assessment, setAssessment] = useState<AssessmentInfo | null>(null)
  const [results, setResults] = useState<AssessmentStudentResult[]>([])
  const [assigned, setAssigned] = useState<any[]>([])
  const [search, setSearch] = useState("")

  useEffect(() => {
    const fetchData = async () => {
      if (!assessmentId) return
      try {
        setLoading(true)
        setError(null)

        // Try to fetch assessment details (teacher route first, then fallback)
        let aData: any = null
        try {
          const aRes = await api.get(`/api/assessments/teacher/${assessmentId}`)
          aData = aRes.data
        } catch (e) {
          try {
            const aRes = await api.get(`/api/assessments/${assessmentId}/details`)
            aData = aRes.data
          } catch (_) {
            aData = null
          }
        }
        if (aData) {
          setAssessment({
            id: aData.id || assessmentId,
            title: aData.title,
            subject: aData.subject || aData.topic,
            difficulty: aData.difficulty,
            description: aData.description,
            time_limit: aData.time_limit,
            question_count: aData.question_count || (aData.questions ? aData.questions.length : undefined)
          })
        }

        // Fetch combined results for this assessment
        const rRes = await api.get(`/api/assessments/teacher/${assessmentId}/results`)
        setResults(rRes.data || [])

        // Fetch assigned students with attendance
        try {
          const aRes = await api.get(`/api/assessments/teacher/${assessmentId}/assigned-students`)
          setAssigned(aRes.data || [])
        } catch (e) {
          // endpoint may not exist yet; degrade gracefully
          setAssigned([])
        }
      } catch (err: any) {
        console.error("Failed to load assessment results:", err)
        setError(err?.response?.data?.detail || "Failed to load assessment results")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [assessmentId])

  const filteredResults = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return results
    return results.filter(r =>
      r.student_name?.toLowerCase().includes(term) ||
      r.student_email?.toLowerCase().includes(term)
    )
  }, [results, search])

  const mergedAssigned = useMemo(() => {
    if (!assigned?.length) return []
    const term = search.trim().toLowerCase()
    const rows = assigned.map((s: any) => ({
      ...s,
      present: !!s.submitted,
    }))
    return term
      ? rows.filter((r: any) => (r.student_name||"").toLowerCase().includes(term) || (r.student_email||"").toLowerCase().includes(term))
      : rows
  }, [assigned, search])

  const viewStudentDetailedResult = async (studentId: string) => {
    try {
      console.log("📊 [VIEW RESULT] Fetching results for student:", studentId, "assessment:", assessmentId)
      
      // Fetch this student's results and find the one matching this assessment to get result_id
      const res = await api.get(`/api/assessments/teacher/student-results/${studentId}`)
      console.log("📊 [VIEW RESULT] API Response:", res.data)
      
      const items: TeacherStudentResultItem[] = res?.data?.results || res?.data?.student_results || []
      console.log("📊 [VIEW RESULT] Total results found:", items.length)
      
      if (items.length > 0) {
        console.log("📊 [VIEW RESULT] Sample result:", items[0])
        console.log("📊 [VIEW RESULT] Looking for assessment_id:", assessmentId)
        items.forEach((item, idx) => {
          console.log(`📊 [VIEW RESULT] Result ${idx}: assessment_id="${item.assessment_id}", result_id="${item.result_id}"`)
        })
      }
      
      const match = items.find(it => {
        const idMatch = it.assessment_id === assessmentId || (it as any).assessmentId === assessmentId
        console.log(`📊 [VIEW RESULT] Comparing: "${it.assessment_id}" === "${assessmentId}" = ${idMatch}`)
        return idMatch
      })
      
      console.log("📊 [VIEW RESULT] Match found:", match)
      
      if (match && match.result_id) {
        console.log("📊 [VIEW RESULT] Navigating to result:", match.result_id)
        navigate(`/teacher/test-result/${match.result_id}`)
        return
      }
      
      // Fallback: try to fetch detailed result by probing possible collections? Not available from here, show error
      console.error("❌ [VIEW RESULT] Could not locate matching result")
      setError("Could not locate detailed result for this student.")
    } catch (err: any) {
      console.error("❌ [VIEW RESULT] Failed to resolve student's result:", err)
      setError("Failed to open student's detailed result")
    }
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor((seconds || 0) / 60)
    const s = (seconds || 0) % 60
    return `${m}m ${s}s`
  }

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return "Invalid Date"
      }
      // Format as: MM/DD/YYYY, HH:MM:SS (24-hour format)
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const year = date.getFullYear()
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      const seconds = String(date.getSeconds()).padStart(2, '0')
      return `${month}/${day}/${year}, ${hours}:${minutes}:${seconds}`
    } catch (error) {
      return "Invalid Date"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-20 px-4 flex items-center justify-center">
        <LoadingState size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen pt-20 px-4 flex items-center justify-center">
        <Card className="p-8 text-center">
          <ErrorState
            title="Unable to load results"
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
    <div className="min-h-screen pt-16 px-4">
      <motion.div
        variants={ANIMATION_VARIANTS.fadeIn}
        initial="initial"
        animate="animate"
        className="max-w-7xl mx-auto"
      >
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Assessment Results</h1>
              <p className="text-muted-foreground">
                {assessment ? (
                  <>
                    {assessment.title} • {assessment.subject} • {assessment.difficulty}
                  </>
                ) : (
                  <>Assessment ID: {assessmentId}</>
                )}
              </p>
            </div>
            <Button variant="primary" onClick={() => navigate("/teacher/assessment-management")}>Back</Button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search students by name or email..."
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary placeholder:text-muted-foreground"
            />
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Assigned Students</h2>
          {mergedAssigned.length === 0 ? (
            <div className="text-foreground">No assigned students found.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mergedAssigned.map((s: any, idx: number) => (
                <motion.div
                  key={`${s.student_id}-${idx}`}
                  variants={ANIMATION_VARIANTS.slideUp}
                  initial="initial"
                  animate="animate"
                  transition={{ delay: idx * 0.03 }}
                  className="bg-gradient-to-br from-muted/30 to-muted/50 rounded-lg border border-border p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-foreground font-semibold">{s.student_name || "Unknown"}</div>
                      <div className="text-muted-foreground text-sm">{s.student_email || ""}</div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded border ${s.is_malpractice ? "bg-red-600/20 border-red-500/30 text-red-600 dark:text-red-400" : s.present ? "bg-green-600/20 border-green-500/30 text-green-600 dark:text-green-400" : "bg-amber-600/20 border-amber-500/30 text-amber-600 dark:text-amber-400"}`}>
                      {s.is_malpractice ? "Malpractice" : s.present ? "Present" : "Absent"}
                    </span>
                  </div>
                  {s.present && (
                    <div className="text-muted-foreground text-xs mb-3">
                      <span>Score: {s.score}/{s.total_questions} ({(s.percentage||0).toFixed(1)}%)</span>
                      <span className="mx-2">•</span>
                      <span>Time: {formatTime(s.time_taken||0)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="text-muted-foreground text-xs">
                      {s.submitted_at ? formatDateTime(s.submitted_at) : ""}
                    </div>
                    {s.present ? (
                      <Button variant="primary" size="sm" onClick={() => s.result_id ? navigate(`/teacher/test-result/${s.result_id}`) : viewStudentDetailedResult(s.student_id)}>
                        View Details
                      </Button>
                    ) : (
                      <div className="text-muted-foreground text-xs">Not submitted</div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">Submissions</h2>
          {filteredResults.length === 0 ? (
            <div className="text-foreground">No submissions yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Student</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Email</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Score</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Time Taken</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.map((r, idx) => (
                    <motion.tr
                      key={`${r.student_id}-${idx}`}
                      variants={ANIMATION_VARIANTS.slideUp}
                      initial="initial"
                      animate="animate"
                      transition={{ delay: idx * 0.03 }}
                      className="border-b border-border"
                    >
                      <td className="py-3 px-4 text-foreground">
                        {r.student_name || "Unknown"}
                        {r.is_malpractice && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-red-600/20 text-red-600 dark:text-red-400 border border-red-500/30 font-semibold uppercase tracking-wide">Malpractice</span>}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{r.student_email || ""}</td>
                      <td className="py-3 px-4">
                        <span className={`${(r.percentage||0) >= 80 ? "text-green-600 dark:text-green-400" : (r.percentage||0) >= 60 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"} font-semibold`}>
                          {r.score}/{r.total_questions} ({(r.percentage || 0).toFixed(1)}%)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{formatTime(r.time_taken)}</td>
                      <td className="py-3 px-4 text-muted-foreground">{formatDateTime(r.submitted_at)}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  )
}

export default TeacherAssessmentResults


