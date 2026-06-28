"use client"

import type React from "react"
import { useState } from "react"
import { motion } from "framer-motion"
import { useTheme } from "../contexts/ThemeContext"
import type { User } from "../types"
import { Settings as SettingsIcon } from "lucide-react"
import Card from "../components/ui/Card"
import Button from "../components/ui/Button"
import { useToast } from "../contexts/ToastContext"
import api from "../utils/api"
import { ANIMATION_VARIANTS } from "../utils/constants"

interface SettingsProps {
  user: User
}

const Settings: React.FC<SettingsProps> = ({ user }) => {
  const { colorScheme, setColorScheme } = useTheme()
  const { success, error } = useToast()
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    assessment: true,
    results: true,
  })
  const [privacy, setPrivacy] = useState({
    profileVisible: true,
    shareResults: false,
    analytics: true,
  })
  const [isSaving, setIsSaving] = useState(false)

  const saveSettings = async () => {
    setIsSaving(true)
    try {
      const settingsData = {
        userId: user._id || user.id,
        theme: {
          colorScheme,
        },
        notifications,
        privacy,
      }

      await api.post("/db/settings", settingsData)
      success("Settings Saved", "Your preferences have been updated successfully")
    } catch (err) {
      console.error("❌ Failed to save settings:", err)
      error("Save Failed", "Unable to save your settings. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const settingSections = [
    {
      title: "Appearance",
      icon: "🎨",
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
      title: "Notifications",
      icon: "🔔",
      settings: [
        {
          label: "Email Notifications",
          description: "Receive updates via email",
          component: (
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.email}
                onChange={(e) => setNotifications((prev) => ({ ...prev, email: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          ),
        },
        {
          label: "Assessment Reminders",
          description: "Get reminded about pending assessments",
          component: (
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.assessment}
                onChange={(e) => setNotifications((prev) => ({ ...prev, assessment: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          ),
        },
      ],
    },
    {
      title: "Privacy",
      icon: "🔒",
      settings: [
        {
          label: "Profile Visibility",
          description: "Make your profile visible to other users",
          component: (
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={privacy.profileVisible}
                onChange={(e) => setPrivacy((prev) => ({ ...prev, profileVisible: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          ),
        },
        {
          label: "Analytics",
          description: "Help improve the app by sharing usage data",
          component: (
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={privacy.analytics}
                onChange={(e) => setPrivacy((prev) => ({ ...prev, analytics: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          ),
        },
      ],
    },
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
              <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Settings</h1>
              <p className="mt-1 text-muted-foreground">Customize your EduLearn experience</p>
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div
        variants={ANIMATION_VARIANTS.fadeIn}
        initial="initial"
        animate="animate"
      >
        {/* Settings Sections */}
        <motion.div variants={ANIMATION_VARIANTS.stagger} initial="initial" animate="animate" className="space-y-6">
          {settingSections.map((section, sectionIndex) => (
            <motion.div
              key={section.title}
              variants={ANIMATION_VARIANTS.slideUp}
              transition={{ delay: sectionIndex * 0.1 }}
            >
              <Card className="p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <span className="text-2xl">{section.icon}</span>
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

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-8"
        >
          <Button
            variant="primary"
            className="px-8 py-3 text-lg font-semibold"
            onClick={saveSettings}
            isLoading={isSaving}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default Settings
