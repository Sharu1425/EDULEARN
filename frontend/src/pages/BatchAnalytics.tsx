"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useAuth } from "../hooks/useAuth"
import { useToast } from "../contexts/ToastContext"
import Card from "../components/ui/Card"
import Button from "../components/ui/Button"
import LoadingSpinner from "../components/ui/LoadingSpinner"
import api from "../utils/api"
import {
  TrendingUp,
  Users,
  Award,
  BarChart3,
  Download,
  Calendar,
  Target
} from "lucide-react"

interface Batch {
  id: string
  name: string
  studentCount: number
  createdAt: string
}

interface BatchAnalytics {
  batchId: string
  batchName: string
  totalStudents: number
  totalSubmissions: number
  averagePerformance: number
  highPerformers: number
  lowPerformers: number
  recentActivity: Array<{
    studentName: string
    percentage: number
    submittedAt: string
  }>
}

const BatchAnalytics: React.FC = () => {
  const { user } = useAuth()
  const { success, error: showError } = useToast()
  
  const [loading, setLoading] = useState(true)
  const [batches, setBatches] = useState<Batch[]>([])
  const [selectedBatchId, setSelectedBatchId] = useState<string>("")
  const [analytics, setAnalytics] = useState<BatchAnalytics | null>(null)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)

  useEffect(() => {
    fetchBatches()
  }, [])

  useEffect(() => {
    if (selectedBatchId) {
      fetchBatchAnalytics(selectedBatchId)
    }
  }, [selectedBatchId])

  const fetchBatches = async () => {
    try {
      setLoading(true)
      const response = await api.get("/api/teacher/batches")
      const batchesData = response.data || []
      
      setBatches(batchesData.map((b: any) => ({
        id: b.id,
        name: b.name,
        studentCount: b.student_count,
        createdAt: b.created_at
      })))
      
      // Auto-select first batch
      if (batchesData.length > 0) {
        setSelectedBatchId(batchesData[0].id)
      }
    } catch (err: any) {
      console.error("Failed to fetch batches:", err)
      showError("Error", "Failed to load batches")
    } finally {
      setLoading(false)
    }
  }

  const fetchBatchAnalytics = async (batchId: string) => {
    try {
      setLoadingAnalytics(true)
      const response = await api.get(`/api/teacher/batches/${batchId}/analytics`)
      setAnalytics({
        batchId: response.data.batch_id,
        batchName: response.data.batch_name,
        totalStudents: response.data.total_students,
        totalSubmissions: response.data.total_submissions,
        averagePerformance: response.data.average_performance,
        highPerformers: response.data.high_performers,
        lowPerformers: response.data.low_performers,
        recentActivity: response.data.recent_activity || []
      })
    } catch (err: any) {
      console.error("Failed to fetch analytics:", err)
      showError("Error", "Failed to load batch analytics")
    } finally {
      setLoadingAnalytics(false)
    }
  }

  const handleExportCSV = () => {
    if (!analytics) return

    // Create CSV content
    const csvContent = [
      ["Batch Analytics Report"],
      ["Batch Name", analytics.batchName],
      ["Total Students", analytics.totalStudents.toString()],
      ["Total Submissions", analytics.totalSubmissions.toString()],
      ["Average Performance", `${analytics.averagePerformance}%`],
      ["High Performers (≥80%)", analytics.highPerformers.toString()],
      ["Low Performers (<60%)", analytics.lowPerformers.toString()],
      [],
      ["Recent Activity"],
      ["Student Name", "Score", "Date"],
      ...analytics.recentActivity.map(a => [
        a.studentName,
        `${a.percentage}%`,
        new Date(a.submittedAt).toLocaleDateString()
      ])
    ].map(row => row.join(",")).join("\n")

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${analytics.batchName}_analytics_${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    
    success("Export Complete", "Analytics exported successfully")
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <LoadingSpinner size="lg" text="Loading batch analytics..." />
      </div>
    )
  }

  if (batches.length === 0) {
    return (
      <div className="px-4 py-6 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-foreground mb-8">Batch Analytics</h1>
          <Card className="p-12 text-center">
            <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No Batches Yet</h3>
            <p className="text-muted-foreground">Create a batch to start tracking analytics</p>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card appearance="glass" hover={false} className="relative overflow-hidden p-7 sm:p-8">
            <div className="aurora-mesh" />
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Batch Analytics</h1>
                <p className="mt-2 text-muted-foreground">Track performance and progress across your batches</p>
              </div>
              {analytics && (
                <Button onClick={handleExportCSV} variant="secondary">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Batch Selector */}
        <Card className="p-6 mb-6">
          <label className="block text-sm font-medium text-foreground mb-3">Select Batch</label>
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="w-full max-w-md px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
          >
            {batches.map(batch => (
              <option key={batch.id} value={batch.id}>
                {batch.name} ({batch.studentCount} students)
              </option>
            ))}
          </select>
        </Card>

        {loadingAnalytics ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" text="Loading analytics..." />
          </div>
        ) : analytics ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Total Students</p>
                      <h3 className="text-3xl font-bold text-foreground">{analytics.totalStudents}</h3>
                    </div>
                    <Users className="h-12 w-12 text-primary opacity-30" />
                  </div>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Total Submissions</p>
                      <h3 className="text-3xl font-bold text-foreground">{analytics.totalSubmissions}</h3>
                    </div>
                    <BarChart3 className="h-12 w-12 text-green-500 opacity-20" />
                  </div>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Average Performance</p>
                      <h3 className="text-3xl font-bold text-foreground">{analytics.averagePerformance}%</h3>
                    </div>
                    <TrendingUp className="h-12 w-12 text-emerald-500 opacity-20" />
                  </div>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">High Performers</p>
                      <h3 className="text-3xl font-bold text-foreground">{analytics.highPerformers}</h3>
                      <p className="text-xs text-muted-foreground mt-1">≥80% score</p>
                    </div>
                    <Award className="h-12 w-12 text-yellow-500 opacity-20" />
                  </div>
                </Card>
              </motion.div>
            </div>

            {/* Performance Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card className="p-6">
                <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Performance Distribution
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-foreground font-medium">High Performers (≥80%)</span>
                      <span className="text-green-500 font-semibold">{analytics.highPerformers}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3">
                      <div
                        className="bg-green-500 h-3 rounded-full transition-all"
                        style={{ width: `${analytics.totalStudents > 0 ? (analytics.highPerformers / analytics.totalStudents) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-foreground font-medium">Medium Performers (60-79%)</span>
                      <span className="text-yellow-500 font-semibold">
                        {analytics.totalStudents - analytics.highPerformers - analytics.lowPerformers}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3">
                      <div
                        className="bg-yellow-500 h-3 rounded-full transition-all"
                        style={{ width: `${analytics.totalStudents > 0 ? ((analytics.totalStudents - analytics.highPerformers - analytics.lowPerformers) / analytics.totalStudents) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-foreground font-medium">Low Performers (&lt;60%)</span>
                      <span className="text-red-500 font-semibold">{analytics.lowPerformers}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3">
                      <div
                        className="bg-red-500 h-3 rounded-full transition-all"
                        style={{ width: `${analytics.totalStudents > 0 ? (analytics.lowPerformers / analytics.totalStudents) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Recent Activity
                </h3>
                {analytics.recentActivity.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div>
                          <p className="font-medium text-foreground">{activity.studentName}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(activity.submittedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`text-lg font-bold ${
                          activity.percentage >= 80 ? "text-green-500" :
                          activity.percentage >= 60 ? "text-yellow-500" :
                          "text-red-500"
                        }`}>
                          {activity.percentage}%
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No recent activity</p>
                )}
              </Card>
            </div>

            {/* Insights */}
            <Card className="p-6">
              <h3 className="text-xl font-bold text-foreground mb-4">Insights & Recommendations</h3>
              <div className="space-y-3">
                {analytics.averagePerformance >= 80 && (
                  <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <p className="text-green-400 font-medium">
                      🎉 Excellent Performance! The batch is performing very well with an average of {analytics.averagePerformance}%.
                    </p>
                  </div>
                )}
                
                {analytics.averagePerformance < 60 && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-red-400 font-medium">
                      ⚠️ Needs Attention: The batch average is below 60%. Consider additional support sessions or review materials.
                    </p>
                  </div>
                )}

                {analytics.lowPerformers > 0 && (
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <p className="text-yellow-400 font-medium">
                      📊 {analytics.lowPerformers} student{analytics.lowPerformers !== 1 ? "s" : ""} scoring below 60%. Consider one-on-one mentoring or extra practice sessions.
                    </p>
                  </div>
                )}

                {analytics.totalSubmissions === 0 && (
                  <div className="p-4 bg-info/10 border border-info/30 rounded-lg">
                    <p className="text-info font-medium">
                      💡 No submissions yet. Assign assessments to this batch to start tracking performance.
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </>
        ) : (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Select a batch to view analytics</p>
          </Card>
        )}
      </div>
    </div>
  )
}

export default BatchAnalytics

