"use client"

import type React from "react"
import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { motion } from "framer-motion"
import { useToast } from "../contexts/ToastContext"
import Input from "../components/ui/Input"
import Button from "../components/ui/Button"
import api from "../utils/api"
import {
  Sparkles, ArrowRight, Eye, EyeOff,
  GraduationCap, BookOpen, Shield, CheckCircle2
} from "lucide-react"

interface SignupProps {
  setUser: (user: any) => void
}

type Role = "student" | "teacher" | "admin"

const ROLES: { id: Role; label: string; icon: React.FC<any>; desc: string; color: string }[] = [
  { id: "student", label: "Student", icon: GraduationCap, desc: "Learn & grow", color: "#38bdf8" },
  { id: "teacher", label: "Teacher", icon: BookOpen, desc: "Teach & inspire", color: "#8b5cf6" },
  { id: "admin", label: "Admin", icon: Shield, desc: "Manage platform", color: "#22d3ee" },
]

const Signup: React.FC<SignupProps> = ({ setUser }) => {
  const { error, success } = useToast()
  const navigate = useNavigate()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState<Role>("student")
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) { error("Signup Failed", "Passwords do not match"); return }
    if (password.length < 6) { error("Signup Failed", "Password must be at least 6 characters"); return }

    setLoading(true)
    try {
      const response = await api.post("/auth/register", {
        username: name, email, password, role, name,
      })
      if (response.data.success) {
        const userData = { ...response.data.user, role: response.data.user.role || "student" }
        localStorage.setItem("user", JSON.stringify(userData))
        localStorage.setItem("access_token", response.data.access_token)
        setUser(userData)
        switch (userData.role) {
          case "teacher": navigate("/teacher-dashboard"); break
          case "admin": navigate("/admin-dashboard"); break
          default: navigate("/dashboard")
        }
        success("Account created!", `Welcome to EduLearn, ${userData.name || userData.email}!`)
      } else {
        error("Signup Failed", response.data.message || "Registration failed")
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || "Registration failed"
      const message = typeof errorMessage === "string" ? errorMessage : JSON.stringify(errorMessage)
      error("Signup Failed", message)
    } finally {
      setLoading(false)
    }
  }

  const selected = ROLES.find(r => r.id === role)!
  void selected // suppress unused warning


  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: "#020617" }}>

      {/* ── Left Panel — Branding ─────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[45%] relative flex-col items-center justify-center px-16 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full opacity-15"
            style={{ background: "radial-gradient(circle, #8b5cf6, transparent 70%)", filter: "blur(80px)",
              animation: "orb-drift 16s ease-in-out infinite alternate" }} />
          <div className="absolute bottom-1/4 right-0 w-[300px] h-[300px] rounded-full opacity-12"
            style={{ background: "radial-gradient(circle, #22d3ee, transparent 70%)", filter: "blur(60px)",
              animation: "orb-drift 12s ease-in-out infinite alternate-reverse" }} />
          <div className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: "linear-gradient(rgba(139,92,246,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.5) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }} />
        </div>

        <div className="relative z-10 max-w-sm">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-10"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-white font-black text-lg"
              style={{ background: "linear-gradient(135deg, #38bdf8, #8b5cf6)", boxShadow: "0 0 30px rgba(56,189,248,0.4)" }}>
              E
            </div>
            <span className="text-2xl font-black text-white font-heading">EduLearn</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <h1 className="text-4xl font-black leading-tight text-white mb-4">
              Join the future of{" "}
              <span className="bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(135deg, #8b5cf6, #22d3ee)" }}>
                AI education
              </span>
            </h1>
            <p className="text-base leading-relaxed mb-8" style={{ color: "rgba(255,255,255,0.45)" }}>
              Create your account and start your personalized AI learning journey today.
            </p>
          </motion.div>

          {/* Perks */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            className="space-y-3">
            {[
              "AI-generated personalized assessments",
              "Real-time coding environment",
              "Smart performance analytics",
              "ThinkTrace AI interview coach",
            ].map((perk, i) => (
              <motion.div
                key={perk}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.08 }}
                className="flex items-center gap-3"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "#34d399" }} />
                <span className="text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>{perk}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="mt-10 grid grid-cols-3 gap-4"
          >
            {[
              { val: "10K+", label: "Students" },
              { val: "500+", label: "Teachers" },
              { val: "40%", label: "Improvement" },
            ].map(({ val, label }) => (
              <div key={label} className="rounded-xl border p-3 text-center"
                style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.06)" }}>
                <div className="text-xl font-black bg-clip-text text-transparent"
                  style={{ backgroundImage: "linear-gradient(135deg, #38bdf8, #8b5cf6)" }}>
                  {val}
                </div>
                <div className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ── Right Panel — Form ────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative overflow-y-auto">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(56,189,248,0.06), transparent 70%)", filter: "blur(60px)" }} />

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

          <div className="rounded-3xl border p-8"
            style={{
              background: "rgba(10,18,40,0.7)",
              backdropFilter: "blur(24px)",
              borderColor: "rgba(255,255,255,0.08)",
              boxShadow: "0 25px 80px rgba(0,0,0,0.4)",
            }}
          >
            <div className="mb-6">
              <h2 className="text-3xl font-black text-white mb-1">Create Account</h2>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Join thousands of learners on EduLearn</p>
            </div>

            <form onSubmit={handleSignup} className="space-y-5">
              {/* Role Selector */}
              <div>
                <label className="block text-sm font-semibold mb-3" style={{ color: "rgba(255,255,255,0.6)" }}>
                  I am a:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {ROLES.map(({ id, label, icon: Icon, desc, color }) => (
                    <motion.button
                      key={id}
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setRole(id)}
                      className="relative flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all"
                      style={{
                        background: role === id ? `${color}12` : "rgba(255,255,255,0.02)",
                        borderColor: role === id ? `${color}50` : "rgba(255,255,255,0.08)",
                        boxShadow: role === id ? `0 0 20px ${color}18` : "none",
                      }}
                    >
                      <Icon className="h-5 w-5" style={{ color: role === id ? color : "rgba(255,255,255,0.3)" }} />
                      <span className="text-xs font-bold" style={{ color: role === id ? color : "rgba(255,255,255,0.4)" }}>
                        {label}
                      </span>
                      <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.25)" }}>{desc}</span>
                      {role === id && (
                        <motion.div
                          layoutId="role-active"
                          className="absolute inset-0 rounded-xl pointer-events-none"
                          style={{ border: `1px solid ${color}40` }}
                        />
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Fields */}
              {[
                { label: "Full Name", value: name, setter: setName, type: "text", placeholder: "Your full name" },
                { label: "Email Address", value: email, setter: setEmail, type: "email", placeholder: "your@email.com" },
              ].map(({ label, value, setter, type, placeholder }) => (
                <div key={label}>
                  <label className="block text-sm font-semibold mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>
                    {label}
                  </label>
                  <Input
                    type={type}
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    placeholder={placeholder}
                    required
                    className="w-full px-4 py-3 rounded-xl border text-white placeholder:text-white/25 focus:ring-2 transition-all"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      borderColor: "rgba(255,255,255,0.1)",
                    } as React.CSSProperties}
                  />
                </div>
              ))}

              {/* Password fields */}
              {[
                { label: "Password", value: password, setter: setPassword, show: showPass, toggle: () => setShowPass(!showPass) },
                { label: "Confirm Password", value: confirmPassword, setter: setConfirmPassword, show: showConfirm, toggle: () => setShowConfirm(!showConfirm) },
              ].map(({ label, value, setter, show, toggle }) => (
                <div key={label}>
                  <label className="block text-sm font-semibold mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>
                    {label}
                  </label>
                  <div className="relative">
                    <Input
                      type={show ? "text" : "password"}
                      value={value}
                      onChange={(e) => setter(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full pl-4 pr-12 py-3 rounded-xl border text-white placeholder:text-white/25 focus:ring-2 transition-all"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        borderColor: "rgba(255,255,255,0.1)",
                      } as React.CSSProperties}
                    />
                    <button type="button" onClick={toggle}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              ))}

              <Button
                type="submit"
                variant="glow"
                isLoading={loading}
                className="w-full py-3 text-base mt-1"
              >
                {!loading && (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Create Account
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                Already have an account?{" "}
                <Link to="/login"
                  className="font-semibold hover:opacity-80 transition-opacity inline-flex items-center gap-1"
                  style={{ color: "#38bdf8" }}>
                  Sign in <ArrowRight className="h-3 w-3" />
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default Signup
