"use client"

import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"

export const TypewriterEffect: React.FC<{
  text: string
  delay?: number
  className?: string
  speed?: number
  cursor?: boolean
}> = ({ text, delay = 0, className = "", speed = 40, cursor = true }) => {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    setIndex(0)
  }, [text])

  useEffect(() => {
    if (index >= text.length) return
    
    // Initial delay only applies when index is 0
    const delayTimeout = index === 0 ? delay * 1000 : 0
    
    const timeout = setTimeout(() => {
      setIndex((prev) => prev + 1)
    }, index === 0 ? delayTimeout : speed)

    return () => clearTimeout(timeout)
  }, [index, text.length, delay, speed])

  return (
    <span className={className}>
      {text.substring(0, index)}
      {cursor && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
          className="inline-block w-[2px] h-[0.9em] bg-current align-middle ml-[2px]"
          style={{ visibility: index < text.length ? 'visible' : 'visible' }} 
        />
      )}
    </span>
  )
}
