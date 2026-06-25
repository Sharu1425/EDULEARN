"use client"

import type React from "react"
import Card from "./ui/Card"
import Reveal from "./ui/Reveal"
import LoadingSpinner from "./ui/LoadingSpinner"
import { useCountUp } from "../hooks/useCountUp"

interface StatsCardProps {
  title: string
  value: number | string
  icon: React.ReactNode
  /** Tailwind gradient classes e.g. "from-emerald-500 to-green-400" */
  color: string
  /** Optional background/border classes e.g. "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/15 hover:border-emerald-500/50" */
  bgClass?: string
  loading?: boolean
  className?: string
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, color, bgClass = "", loading = false, className = "" }) => {
  const isNumeric = typeof value === "number"
  // Hook must run unconditionally; ignore the result for string values.
  const animated = useCountUp(isNumeric ? (value as number) : 0)

  return (
    <Reveal>
      <Card className={`p-6 text-center ${bgClass} ${className}`} hover={true}>
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-white bg-gradient-to-r ${color}`}
        >
          {icon}
        </div>
        <h3 className="text-2xl font-bold text-foreground mb-2 tabular">
          {loading ? <LoadingSpinner size="sm" /> : isNumeric ? animated.toLocaleString() : value}
        </h3>
        <p className="text-muted-foreground text-sm">{title}</p>
      </Card>
    </Reveal>
  )
}

export default StatsCard
