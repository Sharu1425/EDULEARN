import type React from "react"
import { useState, useEffect, useRef } from "react"
import ForceGraph2D from "react-force-graph-2d"
import { useToast } from "../../contexts/ToastContext"
import api from "../../utils/api"
import { AlertTriangle, ShieldAlert, Loader2, Info } from "lucide-react"

interface Node {
  id: string
  group: number
  risk_score: number
}

interface Link {
  source: string
  target: string
  value: number
  reason: string
}

interface NetworkData {
  nodes: Node[]
  links: Link[]
}

const CollusionDetectionView: React.FC = () => {
  const { error } = useToast()
  const [data, setData] = useState<NetworkData>({ nodes: [], links: [] })
  const [insights, setInsights] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchNetworkData()
  }, [])

  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.clientWidth,
        height: 500
      })
    }
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: 500
        })
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const fetchNetworkData = async () => {
    try {
      setLoading(true)
      const res = await api.get("/api/admin/collusion-analysis")
      setData(res.data.network)
      setInsights(res.data.insights)
    } catch (err: any) {
      error("Failed to fetch collusion analysis", err.response?.data?.detail || "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex gap-4">
        <ShieldAlert className="h-6 w-6 text-destructive shrink-0" />
        <div>
          <h4 className="font-bold text-destructive">Integrity Analysis Engine</h4>
          <p className="text-sm text-destructive/80 mt-1">
            This graph represents statistical probabilities of collusion based on answer similarity and pacing. 
            <strong> These are signals for investigation, not proof of academic dishonesty.</strong>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-xl shadow border border-border p-4" ref={containerRef}>
          <h3 className="text-lg font-bold mb-2 text-foreground">Suspicion Network Graph</h3>
          <p className="text-sm text-muted-foreground mb-4">Hover over nodes to see student details. Thicker lines indicate higher similarity.</p>
          
          <div className="border border-border/50 rounded-lg overflow-hidden bg-muted/20">
            <ForceGraph2D
              width={dimensions.width}
              height={dimensions.height}
              graphData={data}
              nodeLabel="id"
              nodeColor={(node: any) => node.risk_score > 90 ? "#ef4444" : node.risk_score > 70 ? "#f59e0b" : "#3b82f6"}
              nodeRelSize={6}
              linkColor={(link: any) => link.value > 0.8 ? "rgba(239, 68, 68, 0.6)" : "rgba(156, 163, 175, 0.4)"}
              linkWidth={(link: any) => link.value * 5}
              linkLabel="reason"
            />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-border p-6 h-fit">
          <h3 className="text-lg font-bold mb-4 text-foreground flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" /> AI Insights
          </h3>
          <ul className="space-y-4">
            {insights.map((insight, idx) => (
              <li key={idx} className="flex gap-3 text-sm text-foreground bg-muted/30 p-3 rounded-lg border border-border/50">
                <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default CollusionDetectionView
