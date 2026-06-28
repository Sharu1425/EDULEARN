import type React from "react"
import { useState } from "react"
import { useToast } from "../../contexts/ToastContext"
import api from "../../utils/api"
import { Database, Loader2, Play, Users } from "lucide-react"

const SyntheticDataGenerator: React.FC = () => {
  const { error, success } = useToast()
  const [cohortSize, setCohortSize] = useState(100)
  const [generating, setGenerating] = useState(false)
  const [metrics, setMetrics] = useState<any>(null)

  const handleGenerate = async () => {
    try {
      setGenerating(true)
      setMetrics(null)
      const res = await api.post(`/api/admin/tools/generate-synthetic-data?cohort_size=${cohortSize}`)
      success("Generation Complete", res.data.message)
      setMetrics(res.data.metrics)
    } catch (err: any) {
      error("Failed to generate data", err.response?.data?.detail || "Unknown error")
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-border">
        <h3 className="text-xl font-bold flex items-center gap-2 mb-2">
          <Database className="h-6 w-6 text-primary" />
          Synthetic Student Data Generator
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Generate realistic student profiles, engagement logs, and assessment scores using statistical sampling (Normal distributions, Log-normal learning rates). Useful for load testing and testing analytics features.
        </p>

        <div className="max-w-md space-y-4 bg-muted/20 p-6 rounded-xl border border-border">
          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">
              Cohort Size (Number of Students)
            </label>
            <input 
              type="number" 
              value={cohortSize} 
              onChange={e => setCohortSize(Number(e.target.value))}
              min={10} 
              max={10000}
              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
            {generating ? "Synthesizing Data..." : "Generate Sandbox Cohort"}
          </button>
        </div>
      </div>

      {metrics && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-border flex items-center gap-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="p-4 bg-green-100 dark:bg-green-900/40 text-green-600 rounded-full">
            <Users className="h-8 w-8" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-foreground">Generation Successful</h4>
            <div className="text-sm text-muted-foreground mt-1 space-y-1">
              <p>Avg Ability Score: <strong>{metrics.avg_ability_score}</strong></p>
              <p>Learning Variance: <strong>{metrics.learning_rate_variance}</strong></p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SyntheticDataGenerator
