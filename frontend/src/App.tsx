"use client"

import React from "react"
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from "react-router-dom"
import { AnimatePresence } from "framer-motion"

import { ThemeProvider } from "./contexts/ThemeContext"
import { ToastProvider, useToast } from "./contexts/ToastContext"
import { useAuth } from "./hooks/useAuth"
import Header from "./components/ui/Header"
import Sidebar from "./components/ui/Sidebar"
import ToastContainer from "./components/ui/ToastContainer"
import LoadingState from "./components/LoadingState"
import ProtectedRoute from "./components/ProtectedRoute"
import { cn } from "./lib/utils"

import LandingPage from "./pages/LandingPage"
import Dashboard from "./pages/Dashboard"
import Assessment from "./pages/Assessment"
import Results from "./pages/Results"
import StudentResults from "./pages/StudentResults"
import CodingResults from "./pages/CodingResults"
import TestResultDetail from "./pages/TestResultDetail"
import Login from "./pages/Login"
import Signup from "./pages/Signup"
import UserProfile from "./pages/UserProfile"
import Settings from "./pages/Settings"
import TeacherProfile from "./pages/TeacherProfile"
import TeacherSettings from "./pages/TeacherSettings"
import CodingPlatform from "./pages/CodingPlatform"
import CodingProblemPage from "./pages/CodingProblem"
import UnifiedAssessment from "./pages/UnifiedAssessment"
import TeacherDashboard from "./pages/TeacherDashboard"
import TeacherResultsDashboard from "./pages/TeacherResultsDashboard"
import TeacherAssessmentResults from "./pages/TeacherAssessmentResults"
import TeacherAssessmentHistory from "./pages/TeacherAssessmentHistory"
import StudentManagement from "./pages/StudentManagement"
import AssessmentManagement from "./pages/AssessmentManagement"
import CreateAssessment from "./pages/CreateAssessment"
import BatchAnalytics from "./pages/BatchAnalytics"
import EnhancedAdminDashboard from "./components/admin/EnhancedAdminDashboard"
import TestPage from "./pages/TestPage"
import TeacherLiveConsole from "./pages/TeacherLiveConsole"
import StudentLiveRoom from "./pages/StudentLiveRoom"
import ThinkTraceSession from "./pages/ThinkTraceSession"
import ThinkTraceResultDetail from "./pages/ThinkTraceResultDetail"

const FULLSCREEN_ROUTES = [
  "/assessment",
  "/test/",
  "/coding/problem/",
  "/student/live/",
  "/teacher/live/"
]

const isFullscreenPath = (pathname: string) =>
  FULLSCREEN_ROUTES.some(r => 
    pathname === r || (pathname.startsWith(r) && (r.endsWith("/") || pathname.charAt(r.length) === "/"))
  )

// ─── Helper ─────────────────────────────────────────────────────────────────
const getDashboardPath = (user: any) => {
  if (!user) return "/login"
  switch (user.role) {
    case "teacher": return "/teacher-dashboard"
    case "admin": return "/admin-dashboard"
    default: return "/dashboard"
  }
}

