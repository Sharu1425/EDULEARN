"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import { motion } from "framer-motion"
import { useToast } from "../contexts/ToastContext"
import Card from "../components/ui/Card"
import Input from "../components/ui/Input"
import Button from "../components/ui/Button"
import api from "../utils/api"
import { ANIMATION_VARIANTS } from "../utils/constants"

interface LoginProps {
  setUser: (user: any) => void
}

const Login: React.FC<LoginProps> = ({ setUser }) => {
  const { error, success } = useToast()
  const navigate = useNavigate()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  // Check if user is already logged in
  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      const userData = JSON.parse(savedUser)

      // Redirect based on role
      switch (userData.role) {
        case "teacher":
          navigate("/teacher-dashboard", { replace: true })
          break
        case "admin":
          navigate("/admin-dashboard", { replace: true })
          break
        default:
          navigate("/dashboard", { replace: true })
          break
      }
    }
  }, [navigate])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await api.post("/auth/login", { email, password })

      if (response.data.success) {
        const userData = {
          ...response.data.user,
          role: response.data.user.role || "student",
        }

        // Store user data and token
        localStorage.setItem("user", JSON.stringify(userData))
        localStorage.setItem("access_token", response.data.access_token)

        // Set user in context
        setUser(userData)

        // Redirect based on role
        switch (userData.role) {
          case "teacher":
            navigate("/teacher-dashboard", { replace: true })
            break
          case "admin":
            navigate("/admin-dashboard", { replace: true })
            break
          default:
            navigate("/dashboard", { replace: true })
            break
        }

        success("Login Successful!", `Welcome back, ${userData.name || userData.email}!`)
      } else {
        error("Login Failed", response.data.message || "Invalid credentials")
      }
    } catch (err: any) {
      console.error("Login error:", err)
      const errorMessage = err.response?.data?.detail || "Invalid credentials"
      // Ensure error message is a string, not an object
      const message = typeof errorMessage === "string" ? errorMessage : JSON.stringify(errorMessage)
      error("Login Failed", message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="min-h-screen pt-20 px-4 flex items-center justify-center relative z-10">
        <motion.div
          variants={ANIMATION_VARIANTS.fadeIn}
          initial="initial"
          animate="animate"
          className="w-full max-w-md"
        >
          <Card className="p-8">
            <motion.div variants={ANIMATION_VARIANTS.slideDown} className="text-center mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Welcome Back</h1>
              <p className="text-muted-foreground">Sign in to your account</p>
            </motion.div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full py-3" variant="primary">
                {loading ? "Signing In..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-muted-foreground">
                Don't have an account?{" "}
                <Link to="/signup" className="text-foreground hover:opacity-80 font-medium">
                  Sign up
                </Link>
              </p>
            </div>
          </Card>
        </motion.div>
      </div>
    </>
  )
}

export default Login
