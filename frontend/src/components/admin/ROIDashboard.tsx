import type React from "react"
import { useState, useEffect } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { useToast } from "../../contexts/ToastContext"
import api from "../../utils/api"
import { TrendingUp, Award, Zap, Download, Loader2, Activity } from "lucide-react"
import StatTile from "../ui/StatTile"

interface Projection {
  month: string
  baseline: number
  edulearn: number
}

interface ROIMetrics {
  score_lift: string
  learning_velocity: string
  time_to_competency: string
  engagement_hours: string
  projected_scores: Projection[]
}

const ROIDashboard: React.FC = () => {
  const { error, success } = useToast()
  const [metrics, setMetrics] = useState<ROIMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMetrics()
  }, [])

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      const res = await api.get("/api/admin/roi/metrics")
      setMetrics(res.data)
    } catch (err: any) {
      error("Failed to fetch ROI metrics", err.response?.data?.detail || "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  const handleExportPDF = () => {
    // In a real app, use jspdf or trigger backend puppeteer
    success("PDF Export Started", "Your ROI report will download shortly.")
  }

  if (loading || !metrics) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-border">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Platform ROI Calculator
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Executive overview of learning outcomes and institutional value.
          </p>
        </div>
        <button
          onClick={handleExportPDF}
          className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
        >
          <Download className="h-4 w-4" />
          Export Report
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Avg Score Lift" value={metrics.score_lift} icon={<Award className="h-4 w-4" />} accent="success" />
        <StatTile label="Learning Velocity" value={metrics.learning_velocity} icon={<Zap className="h-4 w-4" />} accent="primary" />
        <StatTile label="Time to Competency" value={metrics.time_to_competency} icon={<TrendingUp className="h-4 w-4" />} accent="success" />
        <StatTile label="Engagement Hrs" value={metrics.engagement_hours} icon={<Activity className="h-4 w-4" />} accent="info" />
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-border">
        <h4 className="font-bold mb-4">Projected Trajectory (Power Law Curve Fit)</h4>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={metrics.projected_scores} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="month" />
              <YAxis domain={[50, 100]} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }} />
              <Legend />
              <Line type="monotone" dataKey="baseline" name="Baseline (Without AI)" stroke="#ef4444" strokeDasharray="5 5" strokeWidth={2} />
              <Line type="monotone" dataKey="edulearn" name="EDULEARN Users" stroke="#3b82f6" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export default ROIDashboard
