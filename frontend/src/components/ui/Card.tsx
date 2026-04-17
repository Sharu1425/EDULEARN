"use client"

import React from "react"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface CardProps {
  children: React.ReactNode
  className?: string
  glow?: boolean
  hover?: boolean
  onClick?: () => void
}

const Card: React.FC<CardProps> = ({
  children,
  className = "",
  glow = false,
  hover = true,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        // Base glass morphism styling
        "relative rounded-2xl border backdrop-blur-xl transition-all duration-300",
        // Light mode
        "bg-white/70 border-white/60 shadow-[0_8px_32px_rgba(31,38,135,0.08)]",
        // Dark mode
        "dark:bg-[rgba(2,6,23,0.45)] dark:border-white/5 dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]",
        // Hover effects
        hover && [
          "hover:shadow-[0_16px_48px_rgba(31,38,135,0.12)]",
          "dark:hover:shadow-[0_16px_48px_rgba(0,0,0,0.6)]",
          "dark:hover:border-white/10",
          "dark:hover:bg-[rgba(2,6,23,0.6)]",
          "hover:-translate-y-0.5",
        ],
        // Optional glow
        glow && [
          "dark:shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_0_1px_rgba(34,211,238,0.15)]",
          "dark:hover:shadow-[0_16px_48px_rgba(0,0,0,0.5),0_0_0_1px_rgba(34,211,238,0.3),0_0_30px_rgba(34,211,238,0.1)]",
        ],
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  )
}

export default Card
