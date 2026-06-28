"use client"

import React from "react"
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"

import { ThemeProvider, useTheme } from "./contexts/ThemeContext"

class ErrorBoundary extends React.Component<any, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "2rem", color: "red", backgroundColor: "black", width: "100%", height: "100%" }}>
          <h2>React Render Error</h2>
          <pre>{this.state.error?.toString()}</pre>
          <pre>{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
import { ToastProvider, useToast } from "./contexts/ToastContext"
import { HeaderTitleProvider } from "./contexts/HeaderTitleContext"
import { useAuth } from "./hooks/useAuth"
import Header from "./components/ui/Header"
import Sidebar from "./components/ui/Sidebar"
import ToastContainer from "./components/ui/ToastContainer"
import LoadingState from "./components/LoadingState"
import ProtectedRoute from "./components/ProtectedRoute"
import AnimatedOrbs from "./components/ui/AnimatedOrbs"
import ParticleField from "./components/ui/ParticleField"
import CursorGlow from "./components/ui/CursorGlow"
import CommandPalette from "./components/ui/CommandPalette"
import { cn } from "./lib/utils"
import { useBackgroundTier } from "./hooks/useBackgroundTier"
import { pageTransition, instant } from "./lib/motion"

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
import CodingComingSoon from "./pages/CodingComingSoon"
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
import MasteryPage from "./pages/student/MasteryPage"
import MasteryNodeMap from "./pages/student/MasteryNodeMap"

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

// ─── Theme crossfade — subtle radial flash when switching light/dark ────────
const ThemeFlash: React.FC = () => {
  const { colorScheme } = useTheme()
  const [flash, setFlash] = React.useState(false)
  const first = React.useRef(true)

  React.useEffect(() => {
    if (first.current) { first.current = false; return }
    setFlash(true)
    const t = setTimeout(() => setFlash(false), 450)
    return () => clearTimeout(t)
  }, [colorScheme])

  return (
    <AnimatePresence>
      {flash && (
        <motion.div
          key="theme-flash"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.55 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-none fixed inset-0 z-[9998]"
          style={{ background: "radial-gradient(circle at 50% 0%, hsl(var(--primary) / 0.18), transparent 60%)" }}
          aria-hidden="true"
        />
      )}
    </AnimatePresence>
  )
}

// ─── Inner layout component (uses useLocation, so must be inside Router) ────
const AppLayout: React.FC<{
  user: any; setUser: any;
}> = ({ user, setUser }) => {
  const { toasts, removeToast } = useToast()
  const location = useLocation()
  const bgTier = useBackgroundTier()

  // Sidebar collapsed state lives here so the Header brand block + Sidebar stay in sync.
  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
    try { return localStorage.getItem("sidebar-collapsed") === "true" } catch { return false }
  })
  React.useEffect(() => {
    try { localStorage.setItem("sidebar-collapsed", String(collapsed)) } catch { /* ignore */ }
  }, [collapsed])

  const fullscreen = isFullscreenPath(location.pathname)
  // Show Sidebar and Header on authenticated, non-fullscreen routes
  const showSidebarAndHeader = !!user && !fullscreen

  return (
    <>
      <div className="app-bg" aria-hidden="true" />
      {/* Ambient layers are tiered per-route for performance:
          full = orbs + particles + cursor glow, reduced = orbs + glow, off = none */}
      {bgTier !== "off" && <AnimatedOrbs />}
      {bgTier === "full" && <ParticleField />}
      {bgTier !== "off" && <CursorGlow />}
      <ThemeFlash />
      {showSidebarAndHeader && <CommandPalette />}
      <ToastContainer toasts={toasts} onClose={removeToast} />

      <div className="flex h-full flex-col relative overflow-hidden">
        {/* Static app-shell header spanning the full width */}
        {showSidebarAndHeader && (
          <Header
            onMenuClick={() => window.dispatchEvent(new Event('toggle-mobile-sidebar'))}
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed(c => !c)}
          />
        )}

        {/* Content row under header — min-h-0 lets <main> scroll instead of growing the page */}
        <div className={showSidebarAndHeader ? "flex flex-1 min-h-0 overflow-hidden" : "flex flex-1 min-h-0"}>

          {/* Sidebar (full height of the row) */}
          {showSidebarAndHeader && <Sidebar user={user} collapsed={collapsed} />}

          {/* Main content — the only scroll container */}
          <main className={cn(
            "flex-1 min-h-0 overflow-x-hidden overflow-y-auto w-full relative",
            showSidebarAndHeader && "bg-background/40"
          )}>
            <div className={cn(
              "mx-auto w-full",
              !fullscreen && "pb-12"
            )}>
              <ErrorBoundary>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={location.pathname}
                    variants={fullscreen ? instant : pageTransition}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                  <Routes location={location}>
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
                    <Route path="/coding/problems" element={<ProtectedRoute allowedRoles={["student"]}><CodingComingSoon title="All Problems" subtitle="Browse every coding problem you've generated." /></ProtectedRoute>} />
                    <Route path="/coding/analytics" element={<ProtectedRoute allowedRoles={["student"]}><CodingComingSoon title="Coding Analytics" subtitle="Track your progress, statistics, and AI insights." /></ProtectedRoute>} />
                    <Route path="/coding/learning-path" element={<ProtectedRoute allowedRoles={["student"]}><CodingComingSoon title="Learning Path" subtitle="Personalized AI-generated learning recommendations." /></ProtectedRoute>} />
                    <Route path="/coding/problem/:problemId" element={<ProtectedRoute allowedRoles={["student"]}>{user && <CodingProblemPage user={user} />}</ProtectedRoute>} />
                    <Route path="/assessconfig" element={<ProtectedRoute allowedRoles={["student"]}><UnifiedAssessment /></ProtectedRoute>} />
                    <Route path="/assessment-choice" element={<ProtectedRoute allowedRoles={["student"]}><UnifiedAssessment /></ProtectedRoute>} />
                    <Route path="/unified-assessment" element={<ProtectedRoute allowedRoles={["student"]}><UnifiedAssessment /></ProtectedRoute>} />
                    <Route path="/student/live/:batchId" element={<ProtectedRoute allowedRoles={["student"]}><StudentLiveRoom /></ProtectedRoute>} />
                    <Route path="/thinktrace" element={<ProtectedRoute allowedRoles={["student"]}><ThinkTraceSession /></ProtectedRoute>} />
                    <Route path="/thinktrace-result/:sessionId" element={<ProtectedRoute allowedRoles={["student"]}><ThinkTraceResultDetail /></ProtectedRoute>} />
                    <Route path="/mastery" element={<ProtectedRoute allowedRoles={["student"]}><MasteryPage /></ProtectedRoute>} />
                    <Route path="/mastery/:roadmapId" element={<ProtectedRoute allowedRoles={["student"]}><MasteryNodeMap /></ProtectedRoute>} />

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
                  </motion.div>
                </AnimatePresence>
              </ErrorBoundary>
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
        <HeaderTitleProvider>
          <Router>
            <div className="h-screen relative overflow-hidden transition-colors duration-300 bg-background text-foreground">
              <AppLayout
                user={user}
                setUser={setUser}
              />
            </div>
          </Router>
        </HeaderTitleProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}

const App: React.FC = () => <AppContent />

export default App