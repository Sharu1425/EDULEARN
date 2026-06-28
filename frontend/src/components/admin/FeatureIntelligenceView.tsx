import type React from "react"
import { useState, useEffect } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { useToast } from "../../contexts/ToastContext"
import api from "../../utils/api"
import { Filter, Loader2 } from "lucide-react"

interface FunnelData {
  feature: string
  discovery: number
  engagement: number
  abandonment: number
  retention: number
}

const FeatureIntelligenceView: React.FC = () => {
  const { error } = useToast()
  const [data, setData] = useState<FunnelData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFunnelData()
  }, [])

  const fetchFunnelData = async () => {
    try {
      setLoading(true)
      const res = await api.get("/api/analytics/funnel")
      setData(res.data.funnel_data || [])
    } catch (err: any) {
      error("Failed to fetch funnel data", err.response?.data?.detail || "Unknown error")
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
      {/* Funnel Chart */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-border">
        <h3 className="text-lg font-bold mb-2 text-foreground flex items-center gap-2">
          <Filter className="h-5 w-5 text-primary" /> Feature Adoption Funnel
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Visualize how users progress from discovering a feature to long-term retention.
        </p>
        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="feature" />
              <YAxis />
              <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }} />
              <Legend />
              <Bar dataKey="discovery" stackId="a" fill="#3b82f6" name="Discovery" />
              <Bar dataKey="engagement" stackId="a" fill="#10b981" name="Engagement" />
              <Bar dataKey="retention" stackId="a" fill="#8b5cf6" name="Retention" />
              <Bar dataKey="abandonment" stackId="a" fill="#ef4444" name="Abandonment" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Funnel Data Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden border border-border">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Feature</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Discovery</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Engagement</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Retention</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Conversion Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {data.map(item => {
              const conversion = item.discovery > 0 ? (item.retention / item.discovery) * 100 : 0
              return (
                <tr key={item.feature} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-foreground capitalize">{item.feature.replace('_', ' ')}</div>
                  </td>
                  <td className="px-6 py-4 text-sm">{item.discovery}</td>
                  <td className="px-6 py-4 text-sm text-green-600">{item.engagement}</td>
                  <td className="px-6 py-4 text-sm text-purple-600 font-bold">{item.retention}</td>
                  <td className="px-6 py-4 text-sm font-bold">
                    <span className={conversion >= 50 ? "text-green-500" : conversion >= 20 ? "text-yellow-500" : "text-red-500"}>
                      {conversion.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default FeatureIntelligenceView
