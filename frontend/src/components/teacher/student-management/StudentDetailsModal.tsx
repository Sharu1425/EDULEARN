/**
 * StudentDetailsModal Component
 * Displays detailed information about a student
 */
import React from "react"
import { motion } from "framer-motion"
import Card from "../../ui/Card"
import Button from "../../ui/Button"
import { ANIMATION_VARIANTS } from "../../../utils/constants"

interface Student {
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
}

interface StudentDetailsModalProps {
  student: Student | null
  isOpen: boolean
  onClose: () => void
  onChangeBatch: (student: Student) => void
  onRemoveStudent: (studentId: string) => void
}

const StudentDetailsModal: React.FC<StudentDetailsModalProps> = ({
  student,
  isOpen,
  onClose,
  onChangeBatch,
  onRemoveStudent
}) => {
  if (!isOpen || !student) return null

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return "N/A"
      }
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch (error) {
      return "N/A"
    }
  }

  const getBadgeIcon = (badge: string) => {
    const badgeIcons: { [key: string]: string } = {
      "first_assessment": "🎯",
      "high_scorer": "⭐",
      "consistent_learner": "🔥",
      "level_up": "📈",
      "perfect_score": "💯",
      "streak_master": "⚡"
    }
    return badgeIcons[badge] || "🏆"
  }

  const getBadgeName = (badge: string) => {
    const badgeNames: { [key: string]: string } = {
      "first_assessment": "First Assessment",
      "high_scorer": "High Scorer",
      "consistent_learner": "Consistent Learner",
      "level_up": "Level Up",
      "perfect_score": "Perfect Score",
      "streak_master": "Streak Master"
    }
    return badgeNames[badge] || badge.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-background border border-border rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
            <h2 className="text-2xl font-bold text-foreground">Student Details</h2>
            <Button variant="ghost" onClick={onClose} className="text-muted-foreground hover:text-foreground">
              ✕
            </Button>
          </div>

          {/* Student Information */}
          <div className="space-y-6">
            {/* Basic Info - Prominent Display */}
            <div className="bg-muted/30 border border-border rounded-lg p-5">
              <h3 className="text-lg font-semibold text-foreground mb-4 pb-2 border-b border-border">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Name</label>
                  <p className="text-lg font-semibold text-foreground">{student.name || "N/A"}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Email</label>
                  <p className="text-lg font-semibold text-foreground break-all">{student.email || "N/A"}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Batch</label>
                  <p className="text-lg font-semibold text-foreground">
                    {student.batch && student.batch !== "No Batch" ? student.batch : "Unassigned"}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Last Active</label>
                  <p className="text-lg font-semibold text-foreground">
                    {formatDate(student.lastActive)}
                  </p>
                </div>
              </div>
            </div>

            {/* Progress & Stats */}
            {(student.progress !== undefined || student.level !== undefined || student.xp !== undefined || student.completedAssessments !== undefined || student.averageScore !== undefined) && (
              <div className="bg-muted/30 border border-border rounded-lg p-5">
                <h3 className="text-lg font-semibold text-foreground mb-4 pb-2 border-b border-border">Progress & Statistics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {student.progress !== undefined && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Overall Progress</label>
                      <div className="flex items-center space-x-3">
                        <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-primary to-accent h-3 rounded-full transition-all duration-300"
                            style={{ width: `${Math.max(0, Math.min(100, student.progress))}%` }}
                          />
                        </div>
                        <span className="text-lg font-semibold text-foreground min-w-[3rem] text-right">
                          {typeof student.progress === 'number' ? student.progress.toFixed(2) : student.progress}%
                        </span>
                      </div>
                    </div>
                  )}
                  {student.level !== undefined && (
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Level</label>
                      <p className="text-lg font-semibold text-foreground">{student.level || 1}</p>
                    </div>
                  )}
                  {student.xp !== undefined && (
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">XP Points</label>
                      <p className="text-lg font-semibold text-foreground">{student.xp || 0}</p>
                    </div>
                  )}
                  {student.completedAssessments !== undefined && (
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Completed Assessments</label>
                      <p className="text-lg font-semibold text-foreground">{student.completedAssessments || 0}</p>
                    </div>
                  )}
                  {student.averageScore !== undefined && (
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Average Score</label>
                      <p className="text-lg font-semibold text-foreground">
                        {typeof student.averageScore === 'number' ? student.averageScore.toFixed(2) : student.averageScore}%
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Badges */}
            {student.badges && student.badges.length > 0 && (
              <div className="bg-muted/30 border border-border rounded-lg p-5">
                <h3 className="text-lg font-semibold text-foreground mb-4 pb-2 border-b border-border">Achievements</h3>
                <div className="flex flex-wrap gap-3">
                  {student.badges.map((badge, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-2 bg-primary/10 border border-primary/20 rounded-lg px-4 py-2"
                    >
                      <span className="text-lg">{getBadgeIcon(badge)}</span>
                      <span className="text-sm font-medium text-foreground">{getBadgeName(badge)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
              <Button
                variant="primary"
                onClick={() => onChangeBatch(student)}
                className="flex-1"
              >
                Change Batch
              </Button>
              <Button
                variant="ghost"
                onClick={() => onRemoveStudent(student.id)}
                className="flex-1 text-destructive hover:bg-destructive/10"
              >
                Remove Student
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  )
}

export default StudentDetailsModal
