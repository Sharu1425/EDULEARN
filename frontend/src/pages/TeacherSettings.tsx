"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { useTheme } from "../contexts/ThemeContext"
import { useToast } from "../contexts/ToastContext"
import { useAuth } from "../hooks/useAuth"
import Card from "../components/ui/Card"
import Button from "../components/ui/Button"
import api from "../utils/api"
import {
  Settings,
  Bell,
  Lock,
  BookOpen,
  Save
} from "lucide-react"

const TeacherSettings: React.FC = () => {
  const { user } = useAuth()
  const { colorScheme, setColorScheme } = useTheme()
  const { success, error: showError } = useToast()
  
  const [saving, setSaving] = useState(false)
  
  // Notification settings
  const [notifications, setNotifications] = useState({
    studentSubmissions: true,
    batchActivity: true,
    lowPerformingAlerts: true,
    assessmentDeadlines: true,
    emailDigest: "daily"
  })
  
  // Privacy settings
  const [privacy, setPrivacy] = useState({
    profileVisibleToStudents: true,
    shareAssessmentTemplates: false,
    analyticsDataSharing: true
  })
  
  // Teaching preferences
  const [teachingPrefs, setTeachingPrefs] = useState({
    defaultDifficulty: "medium",
    defaultQuestionCount: 10,
    autoGrading: true
  })

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      const settingsData = {
        userId: user?._id || user?.id,
        theme: {
          colorScheme
        },
        notifications,
        privacy,
        teachingPreferences: teachingPrefs
      }

      await api.post("/api/settings", settingsData)
      success("Settings Saved", "Your preferences have been updated successfully")
    } catch (err: any) {
      console.error("Failed to save settings:", err)
      showError("Save Failed", "Unable to save your settings. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen pt-20 px-4 pb-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Settings className="h-10 w-10" />
            Teacher Settings
          </h1>
          <p className="text-muted-foreground">Customize your teaching experience and preferences</p>
        </motion.div>

        {/* Appearance Settings */}
        <Card className="p-6 mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-4">Appearance</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Color Scheme</label>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setColorScheme("light")}
                  className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                    colorScheme === "light"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  Light
                </button>
                <button
                  onClick={() => setColorScheme("dark")}
                  className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                    colorScheme === "dark"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  Dark
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* Notification Preferences */}
        <Card className="p-6 mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Notification Preferences
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-foreground">Student Submissions</label>
                <p className="text-sm text-muted-foreground">Get notified when students submit assessments</p>
              </div>
              <input
                type="checkbox"
                checked={notifications.studentSubmissions}
                onChange={(e) => setNotifications({ ...notifications, studentSubmissions: e.target.checked })}
                className="w-5 h-5"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-foreground">Batch Activity</label>
                <p className="text-sm text-muted-foreground">Stay updated on batch-related activities</p>
              </div>
              <input
                type="checkbox"
                checked={notifications.batchActivity}
                onChange={(e) => setNotifications({ ...notifications, batchActivity: e.target.checked })}
                className="w-5 h-5"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-foreground">Low-Performing Student Alerts</label>
                <p className="text-sm text-muted-foreground">Receive alerts for students who need help</p>
              </div>
              <input
                type="checkbox"
                checked={notifications.lowPerformingAlerts}
                onChange={(e) => setNotifications({ ...notifications, lowPerformingAlerts: e.target.checked })}
                className="w-5 h-5"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-foreground">Assessment Deadlines</label>
                <p className="text-sm text-muted-foreground">Reminders for upcoming assessment deadlines</p>
              </div>
              <input
                type="checkbox"
                checked={notifications.assessmentDeadlines}
                onChange={(e) => setNotifications({ ...notifications, assessmentDeadlines: e.target.checked })}
                className="w-5 h-5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Email Digest Frequency</label>
              <select
                value={notifications.emailDigest}
                onChange={(e) => setNotifications({ ...notifications, emailDigest: e.target.value })}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              >
                <option value="realtime">Real-time</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="never">Never</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Privacy Settings */}
        <Card className="p-6 mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Lock className="h-6 w-6" />
            Privacy Settings
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-foreground">Profile Visible to Students</label>
                <p className="text-sm text-muted-foreground">Allow students to view your profile information</p>
              </div>
              <input
                type="checkbox"
                checked={privacy.profileVisibleToStudents}
                onChange={(e) => setPrivacy({ ...privacy, profileVisibleToStudents: e.target.checked })}
                className="w-5 h-5"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-foreground">Share Assessment Templates</label>
                <p className="text-sm text-muted-foreground">Allow other teachers to use your assessment templates</p>
              </div>
              <input
                type="checkbox"
                checked={privacy.shareAssessmentTemplates}
                onChange={(e) => setPrivacy({ ...privacy, shareAssessmentTemplates: e.target.checked })}
                className="w-5 h-5"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-foreground">Analytics Data Sharing</label>
                <p className="text-sm text-muted-foreground">Share anonymized data to improve the platform</p>
              </div>
              <input
                type="checkbox"
                checked={privacy.analyticsDataSharing}
                onChange={(e) => setPrivacy({ ...privacy, analyticsDataSharing: e.target.checked })}
                className="w-5 h-5"
              />
            </div>
          </div>
        </Card>

        {/* Teaching Preferences */}
        <Card className="p-6 mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Teaching Preferences
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Default Difficulty Level</label>
              <select
                value={teachingPrefs.defaultDifficulty}
                onChange={(e) => setTeachingPrefs({ ...teachingPrefs, defaultDifficulty: e.target.value })}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Default Question Count</label>
              <input
                type="number"
                value={teachingPrefs.defaultQuestionCount}
                onChange={(e) => setTeachingPrefs({ ...teachingPrefs, defaultQuestionCount: Number(e.target.value) })}
                min={1}
                max={100}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-foreground">Auto-Grading Enabled</label>
                <p className="text-sm text-muted-foreground">Automatically grade MCQ assessments upon submission</p>
              </div>
              <input
                type="checkbox"
                checked={teachingPrefs.autoGrading}
                onChange={(e) => setTeachingPrefs({ ...teachingPrefs, autoGrading: e.target.checked })}
                className="w-5 h-5"
              />
            </div>
          </div>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSaveSettings}
            disabled={saving}
            className="min-w-[200px]"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default TeacherSettings

