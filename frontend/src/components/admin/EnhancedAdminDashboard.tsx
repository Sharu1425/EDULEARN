"use client"

/**
 * Enhanced Admin Dashboard
 * Comprehensive platform management and oversight
 */
import type React from "react"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useToast } from "../../contexts/ToastContext"
import { useAuth } from "../../hooks/useAuth"
import UserManagement from "./UserManagement"
import ContentDataManager from "./ContentDataManager"
import SettingsPanel from "./SettingsPanel"
import LoadingSpinner from "../ui/LoadingSpinner"
import api from "../../utils/api"
import { Users, LayoutGrid, Settings, ShieldCheck, Activity, BrainCircuit, AlertTriangle } from "lucide-react"

interface DashboardStats {
  total_users: number
  active_users_today: number
  active_users_week: number
  total_teachers: number
  total_students: number
  total_assessments: number
  platform_health_score: number
  user_engagement_rate: number
  pending_reviews: number
  system_alerts: number
}

const EnhancedAdminDashboard: React.FC = () => {
  const { user } = useAuth()
  const { error: showError } = useToast()
  const [activeTab, setActiveTab] = useState<"users" | "content" | "settings">("users")
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch dashboard stats
  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await api.get("/api/admin/analytics/platform")
      setStats(response.data)
      console.log("📊 [ADMIN] Dashboard stats loaded:", response.data)
    } catch (err: any) {
      console.error("❌ [ADMIN] Error fetching stats:", err)
      showError("Failed to fetch dashboard stats", err.response?.data?.detail || "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchStats()
    }
  }, [user])

  if (!user) {
    return (
      <div className="min-h-screen pt-20 px-4 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Loading...</h1>
          <p className="text-muted-foreground">Please wait while we load your dashboard.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-20 px-4 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <h1 className="text-2xl font-bold text-foreground mb-4 mt-4">Loading Admin Dashboard...</h1>
          <p className="text-muted-foreground">Please wait while we load your comprehensive admin panel.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-4 px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="max-w-7xl mx-auto w-full">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold font-heading text-foreground mb-2 flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-primary" />
            Control Center
          </h1>
          <p className="text-muted-foreground">Monitor platform health, manage users, and configure system settings.</p>
        </motion.div>

        {/* System Monitoring Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Users className="w-6 h-6" />
              </div>
              <span className="flex items-center text-xs font-semibold px-2 py-1 bg-green-500/10 text-green-500 rounded-full">
                +12% Since Last Week
              </span>
            </div>
            <h3 className="text-3xl font-bold text-foreground">{stats?.active_users_today || 0}</h3>
            <p className="text-sm font-medium text-muted-foreground mt-1">Active Users Today</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 rounded-xl bg-accent/10 text-accent">
                <Activity className="w-6 h-6" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-foreground">{stats?.platform_health_score || 99.9}%</h3>
            <p className="text-sm font-medium text-muted-foreground mt-1">Platform Health</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                <BrainCircuit className="w-6 h-6" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-foreground">{stats?.total_assessments || 0}</h3>
            <p className="text-sm font-medium text-muted-foreground mt-1">Total Assessments Rendered</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 rounded-xl bg-destructive/10 text-destructive">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-foreground">{stats?.system_alerts || 0}</h3>
            <p className="text-sm font-medium text-muted-foreground mt-1">System Alerts</p>
          </motion.div>
        </div>

        {/* Tab Navigation */}
        <div className="flex mb-6 overflow-x-auto no-scrollbar border-b border-border/40">
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === "users" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
          >
            <Users className="w-4 h-4" /> Users Management
          </button>
          <button
            onClick={() => setActiveTab("content")}
            className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === "content" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
          >
            <LayoutGrid className="w-4 h-4" /> Content Manager
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === "settings" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
          >
            <Settings className="w-4 h-4" /> Platform Settings
          </button>
        </div>

        {/* Content Area */}
        <div className="min-h-[500px]">
          {activeTab === "users" && (
            <motion.div key="users" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <UserManagement />
            </motion.div>
          )}

          {activeTab === "content" && (
            <motion.div key="content" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <ContentDataManager />
            </motion.div>
          )}

          {activeTab === "settings" && (
            <motion.div key="settings" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <SettingsPanel />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}

export default EnhancedAdminDashboard
