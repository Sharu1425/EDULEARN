import type React from "react"
import { useState, useEffect } from "react"
import { useToast } from "../../contexts/ToastContext"
import api from "../../utils/api"
import { Server, Activity, Clock, ShieldCheck, Loader2 } from "lucide-react"
import StatTile from "../ui/StatTile"

interface HeatmapDay {
  date: string
  count: number
}

interface InfraMetrics {
  total_requests: number
  avg_latency: string
  uptime: string
  heatmap: HeatmapDay[]
}

const InfrastructureDashboard: React.FC = () => {
  const { error } = useToast()
  const [metrics, setMetrics] = useState<InfraMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMetrics()
  }, [])

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      const res = await api.get("/api/admin/infrastructure/metrics")
      setMetrics(res.data)
    } catch (err: any) {
      error("Failed to fetch infrastructure metrics", err.response?.data?.detail || "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  if (loading || !metrics) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Create a 52x7 grid for the heatmap
  const weeks: HeatmapDay[][] = []
  let currentWeek: HeatmapDay[] = []
  
  // Assuming the heatmap is sorted historically, pad the first week
  if (metrics.heatmap.length > 0) {
    const firstDate = new Date(metrics.heatmap[0].date)
    const emptyDays = firstDate.getDay() // 0 is Sunday
    for (let i = 0; i < emptyDays; i++) {
      currentWeek.push({ date: "", count: -1 })
    }
  }

  metrics.heatmap.forEach(day => {
    currentWeek.push(day)
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  })
  if (currentWeek.length > 0) {
    weeks.push(currentWeek)
  }

  const getColor = (count: number) => {
    if (count === -1) return "bg-transparent"
    if (count === 0) return "bg-gray-100 dark:bg-gray-800"
    if (count < 30) return "bg-green-200 dark:bg-green-900/40"
    if (count < 60) return "bg-green-400 dark:bg-green-700/60"
    if (count < 90) return "bg-green-600 dark:bg-green-500/80"
    return "bg-green-800 dark:bg-green-400"
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-border">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Server className="h-6 w-6 text-primary" />
            Infrastructure Heat Calendar
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            API usage metrics and 52-week activity heatmap.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatTile label="Total API Requests (Yr)" value={metrics.total_requests.toLocaleString()} icon={<Activity className="h-4 w-4" />} accent="primary" />
        <StatTile label="Avg Latency" value={metrics.avg_latency} icon={<Clock className="h-4 w-4" />} accent="info" />
        <StatTile label="Uptime" value={metrics.uptime} icon={<ShieldCheck className="h-4 w-4" />} accent="success" />
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-border overflow-x-auto">
        <h4 className="font-bold mb-6">Activity Heatmap (Last 365 Days)</h4>
        
        <div className="flex gap-1">
          {weeks.map((week, wIdx) => (
            <div key={wIdx} className="flex flex-col gap-1">
              {week.map((day, dIdx) => (
                <div 
                  key={`${wIdx}-${dIdx}`}
                  title={day.count >= 0 ? `${day.date}: ${day.count} requests` : ""}
                  className={`w-3 h-3 rounded-sm ${getColor(day.count)} transition-colors hover:ring-2 hover:ring-primary`}
                />
              ))}
            </div>
          ))}
        </div>
        
        <div className="flex justify-end items-center gap-2 mt-4 text-xs text-muted-foreground">
          <span>Less</span>
          <div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-800" />
          <div className="w-3 h-3 rounded-sm bg-green-200 dark:bg-green-900/40" />
          <div className="w-3 h-3 rounded-sm bg-green-400 dark:bg-green-700/60" />
          <div className="w-3 h-3 rounded-sm bg-green-600 dark:bg-green-500/80" />
          <div className="w-3 h-3 rounded-sm bg-green-800 dark:bg-green-400" />
          <span>More</span>
        </div>
      </div>
    </div>
  )
}

export default InfrastructureDashboard
