import type React from "react"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { useToast } from "../../contexts/ToastContext"
import api from "../../utils/api"
import { BrainCircuit, Loader2 } from "lucide-react"

interface TeacherEffectiveness {
  teacher_id: string
  name: string
  email: string
  improvement_score: number
  quality_score: number
  engagement_score: number
  retention_score: number
  composite_score: number
}

const TeacherPerformanceView: React.FC = () => {
  const { error } = useToast()
  const [data, setData] = useState<TeacherEffectiveness[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherEffectiveness | null>(null)
  const [report, setReport] = useState<string | null>(null)
  const [reportLoading, setReportLoading] = useState(false)

  useEffect(() => {
    fetchEffectiveness()
  }, [])

  const fetchEffectiveness = async () => {
    try {
      setLoading(true)
      const res = await api.get("/api/admin/teachers/effectiveness")
      setData(res.data.teacher_effectiveness || [])
    } catch (err: any) {
      error("Failed to fetch teacher performance", err.response?.data?.detail || "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  const fetchReport = async (teacherId: string) => {
    try {
      setReportLoading(true)
      setReport(null)
      const res = await api.get(`/api/admin/teachers/${teacherId}/effectiveness-report`)
      setReport(res.data.report)
    } catch (err: any) {
      error("Failed to generate report", err.response?.data?.detail || "Unknown error")
    } finally {
      setReportLoading(false)
    }
  }

  const handleTeacherClick = (teacher: TeacherEffectiveness) => {
    setSelectedTeacher(teacher)
    fetchReport(teacher.teacher_id)
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
      {/* Cohort Analysis Chart */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-border">
        <h3 className="text-lg font-bold mb-4 text-foreground">Cohort Analysis (Engagement vs. Improvement)</h3>
        <p className="text-sm text-muted-foreground mb-6">
          This scatter plot visualizes teacher performance. The ideal quadrant is top-right (high engagement, high improvement).
        </p>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis type="number" dataKey="engagement_score" name="Engagement" unit="%" domain={[0, 100]} />
              <YAxis type="number" dataKey="improvement_score" name="Improvement" unit="%" domain={[0, 100]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name="Teachers" data={data} onClick={(e: any) => handleTeacherClick(e.payload)}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.composite_score >= 80 ? "#10b981" : entry.composite_score >= 60 ? "#f59e0b" : "#ef4444"} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Teachers Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden border border-border">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Teacher</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Improvement</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Quality</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Engagement</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Composite</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {data.map(teacher => (
              <tr 
                key={teacher.teacher_id} 
                onClick={() => handleTeacherClick(teacher)}
                className="hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="font-medium text-foreground">{teacher.name}</div>
                  <div className="text-xs text-muted-foreground">{teacher.email}</div>
                </td>
                <td className="px-6 py-4 text-sm">{teacher.improvement_score.toFixed(1)}%</td>
                <td className="px-6 py-4 text-sm">{teacher.quality_score.toFixed(1)}%</td>
                <td className="px-6 py-4 text-sm">{teacher.engagement_score.toFixed(1)}%</td>
                <td className="px-6 py-4 text-sm font-bold">
                  <span className={teacher.composite_score >= 80 ? "text-green-500" : teacher.composite_score >= 60 ? "text-yellow-500" : "text-red-500"}>
                    {teacher.composite_score.toFixed(1)}
                  </span>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                  No teacher data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* AI Report Modal */}
      {selectedTeacher && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-background rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-border"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <BrainCircuit className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">AI Effectiveness Report</h3>
                <p className="text-sm text-muted-foreground">For {selectedTeacher.name}</p>
              </div>
            </div>
            
            <div className="bg-muted/50 rounded-xl p-4 min-h-[120px] mb-6">
              {reportLoading ? (
                <div className="flex items-center justify-center h-full text-muted-foreground gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating narrative...
                </div>
              ) : (
                <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                  {report || "Could not generate report."}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button 
                onClick={() => setSelectedTeacher(null)}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default TeacherPerformanceView
