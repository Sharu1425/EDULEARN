"use client"

import type React from "react"
import { motion } from "framer-motion"
import { AlertCircle } from "lucide-react"
import { cn } from "../../lib/utils"

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
}

const Input: React.FC<InputProps> = ({ label, error, icon, className = "", ...props }) => {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-foreground/70">{label}</label>
      )}

      <div className={cn("relative group", error && "animate-shake")}>
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary">
            {icon}
          </div>
        )}
        <input
          className={cn(
            "w-full rounded-xl border bg-muted/10 px-4 py-3 text-foreground backdrop-blur-md",
            "placeholder:text-muted-foreground/60",
            "transition-[border-color,box-shadow,background-color] duration-200 ease-out-expo",
            "focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 focus:bg-muted/20",
            icon && "pl-10",
            error
              ? "border-destructive focus:border-destructive focus:ring-destructive/20"
              : "border-border",
            className
          )}
          aria-invalid={!!error}
          {...props}
        />
      </div>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-1.5 text-sm text-destructive"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </motion.p>
      )}
    </div>
  )
}

export default Input
