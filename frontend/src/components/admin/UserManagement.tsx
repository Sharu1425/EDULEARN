"use client"

/**
 * Enhanced User Management Component
 * Comprehensive user CRUD operations and analytics
 */
import type React from "react"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { UserPlus, Search, Download, Upload, Edit, Trash2, Eye, TrendingUp, Award } from "lucide-react"
import { useToast } from "../../contexts/ToastContext"
import api from "../../utils/api"
import BulkTeacherUploadModal from "./BulkTeacherUploadModal"
import { BulkTeacherUploadResponse } from "../../api/bulkTeacherService"
import TeacherPerformanceView from "./TeacherPerformanceView"

interface User {
  id: string
  name: string
  email: string
  role: string
  last_login?: string
  total_logins: number
  activity_score: number
  progress_percentage: number
  assessments_taken: number
  average_score: number
  badges_earned: number
  streak_days: number
}

interface UserDetails {
  user: {
    id: string
    name: string
    email: string
    role: string
    created_at: string
    last_login?: string
    is_active: boolean
  }
  analytics: User
  recent_activity: any[]
  assessment_history: any[]
  badges: any[]
}

const UserManagement: React.FC = () => {
  const { success, error } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null)
  const [showUserDetails, setShowUserDetails] = useState(false)

  const [showBulkTeacherModal, setShowBulkTeacherModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  const [sortBy, setSortBy] = useState("activity_score")
  const [sortOrder, setSortOrder] = useState("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [activeTab, setActiveTab] = useState<"users" | "teacher-performance">("users")

  const itemsPerPage = 20

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await api.get("/api/admin/users/analytics", {
        params: {
          limit: itemsPerPage,
          offset: (currentPage - 1) * itemsPerPage,
          role: roleFilter || undefined,
          sort_by: sortBy,
          order: sortOrder,
        },
      })

      setUsers(response.data.users || [])
      setTotalPages(Math.ceil((response.data.total_count || 0) / itemsPerPage))
    } catch (err: any) {
      error("Failed to fetch users", err.response?.data?.detail || "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  // Fetch user details
  const fetchUserDetails = async (userId: string) => {
    try {
      const response = await api.get(`/api/admin/users/${userId}/details`)
      setSelectedUser(response.data)
      setShowUserDetails(true)
    } catch (err: any) {
      error("Failed to fetch user details", err.response?.data?.detail || "Unknown error")
    }
  }


  // Delete user
  const deleteUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return

    try {
      await api.delete(`/api/admin/users/${userId}`)
      success("User deleted successfully", "The user has been removed from the platform")
      fetchUsers()
    } catch (err: any) {
      error("Failed to delete user", err.response?.data?.detail || "Unknown error")
    }
  }

  // Export users
  const exportUsers = async (format: "csv" | "json") => {
    try {
      const response = await api.get("/api/admin/users/export", {
        params: { format, role: roleFilter || undefined },
      })

      if (format === "csv") {
        const blob = new Blob([response.data.content], { type: "text/csv" })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `users_export_${new Date().toISOString().split("T")[0]}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
      } else {
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: "application/json" })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `users_export_${new Date().toISOString().split("T")[0]}.json`
        a.click()
        window.URL.revokeObjectURL(url)
      }

      success("Export successful", "Users have been exported successfully")
    } catch (err: any) {
      error("Failed to export users", err.response?.data?.detail || "Unknown error")
    }
  }


  useEffect(() => {
    fetchUsers()
  }, [currentPage, roleFilter, sortBy, sortOrder])

  const filteredUsers = users.filter((user) => {
    const userName = user.name || ""
    const userEmail = user.email || ""

    return (
      userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      userEmail.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
      case "teacher":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
      case "student":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
    }
  }

  const getActivityColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400"
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400"
    return "text-red-600 dark:text-red-400"
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h2>
          <p className="text-gray-600 dark:text-gray-400">Manage users, roles, and permissions</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowBulkTeacherModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Upload className="h-4 w-4" />
            Bulk Upload Teachers
          </button>

          <div className="flex gap-1">
            <button
              onClick={() => exportUsers("csv")}
              className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              CSV
            </button>
            <button
              onClick={() => exportUsers("json")}
              className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              JSON
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-b border-border pb-1">
        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 font-semibold text-sm transition-colors border-b-2 ${
            activeTab === "users" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          All Users
        </button>
        <button
          onClick={() => setActiveTab("teacher-performance")}
          className={`px-4 py-2 font-semibold text-sm transition-colors border-b-2 ${
            activeTab === "teacher-performance" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Teacher Analytics
        </button>
      </div>

      {activeTab === "teacher-performance" ? (
        <TeacherPerformanceView />
      ) : (
        <>
          {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
        >
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="teacher">Teacher</option>
          <option value="student">Student</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
        >
          <option value="activity_score">Activity Score</option>
          <option value="progress_percentage">Progress</option>
          <option value="average_score">Average Score</option>
          <option value="last_login">Last Login</option>
        </select>

        <button
          onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          {sortOrder === "desc" ? "↓" : "↑"}
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading users...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Performance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.map((user) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div
                            className="h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold"
                            style={{ background: "linear-gradient(90deg, var(--primary), var(--accent))" }}
                          >
                            {(user.name || "U").charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.name || "Unknown"}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{user.email || "No email"}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role || "")}`}
                      >
                        {(user.role || "Unknown").charAt(0).toUpperCase() + (user.role || "Unknown").slice(1)}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <TrendingUp className="h-4 w-4 text-gray-400 mr-2" />
                        <span className={`text-sm font-medium ${getActivityColor(user.activity_score || 0)}`}>
                          {(user.activity_score || 0).toFixed(1)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{user.total_logins || 0} logins</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 dark:bg-gray-600 rounded-full h-2 mr-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(user.progress_percentage || 0, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {(user.progress_percentage || 0).toFixed(1)}%
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {user.assessments_taken || 0} assessments
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Avg: {(user.average_score || 0).toFixed(1)}%
                      </div>
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <Award className="h-3 w-3 mr-1" />
                        {user.badges_earned || 0} badges
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => fetchUserDetails(user.id)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            /* Implement edit */
                          }}
                          className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
                          title="Edit User"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteUser(user.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          title="Delete User"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            Previous
          </button>

          <span className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            Next
          </button>
        </div>
      )}
      </>
      )}

      {/* User Details Modal */}
      {showUserDetails && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                User Details: {selectedUser.user.name || "Unknown"}
              </h3>
              <button
                onClick={() => setShowUserDetails(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Basic Information</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Name:</span> {selectedUser.user.name || "Unknown"}
                  </div>
                  <div>
                    <span className="font-medium">Email:</span> {selectedUser.user.email || "No email"}
                  </div>
                  <div>
                    <span className="font-medium">Role:</span> {selectedUser.user.role || "Unknown"}
                  </div>
                  <div>
                    <span className="font-medium">Created:</span>{" "}
                    {selectedUser.user.created_at
                      ? new Date(selectedUser.user.created_at).toLocaleDateString()
                      : "Unknown"}
                  </div>
                  <div>
                    <span className="font-medium">Last Login:</span>{" "}
                    {selectedUser.user.last_login
                      ? new Date(selectedUser.user.last_login).toLocaleDateString()
                      : "Never"}
                  </div>
                </div>
              </div>

              {selectedUser.analytics && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Analytics</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Activity Score:</span>{" "}
                      {(selectedUser.analytics.activity_score || 0).toFixed(1)}
                    </div>
                    <div>
                      <span className="font-medium">Progress:</span>{" "}
                      {(selectedUser.analytics.progress_percentage || 0).toFixed(1)}%
                    </div>
                    <div>
                      <span className="font-medium">Assessments:</span> {selectedUser.analytics.assessments_taken || 0}
                    </div>
                    <div>
                      <span className="font-medium">Average Score:</span>{" "}
                      {(selectedUser.analytics.average_score || 0).toFixed(1)}%
                    </div>
                    <div>
                      <span className="font-medium">Badges:</span> {selectedUser.analytics.badges_earned || 0}
                    </div>
                    <div>
                      <span className="font-medium">Streak:</span> {selectedUser.analytics.streak_days || 0} days
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Teacher Upload Modal */}
      {showBulkTeacherModal && (
        <BulkTeacherUploadModal
          isOpen={showBulkTeacherModal}
          onClose={() => setShowBulkTeacherModal(false)}
          onSuccess={(res: BulkTeacherUploadResponse) => {
            success(
              "Bulk teacher upload completed",
              `Created ${res.successful_imports}, failed ${res.failed_imports}`
            )
            setShowBulkTeacherModal(false)
            fetchUsers()
          }}
        />
      )}
    </div>
  )
}

export default UserManagement
