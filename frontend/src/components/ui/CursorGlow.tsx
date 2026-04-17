"use client"

import React, { useEffect, useRef, useState } from "react"

const CursorGlow: React.FC = () => {
  const glowRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const posRef = useRef({ x: -500, y: -500 })
  const currentPos = useRef({ x: -500, y: -500 })
  const animFrame = useRef<number>(0)

  useEffect(() => {
    // Don't render on touch devices
    if (window.matchMedia("(pointer: coarse)").matches) return

    const handleMouseMove = (e: MouseEvent) => {
      posRef.current = { x: e.clientX, y: e.clientY }
      if (!visible) setVisible(true)
    }

    const handleMouseLeave = () => setVisible(false)

    const animate = () => {
      // Smooth lerp so glow trails the cursor
      currentPos.current.x += (posRef.current.x - currentPos.current.x) * 0.1
      currentPos.current.y += (posRef.current.y - currentPos.current.y) * 0.1

      if (glowRef.current) {
        glowRef.current.style.left = `${currentPos.current.x}px`
        glowRef.current.style.top  = `${currentPos.current.y}px`
      }
      animFrame.current = requestAnimationFrame(animate)
    }

    window.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseleave", handleMouseLeave)
    animFrame.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseleave", handleMouseLeave)
      cancelAnimationFrame(animFrame.current)
    }
  }, [visible])

  return (
    <div
      ref={glowRef}
      className="cursor-glow"
      style={{ opacity: visible ? 1 : 0 }}
      aria-hidden="true"
    />
  )
}

export default CursorGlow
