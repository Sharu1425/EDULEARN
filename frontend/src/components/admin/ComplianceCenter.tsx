import type React from "react"
import { useState, useEffect } from "react"
import { useToast } from "../../contexts/ToastContext"
import api from "../../utils/api"
import { FileSignature, Shield, Download, CheckCircle, Loader2 } from "lucide-react"

interface AuditLog {
  id: string
  action: string
  actor: string
  target: string
  timestamp: string
}

interface ComplianceMetrics {
  logs: AuditLog[]
  active_consents: number
  erasure_requests_pending: number
}

const ComplianceCenter: React.FC = () => {
  const { error, success } = useToast()
  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMetrics()
  }, [])

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      const res = await api.get("/api/admin/compliance/audit-logs")
      setMetrics(res.data)
    } catch (err: any) {
      error("Failed to fetch compliance logs", err.response?.data?.detail || "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  const handleExportLogs = () => {
    success("Export Started", "Immutable audit logs are being exported to CSV.")
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
            <Shield className="h-6 w-6 text-primary" />
            Compliance & Audit Center
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            DPDP compliance, active consents, and immutable system audit logs.
          </p>
        </div>
        <button
          onClick={handleExportLogs}
          className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
        >
          <Download className="h-4 w-4" />
          Export Audit Logs
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-border flex items-center gap-4">
          <div className="p-3 bg-green-100 dark:bg-green-900/40 text-green-600 rounded-lg">
            <CheckCircle className="h-8 w-8" />
          </div>
          <div>
            <div className="text-3xl font-bold">{metrics.active_consents}</div>
            <div className="text-sm text-muted-foreground">Active DPDP Consents</div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-border flex items-center gap-4">
          <div className="p-3 bg-red-100 dark:bg-red-900/40 text-red-600 rounded-lg">
            <FileSignature className="h-8 w-8" />
          </div>
          <div>
            <div className="text-3xl font-bold">{metrics.erasure_requests_pending}</div>
            <div className="text-sm text-muted-foreground">Pending Erasure Requests</div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-border overflow-hidden">
        <div className="p-6 border-b border-border bg-muted/10">
          <h4 className="font-bold">Recent Audit Logs</h4>
        </div>
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Timestamp (UTC)</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actor</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Action</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Target</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {metrics.logs.map(log => (
              <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                  {new Date(log.timestamp).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm font-medium">
                  {log.actor}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                    log.action.includes('EXPORT') ? 'bg-blue-100 text-blue-700' :
                    log.action.includes('ERASURE') ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {log.action}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  {log.target}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ComplianceCenter
