import React from "react"

interface SparklineProps {
  data: number[]
  className?: string
  /** CSS color (defaults to primary token). */
  stroke?: string
}

/** Tiny inline trend line (SVG, lightweight). */
const Sparkline: React.FC<SparklineProps> = ({ data, className, stroke = "hsl(var(--primary))" }) => {
  if (!data || data.length < 2) return null
  const w = 100
  const h = 28
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ")
  const areaPts = `0,${h} ${pts} ${w},${h}`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} preserveAspectRatio="none" fill="none" aria-hidden="true">
      <polygon points={areaPts} fill={stroke} opacity={0.12} />
      <polyline
        points={pts}
        stroke={stroke}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

export default Sparkline
