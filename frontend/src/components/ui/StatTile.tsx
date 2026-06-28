import React from "react"
import Card from "./Card"
import Sparkline from "./Sparkline"
import { useCountUp } from "../../hooks/useCountUp"
import { cn } from "../../lib/utils"

interface StatTileProps {
  label: string
  value: number | string
  suffix?: string
  icon?: React.ReactNode
  /** Token color name for the icon tint, e.g. "primary" | "accent" | "info". */
  accent?: string
  spark?: number[]
  className?: string
}

const StatTile: React.FC<StatTileProps> = ({ label, value, suffix, icon, accent = "primary", spark, className }) => {
  const isNumeric = typeof value === "number"
  const animated = useCountUp(isNumeric ? (value as number) : 0)
  const tint = `hsl(var(--${accent}))`

  return (
    <Card size="sm" className={cn("flex flex-col justify-between", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        {icon && (
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: `hsl(var(--${accent}) / 0.12)`, color: tint }}
          >
            {icon}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="tabular text-3xl font-bold leading-none text-foreground">
          {isNumeric ? animated.toLocaleString() : value}
          {suffix && <span className="ml-0.5 text-lg font-semibold text-muted-foreground">{suffix}</span>}
        </div>
        {spark && spark.length > 1 && <Sparkline data={spark} stroke={tint} className="h-8 w-20 shrink-0" />}
      </div>
    </Card>
  )
}

export default StatTile
