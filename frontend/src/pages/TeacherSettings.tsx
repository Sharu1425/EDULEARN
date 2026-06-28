"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { useTheme } from "../contexts/ThemeContext"
import { useToast } from "../contexts/ToastContext"
import { useAuth } from "../hooks/useAuth"
import Card from "../components/ui/Card"
import Button from "../components/ui/Button"
import api from "../utils/api"
import { ANIMATION_VARIANTS } from "../utils/constants"
import {
  Settings as SettingsIcon,
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

  // Common toggle component for checkboxes
  const ToggleSwitch = ({ checked, onChange }: { checked: boolean, onChange: (e: any) => void }) => (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
    </label>
  );

  const settingSections = [
    {
      title: "Appearance",
      icon: <span className="text-2xl">🎨</span>,
      settings: [
        {
          label: "Color Scheme",
          description: "Switch between light and dark themes",
          component: (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setColorScheme("light")}
                className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 flex items-center space-x-2 ${colorScheme === "light" ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Light</span>
              </button>
              <button
                onClick={() => setColorScheme("dark")}
                className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 flex items-center space-x-2 ${colorScheme === "dark" ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
                <span>Dark</span>
              </button>
            </div>
          ),
        },
      ],
    },
    {
      title: "Notification Preferences",
      icon: <Bell className="h-6 w-6 text-foreground" />,
      settings: [
        {
          label: "Student Submissions",
          description: "Get notified when students submit assessments",
          component: <ToggleSwitch checked={notifications.studentSubmissions} onChange={(e) => setNotifications({ ...notifications, studentSubmissions: e.target.checked })} />
        },
        {
          label: "Batch Activity",
          description: "Stay updated on batch-related activities",
          component: <ToggleSwitch checked={notifications.batchActivity} onChange={(e) => setNotifications({ ...notifications, batchActivity: e.target.checked })} />
        },
        {
          label: "Low-Performing Student Alerts",
          description: "Receive alerts for students who need help",
          component: <ToggleSwitch checked={notifications.lowPerformingAlerts} onChange={(e) => setNotifications({ ...notifications, lowPerformingAlerts: e.target.checked })} />
        },
        {
          label: "Assessment Deadlines",
          description: "Reminders for upcoming assessment deadlines",
          component: <ToggleSwitch checked={notifications.assessmentDeadlines} onChange={(e) => setNotifications({ ...notifications, assessmentDeadlines: e.target.checked })} />
        },
        {
          label: "Email Digest Frequency",
          description: "How often you want to receive summary emails",
          component: (
            <select
              value={notifications.emailDigest}
              onChange={(e) => setNotifications({ ...notifications, emailDigest: e.target.value })}
              className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm"
            >
              <option value="realtime">Real-time</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="never">Never</option>
            </select>
          )
        }
      ]
    },
    {
      title: "Privacy Settings",
      icon: <Lock className="h-6 w-6 text-foreground" />,
      settings: [
        {
          label: "Profile Visible to Students",
          description: "Allow students to view your profile information",
          component: <ToggleSwitch checked={privacy.profileVisibleToStudents} onChange={(e) => setPrivacy({ ...privacy, profileVisibleToStudents: e.target.checked })} />
        },
        {
          label: "Share Assessment Templates",
          description: "Allow other teachers to use your assessment templates",
          component: <ToggleSwitch checked={privacy.shareAssessmentTemplates} onChange={(e) => setPrivacy({ ...privacy, shareAssessmentTemplates: e.target.checked })} />
        },
        {
          label: "Analytics Data Sharing",
          description: "Share anonymized data to improve the platform",
          component: <ToggleSwitch checked={privacy.analyticsDataSharing} onChange={(e) => setPrivacy({ ...privacy, analyticsDataSharing: e.target.checked })} />
        }
      ]
    },
    {
      title: "Teaching Preferences",
      icon: <BookOpen className="h-6 w-6 text-foreground" />,
      settings: [
        {
          label: "Default Difficulty Level",
          description: "Standard difficulty for new AI-generated assessments",
          component: (
            <select
              value={teachingPrefs.defaultDifficulty}
              onChange={(e) => setTeachingPrefs({ ...teachingPrefs, defaultDifficulty: e.target.value })}
              className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          )
        },
        {
          label: "Default Question Count",
          description: "Number of questions to generate by default",
          component: (
            <input
              type="number"
              value={teachingPrefs.defaultQuestionCount}
              onChange={(e) => setTeachingPrefs({ ...teachingPrefs, defaultQuestionCount: Number(e.target.value) })}
              min={1}
              max={100}
              className="w-24 px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm text-center"
            />
          )
        },
        {
          label: "Auto-Grading Enabled",
          description: "Automatically grade MCQ assessments upon submission",
          component: <ToggleSwitch checked={teachingPrefs.autoGrading} onChange={(e) => setTeachingPrefs({ ...teachingPrefs, autoGrading: e.target.checked })} />
        }
      ]
    }
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <motion.div variants={ANIMATION_VARIANTS.fadeIn} initial="initial" animate="animate">
        <Card appearance="glass" hover={false} className="relative overflow-hidden p-7 sm:p-8">
          <div className="aurora-mesh" />
          <div className="relative z-10 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <SettingsIcon className="h-6 w-6" />
            </span>
            <div>
              <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Teacher Settings</h1>
              <p className="mt-1 text-muted-foreground">Customize your teaching experience and preferences</p>
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div
        variants={ANIMATION_VARIANTS.fadeIn}
        initial="initial"
        animate="animate"
      >
        <motion.div variants={ANIMATION_VARIANTS.stagger} initial="initial" animate="animate" className="space-y-6">
          {settingSections.map((section, sectionIndex) => (
            <motion.div
              key={section.title}
              variants={ANIMATION_VARIANTS.slideUp}
              transition={{ delay: sectionIndex * 0.1 }}
            >
              <Card className="p-6">
                <div className="flex items-center space-x-3 mb-6">
                  {section.icon}
                  <h2 className="text-xl font-semibold font-heading text-foreground">
                    {section.title}
                  </h2>
                </div>

                <div className="space-y-4">
                  {section.settings.map((setting, settingIndex) => (
                    <motion.div
                      key={setting.label}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: sectionIndex * 0.1 + settingIndex * 0.05 }}
                      className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30 transition-colors duration-300 hover:bg-muted/50"
                    >
                      <div className="flex-1">
                        <h3 className="font-medium mb-1 text-foreground">
                          {setting.label}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {setting.description}
                        </p>
                      </div>
                      <div className="ml-4">{setting.component}</div>
                    </motion.div>
                  ))}
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-8"
        >
          <Button
            variant="primary"
            className="px-8 py-3 text-lg font-semibold"
            onClick={handleSaveSettings}
            isLoading={saving}
          >
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default TeacherSettings
