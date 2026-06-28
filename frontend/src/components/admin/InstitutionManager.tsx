import type React from "react"
import { useState, useEffect } from "react"
import { useToast } from "../../contexts/ToastContext"
import api from "../../utils/api"
import { Building2, Plus, Users, Loader2 } from "lucide-react"

interface Institution {
  id: string
  name: string
  active_students: number
  status: string
  tier: string
}

const InstitutionManager: React.FC = () => {
  const { error, success } = useToast()
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const [newTier, setNewTier] = useState("standard")

  useEffect(() => {
    fetchInstitutions()
  }, [])

  const fetchInstitutions = async () => {
    try {
      setLoading(true)
      const res = await api.get("/api/admin/institutions")
      setInstitutions(res.data.institutions || [])
    } catch (err: any) {
      error("Failed to fetch institutions", err.response?.data?.detail || "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!newName) return
    try {
      setIsCreating(true)
      const res = await api.post(`/api/admin/institutions?name=${encodeURIComponent(newName)}&tier=${newTier}`)
      success("Institution Created", res.data.message)
      setNewName("")
      fetchInstitutions()
    } catch (err: any) {
      error("Failed to create institution", err.response?.data?.detail || "Unknown error")
    } finally {
      setIsCreating(false)
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
      <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-border">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Institution & Tenant Management
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Super Admin view for managing isolated institutional instances and sub-admins.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow border border-border overflow-hidden">
          <div className="p-6 border-b border-border bg-muted/10 flex justify-between items-center">
            <h4 className="font-bold">Active Institutions</h4>
            <span className="text-sm bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">
              {institutions.length} Tenants
            </span>
          </div>
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Institution</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Tier</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Active Students</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {institutions.map(inst => (
                <tr key={inst.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-foreground">
                    {inst.name}
                  </td>
                  <td className="px-6 py-4 text-sm capitalize text-muted-foreground">
                    {inst.tier}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      {inst.active_students.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold capitalize ${
                      inst.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {inst.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-border p-6 h-fit space-y-4">
          <h4 className="font-bold flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            New Institution
          </h4>
          
          <div>
            <label className="block text-sm font-medium mb-1 text-foreground">Institution Name</label>
            <input 
              type="text" 
              value={newName} 
              onChange={e => setNewName(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary"
              placeholder="e.g. Stanford Univ"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-foreground">Plan Tier</label>
            <select 
              value={newTier} 
              onChange={e => setNewTier(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary"
            >
              <option value="basic">Basic (Up to 100 students)</option>
              <option value="standard">Standard (Up to 1000 students)</option>
              <option value="enterprise">Enterprise (Unlimited)</option>
            </select>
          </div>
          
          <button
            onClick={handleCreate}
            disabled={isCreating || !newName}
            className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isCreating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Building2 className="h-5 w-5" />}
            Provision Tenant
          </button>
        </div>
      </div>
    </div>
  )
}

export default InstitutionManager
