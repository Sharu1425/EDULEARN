"use client"

/**
 * Enhanced Admin Dashboard
 * Comprehensive platform management and oversight
 */
import type React from "react"
import { useState, useEffect } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { useToast } from "../../contexts/ToastContext"
import { useAuth } from "../../hooks/useAuth"
import UserManagement from "./UserManagement"
import ContentDataManager from "./ContentDataManager"
import FeatureIntelligenceView from "./FeatureIntelligenceView"
import CollusionDetectionView from "./CollusionDetectionView"
import AIAuditView from "./AIAuditView"
import AlignmentMapper from "./AlignmentMapper"
import InfrastructureDashboard from "./InfrastructureDashboard"
import ROIDashboard from "./ROIDashboard"
import ComplianceCenter from "./ComplianceCenter"
import SyntheticDataGenerator from "./SyntheticDataGenerator"
import InstitutionManager from "./InstitutionManager"
import SettingsPanel from "./SettingsPanel"
import Card from "../ui/Card"
import Badge from "../ui/Badge"
import StatTile from "../ui/StatTile"
import ProgressRing from "../ui/ProgressRing"
import LoadingSpinner from "../ui/LoadingSpinner"
import { staggerContainer, staggerItem } from "../../lib/motion"
import api from "../../utils/api"
import { trackEvent } from "../../utils/analytics"
import { Users, LayoutGrid, Settings, ShieldCheck, Activity, BrainCircuit, AlertTriangle, FileText, Server, TrendingUp, Shield, Database, Building2 } from "lucide-react"

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

const TABS = [
  { id: "users", label: "Users", Icon: Users },
  { id: "content", label: "Content", Icon: LayoutGrid },
  { id: "feature_intel", label: "Feature Intel", Icon: Activity },
  { id: "integrity", label: "Integrity", Icon: ShieldCheck },
  { id: "ai_audit", label: "AI Audit", Icon: BrainCircuit },
  { id: "alignment", label: "Alignment", Icon: FileText },
  { id: "infrastructure", label: "Infrastructure", Icon: Server },
  { id: "roi", label: "ROI", Icon: TrendingUp },
  { id: "compliance", label: "Compliance", Icon: Shield },
  { id: "data_tools", label: "Data Tools", Icon: Database },
  { id: "institutions", label: "Institutions", Icon: Building2 },
  { id: "settings", label: "Settings", Icon: Settings },
] as const

const TypedText: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
  const reduce = useReducedMotion()
  const [shown, setShown] = useState("")
  useEffect(() => {
    if (reduce) { setShown(text); return }
    setShown("")
    let i = 0
    const id = window.setInterval(() => {
      i += 1
      setShown(text.slice(0, i))
      if (i >= text.length) window.clearInterval(id)
    }, 65)
    return () => window.clearInterval(id)
  }, [text, reduce])

  return (
    <span className={className}>
      {shown}
      {!reduce && shown.length < text.length && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ repeat: Number.POSITIVE_INFINITY, duration: 0.8 }}
          className="inline-block w-1.5 h-[0.8em] bg-current ml-1 align-middle"
        />
      )}
    </span>
  )
}

