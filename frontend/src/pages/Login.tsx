"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import { motion } from "framer-motion"
import { useToast } from "../contexts/ToastContext"
import Input from "../components/ui/Input"
import Button from "../components/ui/Button"
import api from "../utils/api"
import { Sparkles, Brain, ArrowRight, Eye, EyeOff, Zap, Trophy, BarChart3 } from "lucide-react"

interface LoginProps {
  setUser: (user: any) => void
}

const BRAND_FEATURES = [
  { icon: Brain, text: "AI-Powered Assessments", color: "#38bdf8" },
  { icon: BarChart3, text: "Smart Performance Analytics", color: "#8b5cf6" },
  { icon: Trophy, text: "Live Leaderboards", color: "#22d3ee" },
  { icon: Zap, text: "ThinkTrace AI Interview", color: "#34d399" },
]

const Login: React.FC<LoginProps> = ({ setUser }) => {
  const { error, success } = useToast()
  const navigate = useNavigate()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  useEffect(() => {
    const savedUser = localStorage.getItem("user")
    if (savedUser) {
      const userData = JSON.parse(savedUser)
      switch (userData.role) {
        case "teacher": navigate("/teacher-dashboard", { replace: true }); break
        case "admin": navigate("/admin-dashboard", { replace: true }); break
        default: navigate("/dashboard", { replace: true })
      }
    }
  }, [navigate])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await api.post("/auth/login", { email, password })
      if (response.data.success) {
        const userData = { ...response.data.user, role: response.data.user.role || "student" }
        localStorage.setItem("user", JSON.stringify(userData))
        localStorage.setItem("access_token", response.data.access_token)
        setUser(userData)
        switch (userData.role) {
          case "teacher": navigate("/teacher-dashboard", { replace: true }); break
          case "admin": navigate("/admin-dashboard", { replace: true }); break
          default: navigate("/dashboard", { replace: true })
        }
        success("Login Successful!", `Welcome back, ${userData.name || userData.email}!`)
      } else {
        error("Login Failed", response.data.message || "Invalid credentials")
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || "Invalid credentials"
      const message = typeof errorMessage === "string" ? errorMessage : JSON.stringify(errorMessage)
      error("Login Failed", message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: "#020617" }}>

      {/* ── Left Panel — Branding ─────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[55%] relative flex-col items-center justify-center px-16 overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, #38bdf8, transparent 70%)", filter: "blur(80px)",
              animation: "orb-drift 14s ease-in-out infinite alternate" }} />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full opacity-15"
            style={{ background: "radial-gradient(circle, #8b5cf6, transparent 70%)", filter: "blur(80px)",
              animation: "orb-drift 18s ease-in-out infinite alternate-reverse" }} />
          {/* Grid lines */}
          <div className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: "linear-gradient(rgba(56,189,248,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.5) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }} />
        </div>

        <div className="relative z-10 max-w-md">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-3 mb-12"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-white font-black text-lg shadow-xl"
              style={{ background: "linear-gradient(135deg, #38bdf8, #8b5cf6)",
                boxShadow: "0 0 30px rgba(56,189,248,0.4)" }}>
              E
            </div>
            <span className="text-2xl font-black text-white font-heading">EduLearn</span>
          </motion.div>

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className="text-5xl font-black leading-tight text-white mb-4">
              Welcome back to{" "}
              <span className="bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(135deg, #38bdf8, #8b5cf6)" }}>
                intelligent
              </span>{" "}
              learning
            </h1>
            <p className="text-lg leading-relaxed mb-10" style={{ color: "rgba(255,255,255,0.45)" }}>
              Sign in to continue your AI-powered learning journey and access your personalized dashboard.
            </p>
          </motion.div>

          {/* Feature list */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="space-y-4"
          >
            {BRAND_FEATURES.map(({ icon: Icon, text, color }, i) => (
              <motion.div
                key={text}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                  <Icon className="h-4 w-4" style={{ color }} />
                </div>
                <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>{text}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Floating AI stat card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="mt-12 rounded-2xl border p-5"
            style={{
              background: "rgba(56,189,248,0.05)",
              borderColor: "rgba(56,189,248,0.15)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="h-4 w-4" style={{ color: "#38bdf8" }} />
              <span className="text-xs font-bold" style={{ color: "#38bdf8" }}>AI INSIGHT</span>
            </div>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
              Students using EduLearn AI see a{" "}
              <strong style={{ color: "#38bdf8" }}>40% improvement</strong> in exam performance
              within the first 4 weeks.
            </p>
          </motion.div>
        </div>
      </div>

      {/* ── Right Panel — Form ───────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative">
        {/* Subtle right panel glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.08), transparent 70%)", filter: "blur(60px)" }} />

        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md relative z-10"
        >
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl text-white font-black"
              style={{ background: "linear-gradient(135deg, #38bdf8, #8b5cf6)", boxShadow: "0 0 20px rgba(56,189,248,0.3)" }}>
              E
            </div>
            <span className="text-xl font-black text-white">EduLearn</span>
          </div>

          {/* Form card */}
          <div className="rounded-3xl border p-8"
            style={{
              background: "rgba(10,18,40,0.7)",
              backdropFilter: "blur(24px)",
              borderColor: "rgba(255,255,255,0.08)",
              boxShadow: "0 25px 80px rgba(0,0,0,0.4)",
            }}
          >
            <div className="mb-8">
              <h2 className="text-3xl font-black text-white mb-2">Sign In</h2>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                Enter your credentials to access your dashboard
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>
                  Email Address
                </label>
                <div className="relative">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="w-full pl-4 pr-4 py-3 rounded-xl border text-white placeholder:text-white/25 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      borderColor: "rgba(255,255,255,0.1)",
                    } as React.CSSProperties}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>
                  Password
                </label>
                <div className="relative">
                  <Input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-4 pr-12 py-3 rounded-xl border text-white placeholder:text-white/25 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      borderColor: "rgba(255,255,255,0.1)",
                    } as React.CSSProperties}
                  />
                  <button type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="glow"
                isLoading={loading}
                className="w-full py-3 text-base mt-2"
              >
                {!loading && <><Sparkles className="h-4 w-4 mr-2" />Sign In</>}
              </Button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>or</span>
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
            </div>

            <div className="text-center">
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                Don't have an account?{" "}
                <Link to="/signup"
                  className="font-semibold hover:opacity-80 transition-opacity inline-flex items-center gap-1"
                  style={{ color: "#38bdf8" }}>
                  Create account <ArrowRight className="h-3 w-3" />
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default Login
