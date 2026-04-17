"use client"

import React from "react"
import { motion } from "framer-motion"
import { useTheme } from "../../contexts/ThemeContext"

interface AnimatedOrbsProps {
  className?: string
}

const orbDefs = [
  {
    key: "orb-1",
    animate: {
      x: [0, 40, -20, 30, 0],
      y: [0, -30, 25, -10, 0],
      scale: [1, 1.05, 0.97, 1.03, 1],
    },
    duration: 14,
    // dark / light colors
    darkBg: "radial-gradient(circle, rgba(56, 189, 248, 0.18) 0%, transparent 70%)",
    lightBg: "radial-gradient(circle, rgba(99, 102, 241, 0.10) 0%, transparent 70%)",
    style: { top: "-100px", left: "-100px", width: "500px", height: "500px" },
  },
  {
    key: "orb-2",
    animate: {
      x: [0, -50, 30, -20, 0],
      y: [0, 40, -20, 30, 0],
      scale: [1, 0.95, 1.08, 0.98, 1],
    },
    duration: 18,
    darkBg: "radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)",
    lightBg: "radial-gradient(circle, rgba(14, 165, 233, 0.10) 0%, transparent 70%)",
    style: { top: "30%", right: "-150px", width: "600px", height: "600px" },
  },
  {
    key: "orb-3",
    animate: {
      x: [0, 30, -40, 20, 0],
      y: [0, -20, 35, -15, 0],
      scale: [1, 1.07, 0.94, 1.04, 1],
    },
    duration: 16,
    darkBg: "radial-gradient(circle, rgba(34, 211, 238, 0.12) 0%, transparent 70%)",
    lightBg: "radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 70%)",
    style: { bottom: "-80px", left: "30%", width: "400px", height: "400px" },
  },
]

const AnimatedOrbs: React.FC<AnimatedOrbsProps> = ({ className }) => {
  const { colorScheme } = useTheme()
  const isDark = colorScheme === "dark"

  return (
    <div
      className={`orb-layer ${className ?? ""}`}
      aria-hidden="true"
    >
      {orbDefs.map(orb => (
        <motion.div
          key={orb.key}
          style={{
            position: "absolute",
            borderRadius: "50%",
            filter: "blur(80px)",
            willChange: "transform",
            background: isDark ? orb.darkBg : orb.lightBg,
            ...orb.style,
          }}
          animate={orb.animate}
          transition={{
            duration: orb.duration,
            repeat: Infinity,
            repeatType: "mirror",
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  )
}

export default AnimatedOrbs
