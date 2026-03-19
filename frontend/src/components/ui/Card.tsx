"use client"

import type React from "react"
import { motion } from "framer-motion"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  glass?: boolean
}

const Card: React.FC<CardProps> = ({ children, className = "", hover = false, glass = false }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      whileHover={hover ? { y: -4, scale: 1.01 } : {}}
      className={cn(
        "relative rounded-3xl overflow-hidden text-card-foreground transition-all duration-500",
        glass ? "glass-card" : "border border-border/60 bg-card shadow-2xl shadow-black/5 dark:shadow-black/40",
        hover ? "hover:shadow-2xl hover:shadow-black/10 dark:hover:shadow-cyan-500/10 hover:border-foreground/10" : "",
        className
      )}
    >
      <div className="relative h-full w-full">{children}</div>
    </motion.div>
  )
}

export default Card
