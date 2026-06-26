"use client"

import type React from "react"
import LoadingSpinner from "./ui/LoadingSpinner"
import Card from "./ui/Card"

interface LoadingStateProps {
  text?: string
  size?: "sm" | "md" | "lg"
  showCard?: boolean
  className?: string
  fullScreen?: boolean
}

const LoadingState: React.FC<LoadingStateProps> = ({
  text = "Loading...",
  size = "md",
  showCard = false,
  className = "",
  fullScreen = false,
}) => {
  const content = (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <LoadingSpinner size={size} text={text} />
    </div>
  )

  if (fullScreen) {
    return <div className="min-h-screen app-bg flex items-center justify-center">{content}</div>
  }

  if (showCard) {
    return <Card hover={false} className="p-8 max-w-md mx-auto text-center">{content}</Card>
  }

  return content
}

export default LoadingState
