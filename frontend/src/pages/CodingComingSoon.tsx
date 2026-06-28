"use client"

import type React from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { Construction, ArrowLeft } from "lucide-react"
import Card from "../components/ui/Card"
import Button from "../components/ui/Button"

interface CodingComingSoonProps {
  title: string
  subtitle?: string
}

const CodingComingSoon: React.FC<CodingComingSoonProps> = ({ title, subtitle }) => {
  const navigate = useNavigate()

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Card appearance="glass" hover={false} className="relative overflow-hidden p-7 sm:p-9">
          <div className="aurora-mesh" />
          <div className="relative z-10">
            <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{title}</h1>
            {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
          </div>
        </Card>
      </motion.div>

      {/* Work in progress */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="flex flex-col items-center justify-center gap-4 p-12 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary animate-float">
            <Construction className="h-8 w-8" />
          </span>
          <div>
            <h2 className="font-heading text-xl font-bold text-foreground">Work in Progress</h2>
            <p className="mt-1 max-w-sm text-muted-foreground">
              This feature is being built and will be available soon.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/coding")}>
            <ArrowLeft className="h-4 w-4" /> Back to Coding Lab
          </Button>
        </Card>
      </motion.div>
    </div>
  )
}

export default CodingComingSoon