const EnhancedAdminDashboard: React.FC = () => {
  const { user } = useAuth()
  const { error: showError } = useToast()
  const [activeTab, setActiveTab] = useState<"users" | "content" | "feature_intel" | "integrity" | "ai_audit" | "alignment" | "infrastructure" | "roi" | "compliance" | "data_tools" | "institutions" | "settings">("users")
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await api.get("/api/admin/analytics/platform")
      setStats(response.data)
    } catch (err: any) {
      console.error("[ADMIN] Error fetching stats:", err)
      showError("Failed to fetch dashboard stats", err.response?.data?.detail || "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (user) fetchStats() }, [user])

  if (!user) {
    return <div className="flex h-full items-center justify-center p-10"><LoadingSpinner size="lg" text="Loading control center…" /></div>
  }

  const health = loading ? 0 : Math.round(stats?.platform_health_score ?? 99.9)

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6">
      {/* Hero + health ring */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <motion.div variants={staggerItem} className="lg:col-span-2">
          <Card appearance="glass" hover={false} className="relative h-full overflow-hidden p-7 sm:p-9">
            <div className="aurora-mesh" />
            <div className="relative z-10 flex h-full flex-col">
              <Badge variant="ai" className="mb-4 w-fit"><ShieldCheck className="h-3 w-3" /> Control center</Badge>
              <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Welcome back, <TypedText text="Administrator" className="text-gradient-primary" />
              </h1>
              <p className="mt-2 max-w-md text-muted-foreground">
                Monitor health, manage users, and configure the system. Press{" "}
                <kbd className="rounded border border-border bg-muted/60 px-1.5 text-xs font-medium">⌘K</kbd> to navigate.
              </p>
              <div className="mt-auto flex flex-wrap items-center gap-4 pt-6 text-sm text-muted-foreground">
                <span><strong className="text-foreground">{stats?.total_students ?? 0}</strong> students</span>
                <span><strong className="text-foreground">{stats?.total_teachers ?? 0}</strong> teachers</span>
                <span><strong className="text-foreground">{stats?.active_users_week ?? 0}</strong> active this week</span>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={staggerItem}>
          <Card className="flex h-full flex-col items-center justify-center p-6 text-center">
            <ProgressRing progress={health} size={128} />
            <p className="mt-3 text-sm text-muted-foreground">Platform health</p>
          </Card>
        </motion.div>
      </div>

      {/* Stat tiles */}
      <motion.div variants={staggerItem} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading ? (
          <>
            <div className="h-28 rounded-2xl bg-muted/60 animate-pulse" />
            <div className="h-28 rounded-2xl bg-muted/60 animate-pulse" />
            <div className="h-28 rounded-2xl bg-muted/60 animate-pulse" />
            <div className="h-28 rounded-2xl bg-muted/60 animate-pulse" />
          </>
        ) : (
          <>
            <StatTile label="Active Today" value={stats?.active_users_today ?? 0} icon={<Activity className="h-4 w-4" />} accent="primary" />
            <StatTile label="Total Users" value={stats?.total_users ?? 0} icon={<Users className="h-4 w-4" />} accent="secondary" />
            <StatTile label="Assessments" value={stats?.total_assessments ?? 0} icon={<BrainCircuit className="h-4 w-4" />} accent="info" />
            <StatTile label="System Alerts" value={stats?.system_alerts ?? 0} icon={<AlertTriangle className="h-4 w-4" />} accent={(stats?.system_alerts ?? 0) > 0 ? "destructive" : "success"} />
          </>
        )}
      </motion.div>

      {/* Tab navigation */}
      <motion.div variants={staggerItem} className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-muted/30 p-1 no-scrollbar">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => {
              setActiveTab(id)
              trackEvent("feature_engagement", `admin_tab_${id}`)
            }}
            className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
              activeTab === id ? "bg-primary text-primary-foreground shadow-e2" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </motion.div>

      {/* Content area */}
      <div className="min-h-[400px]">
        {activeTab === "users" && <motion.div key="users" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}><UserManagement /></motion.div>}
        {activeTab === "content" && <motion.div key="content" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}><ContentDataManager /></motion.div>}
        {activeTab === "feature_intel" && <motion.div key="feature_intel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}><FeatureIntelligenceView /></motion.div>}
        {activeTab === "integrity" && <motion.div key="integrity" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}><CollusionDetectionView /></motion.div>}
        {activeTab === "ai_audit" && <motion.div key="ai_audit" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}><AIAuditView /></motion.div>}
        {activeTab === "alignment" && <motion.div key="alignment" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}><AlignmentMapper /></motion.div>}
        {activeTab === "infrastructure" && <motion.div key="infrastructure" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}><InfrastructureDashboard /></motion.div>}
        {activeTab === "roi" && <motion.div key="roi" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}><ROIDashboard /></motion.div>}
        {activeTab === "compliance" && <motion.div key="compliance" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}><ComplianceCenter /></motion.div>}
        {activeTab === "data_tools" && <motion.div key="data_tools" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}><SyntheticDataGenerator /></motion.div>}
        {activeTab === "institutions" && <motion.div key="institutions" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}><InstitutionManager /></motion.div>}
        {activeTab === "settings" && <motion.div key="settings" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}><SettingsPanel /></motion.div>}
      </div>
    </motion.div>
  )
}

export default EnhancedAdminDashboard
