"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useAuth } from "../hooks/useAuth"
import { useToast } from "../contexts/ToastContext"
import Card from "../components/ui/Card"
import Button from "../components/ui/Button"
import Input from "../components/ui/Input"
import LoadingSpinner from "../components/ui/LoadingSpinner"
import api from "../utils/api"
import {
  User,
  Users,
  BookOpen,
  Award,
  TrendingUp,
  Calendar,
  Edit2,
  Save,
  X
} from "lucide-react"

interface TeacherStats {
  totalStudents: number
  totalBatches: number
  totalAssessments: number
  averageStudentPerformance: number
}

interface Batch {
  id: string
  name: string
  studentCount: number
  createdAt: string
}

interface Assessment {
  id: string
  title: string
  difficulty: string
  createdAt: string
  totalSubmissions: number
}

interface Activity {
  id: string
  type: string
  title: string
  timestamp: string
}

const TeacherProfile: React.FC = () => {
  const { user } = useAuth()
  const { success, error: showError } = useToast()
  
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const [stats, setStats] = useState<TeacherStats>({
    totalStudents: 0,
    totalBatches: 0,
    totalAssessments: 0,
    averageStudentPerformance: 0
  })
  
  const [batches, setBatches] = useState<Batch[]>([])
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [recentActivity, setRecentActivity] = useState<Activity[]>([])
  
  // Profile fields
  const [fullName, setFullName] = useState(user?.full_name || user?.username || "")
  const [email] = useState(user?.email || "")
  const [bio, setBio] = useState("")
  const [savedProfile, setSavedProfile] = useState({ fullName: "", bio: "" })

  useEffect(() => {
    fetchProfileData()
  }, [])

  const fetchProfileData = async () => {
    try {
      setLoading(true)
      
      // Fetch current user profile for bio and full name
      const profileResponse = await api.get("/api/users/me")
      if (profileResponse.data && profileResponse.data.user) {
        const u = profileResponse.data.user
        const name = u.full_name || u.username || ""
        const b = u.bio || ""
        setFullName(name)
        setBio(b)
        setSavedProfile({ fullName: name, bio: b })
      }

      // Fetch batches
      const batchesResponse = await api.get("/api/teacher/batches")
      const batchesData = batchesResponse.data || []
      setBatches(batchesData.map((b: any) => ({
        id: b.id,
        name: b.name,
        studentCount: b.student_count,
        createdAt: b.created_at
      })))
      
      // Fetch students (to count total)
      const studentsResponse = await api.get("/api/teacher/students")
      const studentsData = studentsResponse.data?.students || []
      
      // Fetch assessments (teacher assessments)
      const assessmentsResponse = await api.get("/api/teacher/assessments")
      const assessmentsData = assessmentsResponse.data || []
      
      // Calculate stats
      const totalStudents = studentsData.length
      const totalBatches = batchesData.length
      const totalAssessments = assessmentsData.length
      
      // Calculate average student performance (use average_score from backend)
      const avgPerformance = studentsData.length > 0
        ? studentsData.reduce((sum: number, s: any) => sum + (s.average_score || s.progress || 0), 0) / studentsData.length
        : 0
      
      setStats({
        totalStudents,
        totalBatches,
        totalAssessments,
        averageStudentPerformance: Math.round(avgPerformance)
      })
      
      // Set recent assessments
      setAssessments(
        assessmentsData.slice(0, 5).map((a: any) => ({
          id: a.id,
          title: a.title,
          difficulty: a.difficulty || "medium",
          createdAt: a.created_at,
          totalSubmissions: a.total_submissions || 0
        }))
      )
      
      // Generate recent activity (simplified)
      const activities: Activity[] = []
      assessmentsData.slice(0, 3).forEach((a: any, i: number) => {
        activities.push({
          id: `activity-${i}`,
          type: "assessment",
          title: `Created assessment "${a.title}"`,
          timestamp: a.created_at
        })
      })
      setRecentActivity(activities)
      
    } catch (err: any) {
      console.error("Failed to fetch profile data:", err)
      showError("Error", "Failed to load profile data")
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      await api.put("/api/users/me", {
        full_name: fullName,
        bio
      })
      
      setSavedProfile({ fullName, bio })
      
      success("Profile Updated", "Your profile has been updated successfully")
      setEditing(false)
    } catch (err: any) {
      console.error("Failed to save profile:", err)
      showError("Error", "Failed to save profile changes")
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setFullName(savedProfile.fullName)
    setBio(savedProfile.bio)
    setEditing(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-20 px-4 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading profile..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-20 px-4 pb-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-foreground mb-2">Teacher Profile</h1>
          <p className="text-muted-foreground">Manage your profile and view your teaching statistics</p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Students</p>
                  <h3 className="text-3xl font-bold text-foreground">{stats.totalStudents}</h3>
                </div>
                <Users className="h-12 w-12 text-blue-500 opacity-20" />
              </div>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Batches</p>
                  <h3 className="text-3xl font-bold text-foreground">{stats.totalBatches}</h3>
                </div>
                <BookOpen className="h-12 w-12 text-green-500 opacity-20" />
              </div>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Assessments Created</p>
                  <h3 className="text-3xl font-bold text-foreground">{stats.totalAssessments}</h3>
                </div>
                <Award className="h-12 w-12 text-purple-500 opacity-20" />
              </div>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Avg. Student Score</p>
                  <h3 className="text-3xl font-bold text-foreground">{stats.averageStudentPerformance}%</h3>
                </div>
                <TrendingUp className="h-12 w-12 text-orange-500 opacity-20" />
              </div>
            </Card>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Information */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <User className="h-6 w-6" />
                  Profile Information
                </h2>
                {!editing ? (
                  <Button variant="secondary" onClick={() => setEditing(true)}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={handleCancelEdit} disabled={saving}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button variant="primary" onClick={handleSaveProfile} disabled={saving}>
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Full Name</label>
                  {editing ? (
                    <Input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full"
                    />
                  ) : (
                    <p className="text-muted-foreground">{fullName || "Not set"}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                  <p className="text-muted-foreground">{email}</p>
                  <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Role</label>
                  <p className="text-muted-foreground capitalize">{user?.role || "Teacher"}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Bio</label>
                  {editing ? (
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell us about yourself..."
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                      rows={4}
                    />
                  ) : (
                    <p className="text-muted-foreground">{bio || "No bio added yet"}</p>
                  )}
                </div>
              </div>
            </Card>

            {/* Recent Assessments */}
            <Card className="p-6 mt-6">
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <BookOpen className="h-6 w-6" />
                Recent Assessments
              </h2>
              {assessments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No assessments created yet</p>
              ) : (
                <div className="space-y-3">
                  {assessments.map((assessment) => (
                    <div
                      key={assessment.id}
                      className="p-4 bg-muted/30 rounded-lg border border-border hover:border-primary/50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground">{assessment.title}</h3>
                          <div className="flex gap-3 text-sm text-muted-foreground mt-1">
                            <span className="capitalize">Difficulty: {assessment.difficulty}</span>
                            <span>•</span>
                            <span>{assessment.totalSubmissions} submissions</span>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(assessment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Managed Batches */}
            <Card className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Managed Batches</h2>
              {batches.length === 0 ? (
                <p className="text-muted-foreground text-sm">No batches created yet</p>
              ) : (
                <div className="space-y-3">
                  {batches.map((batch) => (
                    <div key={batch.id} className="p-3 bg-muted/30 rounded-lg border border-border">
                      <h3 className="font-medium text-foreground">{batch.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {batch.studentCount} student{batch.studentCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Recent Activity */}
            <Card className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Activity
              </h2>
              {recentActivity.length === 0 ? (
                <p className="text-muted-foreground text-sm">No recent activity</p>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Award className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-foreground">{activity.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TeacherProfile

