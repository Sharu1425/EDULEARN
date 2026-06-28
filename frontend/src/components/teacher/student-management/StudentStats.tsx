/**
 * StudentStats Component
 * Displays statistics and analytics for students
 */
import React from "react"
import { motion } from "framer-motion"
import Card from "../../ui/Card"
import { ANIMATION_VARIANTS } from "../../../utils/constants"

interface StudentStatsProps {
  students: Array<{
    id: string
    name: string
    email: string
    progress: number
    lastActive: string
    batch?: string
    batchId?: string
    level?: number
    xp?: number
    badges?: string[]
    completedAssessments?: number
    averageScore?: number
  }>
  batches: Array<{
    id: string
    name: string
    studentCount: number
    createdAt: string
  }>
  onShowBatchPerformance?: () => void
  onShowAIReports?: () => void
}

const StudentStats: React.FC<StudentStatsProps> = ({
  students,
  batches
}) => {
  // Calculate statistics
  const totalStudents = students.length
  const totalBatches = batches.length
  const averageProgress = totalStudents > 0 
    ? Math.round(students.reduce((sum, student) => sum + student.progress, 0) / totalStudents)
    : 0
  
  const highPerformers = students.filter(student => student.progress >= 80).length
  const activeStudents = students.filter(student => {
    const lastActive = new Date(student.lastActive)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return lastActive > weekAgo
  }).length

  const totalAssessments = students.reduce((sum, student) => sum + (student.completedAssessments || 0), 0)
  const averageScore = totalAssessments > 0
    ? Math.round(students.reduce((sum, student) => sum + (student.averageScore || 0), 0) / totalStudents)
    : 0

  return (
    <motion.div variants={ANIMATION_VARIANTS.slideUp}>
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">Student Analytics</h2>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-r from-emerald-500/10 to-teal-600/10 dark:from-emerald-500/20 dark:to-teal-600/20 border border-blue-500/30 rounded-lg p-4">
            <div>
              <p className="text-muted-foreground text-sm">Total Students</p>
              <p className="text-2xl font-bold text-foreground">{totalStudents}</p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500/10 to-green-600/10 dark:from-green-500/20 dark:to-green-600/20 border border-green-500/30 rounded-lg p-4">
            <div>
              <p className="text-muted-foreground text-sm">High Performers</p>
              <p className="text-2xl font-bold text-foreground">{highPerformers}</p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 dark:from-emerald-500/20 dark:to-emerald-600/20 border border-emerald-500/30 rounded-lg p-4">
            <div>
              <p className="text-muted-foreground text-sm">Active (7 days)</p>
              <p className="text-2xl font-bold text-foreground">{activeStudents}</p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-500/10 to-orange-600/10 dark:from-orange-500/20 dark:to-orange-600/20 border border-orange-500/30 rounded-lg p-4">
            <div>
              <p className="text-muted-foreground text-sm">Avg. Progress</p>
              <p className="text-2xl font-bold text-foreground">{averageProgress}%</p>
            </div>
          </div>
        </div>

        {/* Detailed Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Performance Overview */}
          <div className="bg-muted/30 rounded-lg p-4 border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-3">Performance Overview</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Average Score</span>
                <span className="text-foreground font-medium">{averageScore}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Assessments</span>
                <span className="text-foreground font-medium">{totalAssessments}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Avg. Assessments/Student</span>
                <span className="text-foreground font-medium">
                  {totalStudents > 0 ? Math.round(totalAssessments / totalStudents) : 0}
                </span>
              </div>
            </div>
          </div>

          {/* Batch Distribution */}
          <div className="bg-muted/30 rounded-lg p-4 border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-3">Batch Distribution</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Batches</span>
                <span className="text-foreground font-medium">{totalBatches}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Avg. Students/Batch</span>
                <span className="text-foreground font-medium">
                  {totalBatches > 0 ? Math.round(totalStudents / totalBatches) : 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Largest Batch</span>
                <span className="text-foreground font-medium">
                  {batches.length > 0 ? Math.max(...batches.map(b => b.studentCount)) : 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Unassigned Students</span>
                <span className="text-foreground font-medium">
                  {students.filter(s => !s.batchId).length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Distribution */}
        <div className="mt-6 bg-muted/30 rounded-lg p-4 border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-3">Progress Distribution</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {students.filter(s => s.progress < 25).length}
              </div>
              <div className="text-muted-foreground text-sm">0-25%</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {students.filter(s => s.progress >= 25 && s.progress < 50).length}
              </div>
              <div className="text-muted-foreground text-sm">25-50%</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {students.filter(s => s.progress >= 50 && s.progress < 75).length}
              </div>
              <div className="text-muted-foreground text-sm">50-75%</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {students.filter(s => s.progress >= 75).length}
              </div>
              <div className="text-muted-foreground text-sm">75-100%</div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

export default StudentStats
