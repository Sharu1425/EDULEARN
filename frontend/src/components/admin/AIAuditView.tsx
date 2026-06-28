import type React from "react"
import { useState, useEffect } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { useToast } from "../../contexts/ToastContext"
import api from "../../utils/api"
import { Brain, AlertCircle, CheckCircle, Activity, Loader2, Play } from "lucide-react"
import StatTile from "../ui/StatTile"

interface Flag {
  id: string
  type: string
  model: string
  context: string
  severity: "low" | "medium" | "high"
  timestamp: string
}

interface Trend {
  date: string
  health: number
  flags: number
}

interface AuditMetrics {
  overall_health: number
  total_evaluations: number
  flagged_outputs: number
  hallucination_rate: number
  grading_variance: number
  recent_flags: Flag[]
  trends: Trend[]
}

const AIAuditView: React.FC = () => {
  const { error, success } = useToast()
  const [metrics, setMetrics] = useState<AuditMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    fetchMetrics()
  }, [])

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      const res = await api.get("/api/admin/ai-audit/metrics")
      setMetrics(res.data)
    } catch (err: any) {
      error("Failed to fetch AI audit metrics", err.response?.data?.detail || "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  const handleRunAudit = async () => {
    try {
      setRunning(true)
      const res = await api.post("/api/admin/ai-audit/run")
      success("Audit Started", res.data.message)
    } catch (err: any) {
      error("Failed to start audit", err.response?.data?.detail || "Unknown error")
    } finally {
      setRunning(false)
    }
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
            <Brain className="h-6 w-6 text-primary" />
            AI Model Performance Auditor
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Meta-analysis of Gemini's outputs to ensure grading consistency and low hallucination rates.
          </p>
        </div>
        <button
          onClick={handleRunAudit}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Run Manual Audit
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Overall Health" value={`${metrics.overall_health}%`} icon={<Activity className="h-4 w-4" />} accent={metrics.overall_health > 90 ? "success" : "warning"} />
        <StatTile label="Grading Variance" value={`${metrics.grading_variance}%`} icon={<AlertCircle className="h-4 w-4" />} accent="destructive" />
        <StatTile label="Hallucination Rate" value={`${metrics.hallucination_rate}%`} icon={<Brain className="h-4 w-4" />} accent="info" />
        <StatTile label="Flagged Outputs" value={metrics.flagged_outputs} icon={<AlertCircle className="h-4 w-4" />} accent="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-border">
          <h4 className="font-bold mb-4">7-Day Audit Trend</h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.trends}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" tick={{fontSize: 12}} />
                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }} />
                <Bar yAxisId="left" dataKey="flags" name="Flags" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="health" name="Health Score" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-border overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border">
            <h4 className="font-bold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              Recent Flagged Outputs
            </h4>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {metrics.recent_flags.map((flag) => (
              <div key={flag.id} className="p-3 bg-muted/30 rounded-lg border border-border/50 text-sm">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold text-foreground capitalize">{flag.type.replace('_', ' ')}</span>
                  <span className={`px-2 py-0.5 text-[10px] rounded-full uppercase font-bold ${
                    flag.severity === 'high' ? 'bg-red-100 text-red-700' : 
                    flag.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {flag.severity}
                  </span>
                </div>
                <div className="text-muted-foreground text-xs mb-2">Context: {flag.context}</div>
                <button className="text-primary text-xs hover:underline font-medium">Review Item &rarr;</button>
              </div>
            ))}
            {metrics.recent_flags.length === 0 && (
              <div className="text-center text-muted-foreground py-8 flex flex-col items-center">
                <CheckCircle className="h-8 w-8 text-green-500 mb-2 opacity-50" />
                <p>No recent flags.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AIAuditView
