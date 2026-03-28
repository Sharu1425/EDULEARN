/**
 * Role-Based Access Control Utilities for Frontend
 * Provides helper functions for role-based UI rendering and access control
 */

export type UserRole = "student" | "teacher" | "admin"

export interface User {
  id?: string
  email?: string
  username?: string
  name?: string
  role?: UserRole
  is_admin?: boolean
}

// Role hierarchy: admin > teacher > student
const ROLE_HIERARCHY: Record<UserRole, number> = {
  student: 1,
  teacher: 2,
  admin: 3,
}

/**
 * Check if user has a specific role or higher
 */
export const hasRole = (user: User | null, requiredRole: UserRole): boolean => {
  if (!user || !user.role) return false
  return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[requiredRole]
}

/**
 * Check if user has any of the specified roles
 */
export const hasAnyRole = (user: User | null, roles: UserRole[]): boolean => {
  if (!user || !user.role) return false
  return roles.includes(user.role)
}

/**
 * Check if user is admin
 */
export const isAdmin = (user: User | null): boolean => {
  return hasRole(user, "admin")
}

/**
 * Check if user is teacher or admin
 */
export const isTeacherOrAdmin = (user: User | null): boolean => {
  return hasAnyRole(user, ["teacher", "admin"])
}

/**
 * Check if user is student
 */
export const isStudent = (user: User | null): boolean => {
  return user?.role === "student"
}

/**
 * Check if user can create assessments (teacher or admin)
 */
export const canCreateAssessments = (user: User | null): boolean => {
  return isTeacherOrAdmin(user)
}

/**
 * Check if user can manage users (admin only)
 */
export const canManageUsers = (user: User | null): boolean => {
  return isAdmin(user)
}

/**
 * Check if user can view analytics (teacher or admin)
 */
export const canViewAnalytics = (user: User | null): boolean => {
  return isTeacherOrAdmin(user)
}

/**
 * Check if user can access coding platform (all roles)
 */
export const canAccessCodingPlatform = (user: User | null): boolean => {
  return !!user // All authenticated users can access coding platform
}

/**
 * Check if user can submit coding solutions (all roles)
 */
export const canSubmitSolutions = (user: User | null): boolean => {
  return !!user // All authenticated users can submit solutions
}

/**
 * Get user's display name with fallback
 */
export const getUserDisplayName = (user: User | null): string => {
  if (!user) return "Guest"
  return user.name || user.username || user.email || "User"
}

/**
 * Get user's role display name
 */
export const getRoleDisplayName = (role: UserRole): string => {
  const roleNames: Record<UserRole, string> = {
    student: "Student",
    teacher: "Teacher",
    admin: "Administrator",
  }
  return roleNames[role] || "Unknown"
}

/**
 * Check if user can access a specific route
 */
export const canAccessRoute = (user: User | null, route: string): boolean => {
  if (!user) return false

  const routePermissions: Record<string, UserRole[]> = {
    "/dashboard": ["student", "teacher", "admin"],
    "/teacher-dashboard": ["teacher", "admin"],
    "/admin-dashboard": ["admin"],
    "/coding": ["student", "teacher", "admin"],
    "/assessment-choice": ["student", "teacher", "admin"],
    "/profile": ["student", "teacher", "admin"],
    "/settings": ["student", "teacher", "admin"],
    "/my-results": ["student"],
  }

  const allowedRoles = routePermissions[route]
  if (!allowedRoles) return true // Allow access to unknown routes

  return hasAnyRole(user, allowedRoles)
}

/**
 * Get dashboard path based on user role
 */
export const getDashboardPath = (user: User | null): string => {
  if (!user) return "/login"

  switch (user.role) {
    case "admin":
      return "/admin-dashboard"
    case "teacher":
      return "/teacher-dashboard"
    case "student":
    default:
      return "/dashboard"
  }
}

/**
 * Get available navigation items based on user role
 */
export const getNavigationItems = (user: User | null) => {
  if (!user) return []
  const role = user.role || "student"
  if (role === "admin") {
    return [
      { path: "/admin-dashboard", label: "Admin", icon: "🛡️" },
      { path: "/teacher-dashboard", label: "Teacher", icon: "📚" },
      { path: "/dashboard", label: "Student", icon: "🏠" },
      { path: "/coding", label: "Coding", icon: "💻" },
      { path: "/settings", label: "Settings", icon: "⚙️" },
    ]
  }
  if (role === "teacher") {
    return [
      { path: "/teacher-dashboard", label: "Dashboard", icon: "📚" },
    ]
  }
  // student
  return [
    { path: "/dashboard", label: "Dashboard", icon: "🏠" },
  ]
}

export interface SidebarNavItem {
  path: string
  label: string
  icon: string  // Lucide icon name
  exact?: boolean
}

/**
 * Get full sidebar navigation config based on user role
 */
export const getSidebarNavItems = (user: User | null): SidebarNavItem[] => {
  if (!user) return []
  const role = user.role || "student"

  if (role === "student") {
    return [
      { path: "/dashboard", label: "Dashboard", icon: "LayoutDashboard", exact: true },
      { path: "/assessment-choice", label: "Assessments", icon: "ClipboardList" },
      { path: "/coding", label: "Coding Lab", icon: "Code2" },
      { path: "/my-results", label: "My Results", icon: "BarChart3" },
      { path: "/profile", label: "Profile", icon: "User" },
      { path: "/settings", label: "Settings", icon: "Settings" },
    ]
  }

  if (role === "teacher") {
    return [
      { path: "/teacher-dashboard", label: "Dashboard", icon: "LayoutDashboard", exact: true },
      { path: "/teacher/assessment-management", label: "Assessments", icon: "ClipboardList" },
      { path: "/teacher/student-management", label: "Students", icon: "Users" },
      { path: "/teacher/results-dashboard", label: "Results", icon: "Trophy" },
      { path: "/profile", label: "Profile", icon: "User" },
      { path: "/settings", label: "Settings", icon: "Settings" },
    ]
  }

  // admin
  return [
    { path: "/admin-dashboard", label: "Admin Panel", icon: "ShieldCheck", exact: true },
    { path: "/profile", label: "Profile", icon: "User" },
    { path: "/settings", label: "Settings", icon: "Settings" },
  ]
}
