import type React from "react"
import { useState, useEffect } from "react"
import { useToast } from "../../contexts/ToastContext"
import api from "../../utils/api"
import { FileText, Loader2, Sparkles, UploadCloud, AlertTriangle } from "lucide-react"
import Card from "../ui/Card"

interface Alignment {
  standard: string
  coverage: number
  question_count: number
  alert?: boolean
}

const AlignmentMapper: React.FC = () => {
  const { error, success } = useToast()
  const [matrix, setMatrix] = useState<Alignment[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetchMatrix()
  }, [])

  const fetchMatrix = async () => {
    try {
      setLoading(true)
      const res = await api.get("/api/admin/curriculum/matrix")
      setMatrix(res.data.matrix || [])
    } catch (err: any) {
      error("Failed to fetch alignment matrix", err.response?.data?.detail || "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    
    try {
      setUploading(true)
      // Simulate file upload
      const formData = new FormData()
      formData.append("file", e.target.files[0])
      
      const res = await api.post("/api/admin/curriculum/upload", formData)
      success("Curriculum Processed", res.data.message)
      fetchMatrix()
    } catch (err: any) {
      error("Upload failed", err.response?.data?.detail || "Unknown error")
    } finally {
      setUploading(false)
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
      <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-border">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Curriculum Alignment Mapper
          </h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Upload institutional curriculum standards (PDF/Docx). Our AI will parse the learning objectives and map them against our existing content library to identify gaps.
          </p>
        </div>
        
        <div>
          <label className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 cursor-pointer transition-colors">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            <span className="font-medium">{uploading ? "Parsing PDF..." : "Upload Standards"}</span>
            <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleFileUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-border overflow-hidden">
        <div className="p-6 border-b border-border flex justify-between items-center bg-muted/10">
          <h4 className="font-bold">Content Coverage Matrix</h4>
          <span className="text-sm text-muted-foreground">{matrix.length} Standards Mapped</span>
        </div>
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Learning Standard</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Coverage %</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Available Questions</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {matrix.map((item, idx) => (
              <tr key={idx} className="hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-medium text-foreground flex items-center gap-2">
                    {item.standard}
                    {item.alert && <AlertTriangle className="h-4 w-4 text-amber-500" title="Low Coverage Warning" />}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 max-w-[100px]">
                      <div 
                        className={`h-2.5 rounded-full ${item.coverage >= 75 ? 'bg-green-500' : item.coverage >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                        style={{ width: `${item.coverage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{item.coverage}%</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm">
                  {item.question_count}
                </td>
                <td className="px-6 py-4 text-right">
                  {item.alert ? (
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-md text-xs font-semibold transition-colors">
                      <Sparkles className="h-3 w-3" />
                      Generate Content
                    </button>
                  ) : (
                    <span className="text-muted-foreground text-sm font-medium">Adequate</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AlignmentMapper
