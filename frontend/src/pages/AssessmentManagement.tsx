"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { useToast } from "../contexts/ToastContext"
import { useAuth } from "../hooks/useAuth"
import Card from "../components/ui/Card"
import api from "../utils/api"
import { ANIMATION_VARIANTS } from "../utils/constants"
import {
  AssessmentForm,
} from "../components/teacher/assessment-management"

interface Batch {
  id: string
  name: string
  studentCount: number
  createdAt: string
  students?: any[]
}

const AssessmentManagement: React.FC = () => {
  const { user } = useAuth()
  const { error: showError } = useToast()
  
  const navigate = useNavigate()
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)

  // Early return if user is not available
  if (!user) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Loading...</h1>
          <p className="text-muted-foreground">Please wait while we load your dashboard.</p>
        </div>
      </div>
    )
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      console.log("📊 [ASSESSMENT MANAGEMENT] Fetching dashboard data...")
      
      // Fetch batches from API
      const batchesResponse = await api.get("/api/teacher/batches")
      if (batchesResponse.data && Array.isArray(batchesResponse.data)) {
        const formattedBatches = batchesResponse.data.map((batch: any) => ({
          id: batch.id,
          name: batch.name,
          studentCount: batch.student_count || 0,
          createdAt: batch.created_at || new Date().toISOString(),
        }))
        
        setBatches(formattedBatches)
        console.log("✅ [ASSESSMENT MANAGEMENT] Batches loaded:", formattedBatches.length)
      } else {
        console.warn("⚠️ [ASSESSMENT MANAGEMENT] No batches data received")
        setBatches([])
      }
      
    } catch (err) {
      console.error("❌ [ASSESSMENT MANAGEMENT] Failed to fetch dashboard data:", err)
      showError("Error", "Failed to load dashboard data")
      setBatches([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <>
        <div className="flex h-full items-center justify-center p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Loading Assessment Management...</h1>
            <p className="text-muted-foreground">Please wait while we load your data.</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <motion.div variants={ANIMATION_VARIANTS.fadeIn} initial="initial" animate="animate">
        <Card appearance="glass" hover={false} className="relative overflow-hidden p-7 text-center sm:p-9">
          <div className="aurora-mesh" />
          <div className="relative z-10">
            <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Assessment Management</h1>
            <p className="mt-2 text-muted-foreground">Create, manage, and analyze assessments</p>
          </div>
        </Card>
      </motion.div>

      <Card className="p-6 sm:p-8">
        {/* Assessment Creation Form */}
        <AssessmentForm
          batches={batches}
          onCreateMCQ={() => navigate("/teacher/create-assessment?type=mcq")}
          onCreateAICoding={() => navigate("/teacher/create-assessment?type=ai_coding")}
          onAIGenerate={() => navigate("/teacher/create-assessment?type=ai")}
        />
      </Card>
    </div>
  )
}

export default AssessmentManagement