// ─── Inner layout component (uses useLocation, so must be inside Router) ────
const AppLayout: React.FC<{
  user: any; setUser: any;
}> = ({ user, setUser }) => {
  const { toasts, removeToast } = useToast()
  const location = useLocation()

  const fullscreen = isFullscreenPath(location.pathname)
  // Show Sidebar and Header on authenticated, non-fullscreen routes
  const showSidebarAndHeader = !!user && !fullscreen

  return (
    <>
      <div className="app-bg" aria-hidden="true" />
      <ToastContainer toasts={toasts} onClose={removeToast} />

      <div className="flex flex-col min-h-screen relative overflow-hidden">
        {/* Top Header spans full width */}
        {showSidebarAndHeader && (
          <Header onMenuClick={() => window.dispatchEvent(new Event('toggle-mobile-sidebar'))} />
        )}

        {/* Content Area flex container under Header */}
        <div className={showSidebarAndHeader ? "flex flex-1 overflow-hidden" : "flex flex-1"}>

          {/* Sidebar sits below header */}
          {showSidebarAndHeader && <Sidebar user={user} />}

          {/* Main Content Area */}
          <main className={cn(
            "flex-1 overflow-y-auto w-full relative",
            showSidebarAndHeader && "bg-background/40"
          )}>
            {/* If Header is fixed, we might need a top spacer. Let's see if Header uses fixed. Yes it does in Header.tsx. So add pt-16. */}
            {showSidebarAndHeader && <div className="h-16 w-full shrink-0" />}
            <div className={cn(
              "mx-auto w-full",
              !fullscreen && "pb-12"
            )}>
              <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                  {/* Public */}
                  <Route path="/" element={user ? <Navigate to={getDashboardPath(user)} replace /> : <LandingPage />} />
                  <Route path="/login" element={user ? <Navigate to={getDashboardPath(user)} replace /> : <Login setUser={setUser} />} />
                  <Route path="/signup" element={user ? <Navigate to={getDashboardPath(user)} replace /> : <Signup setUser={setUser} />} />

                  {/* Student */}
                  <Route path="/dashboard" element={<ProtectedRoute allowedRoles={["student"]}><Dashboard /></ProtectedRoute>} />
                  <Route path="/assessment" element={<ProtectedRoute allowedRoles={["student"]}><Assessment /></ProtectedRoute>} />
                  <Route path="/assessment/:id" element={<ProtectedRoute allowedRoles={["student"]}><Assessment /></ProtectedRoute>} />
                  <Route path="/test/:assessmentId" element={<ProtectedRoute allowedRoles={["student"]}><TestPage /></ProtectedRoute>} />
                  <Route path="/my-results" element={<ProtectedRoute allowedRoles={["student"]}>{user && <StudentResults />}</ProtectedRoute>} />
                  <Route path="/results" element={<ProtectedRoute allowedRoles={["student"]}>{user && <Results user={user} />}</ProtectedRoute>} />
                  <Route path="/coding-results" element={<ProtectedRoute allowedRoles={["student"]}><CodingResults /></ProtectedRoute>} />
                  <Route path="/test-result/:resultId" element={<ProtectedRoute allowedRoles={["student"]}><TestResultDetail /></ProtectedRoute>} />
                  <Route path="/coding" element={<ProtectedRoute allowedRoles={["student"]}><CodingPlatform /></ProtectedRoute>} />
                  <Route path="/coding/problem/:problemId" element={<ProtectedRoute allowedRoles={["student"]}>{user && <CodingProblemPage user={user} />}</ProtectedRoute>} />
                  <Route path="/assessconfig" element={<ProtectedRoute allowedRoles={["student"]}><UnifiedAssessment /></ProtectedRoute>} />
                  <Route path="/assessment-choice" element={<ProtectedRoute allowedRoles={["student"]}><UnifiedAssessment /></ProtectedRoute>} />
                  <Route path="/unified-assessment" element={<ProtectedRoute allowedRoles={["student"]}><UnifiedAssessment /></ProtectedRoute>} />
                  <Route path="/student/live/:batchId" element={<ProtectedRoute allowedRoles={["student"]}><StudentLiveRoom /></ProtectedRoute>} />
                  <Route path="/thinktrace" element={<ProtectedRoute allowedRoles={["student"]}><ThinkTraceSession /></ProtectedRoute>} />
                  <Route path="/thinktrace-result/:sessionId" element={<ProtectedRoute allowedRoles={["student"]}><ThinkTraceResultDetail /></ProtectedRoute>} />

                  {/* Teacher */}
                  <Route path="/teacher-dashboard" element={<ProtectedRoute allowedRoles={["teacher"]}><TeacherDashboard /></ProtectedRoute>} />
                  <Route path="/teacher/student-management" element={<ProtectedRoute allowedRoles={["teacher"]}><StudentManagement /></ProtectedRoute>} />
                  <Route path="/teacher/assessment-management" element={<ProtectedRoute allowedRoles={["teacher"]}><AssessmentManagement /></ProtectedRoute>} />
                  <Route path="/teacher/create-assessment" element={<ProtectedRoute allowedRoles={["teacher"]}><CreateAssessment /></ProtectedRoute>} />
                  <Route path="/teacher/batch-analytics" element={<ProtectedRoute allowedRoles={["teacher"]}><BatchAnalytics /></ProtectedRoute>} />
                  <Route path="/teacher/results-dashboard" element={<ProtectedRoute allowedRoles={["teacher"]}><TeacherResultsDashboard /></ProtectedRoute>} />
                  <Route path="/teacher/assessment-history" element={<ProtectedRoute allowedRoles={["teacher"]}><TeacherAssessmentHistory /></ProtectedRoute>} />
                  <Route path="/teacher/assessment/:assessmentId/results" element={<ProtectedRoute allowedRoles={["teacher"]}><TeacherAssessmentResults /></ProtectedRoute>} />
                  <Route path="/teacher/live/:batchId" element={<ProtectedRoute allowedRoles={["teacher"]}><TeacherLiveConsole /></ProtectedRoute>} />
                  <Route path="/teacher/test-result/:resultId" element={<ProtectedRoute allowedRoles={["teacher"]}><TestResultDetail /></ProtectedRoute>} />

                  {/* Admin */}
                  <Route path="/admin-dashboard" element={
                    <ProtectedRoute allowedRoles={["admin"]}>
                      <EnhancedAdminDashboard />
                    </ProtectedRoute>
                  } />

                  {/* Shared */}
                  <Route path="/profile" element={
                    <ProtectedRoute allowedRoles={["student", "teacher", "admin"]}>
                      {user && user.role === "teacher" ? <TeacherProfile /> : <UserProfile user={user} />}
                    </ProtectedRoute>
                  } />
                  <Route path="/settings" element={
                    <ProtectedRoute allowedRoles={["student", "teacher", "admin"]}>
                      {user && user.role === "teacher" ? <TeacherSettings /> : <Settings user={user} />}
                    </ProtectedRoute>
                  } />
                </Routes>
              </AnimatePresence>
            </div>
          </main>
        </div>
      </div>
    </>
  )
}

// ─── Root component ──────────────────────────────────────────────────────────
const AppContent: React.FC = () => {
  const { user, setUser, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingState text="Loading application..." size="lg" fullScreen={true} />
  }

  return (
    <ThemeProvider>
      <ToastProvider>
        <Router>
          <div className="min-h-screen relative overflow-hidden transition-colors duration-300 bg-background text-foreground">
            <AppLayout
              user={user}
              setUser={setUser}
            />
          </div>
        </Router>
      </ToastProvider>
    </ThemeProvider>
  )
}

const App: React.FC = () => <AppContent />

export default App