"use client"

import React, { useEffect, useRef } from "react"
import { useReducedMotion } from "framer-motion"
import { useTheme } from "../../contexts/ThemeContext"

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
}

const ParticleField: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animFrameRef = useRef<number>(0)
  const { colorScheme } = useTheme()
  const prefersReduced = useReducedMotion()

  useEffect(() => {
    // Respect the OS "reduce motion" setting — skip the whole engine.
    if (prefersReduced) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const isDark = colorScheme === "dark"
    // Fewer nodes on touch / low-power devices.
    const coarse = window.matchMedia("(pointer: coarse)").matches
    const maxCount = coarse ? 28 : 60
    const divisor = coarse ? 26000 : 18000
    const maxDist = 130

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      initParticles()
    }

    const initParticles = () => {
      const count = Math.min(maxCount, Math.floor((canvas.width * canvas.height) / divisor))
      particlesRef.current = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.5 + 0.1,
      }))
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const particles = particlesRef.current
      const nodeColor = isDark ? "56, 189, 248" : "99, 102, 241"
      const lineColor = isDark ? "56, 189, 248" : "99, 102, 241"

      // Update positions & draw nodes; bucket into a spatial grid as we go so
      // neighbour lookup for the connecting lines is ~O(n) instead of O(n²).
      const cell = maxDist
      const cols = Math.max(1, Math.ceil(canvas.width / cell))
      const grid = new Map<number, number[]>()

      particles.forEach((p, idx) => {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${nodeColor}, ${p.opacity})`
        ctx.fill()

        const cx = Math.min(cols - 1, Math.max(0, Math.floor(p.x / cell)))
        const cy = Math.max(0, Math.floor(p.y / cell))
        const key = cx + cy * cols
        const bucket = grid.get(key)
        if (bucket) bucket.push(idx)
        else grid.set(key, [idx])
      })

      // Connect each particle only to others in its cell + 8 neighbours.
      ctx.lineWidth = 0.6
      particles.forEach((p, i) => {
        const cx = Math.min(cols - 1, Math.max(0, Math.floor(p.x / cell)))
        const cy = Math.max(0, Math.floor(p.y / cell))
        for (let gx = cx - 1; gx <= cx + 1; gx++) {
          for (let gy = cy - 1; gy <= cy + 1; gy++) {
            const bucket = grid.get(gx + gy * cols)
            if (!bucket) continue
            for (const j of bucket) {
              if (j <= i) continue // each pair once
              const dx = p.x - particles[j].x
              const dy = p.y - particles[j].y
              const dist = Math.sqrt(dx * dx + dy * dy)
              if (dist < maxDist) {
                const alpha = (1 - dist / maxDist) * 0.25
                ctx.beginPath()
                ctx.moveTo(p.x, p.y)
                ctx.lineTo(particles[j].x, particles[j].y)
                ctx.strokeStyle = `rgba(${lineColor}, ${alpha})`
                ctx.stroke()
              }
            }
          }
        }
      })

      animFrameRef.current = requestAnimationFrame(draw)
    }

    const start = () => {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = requestAnimationFrame(draw)
    }
    const stop = () => cancelAnimationFrame(animFrameRef.current)

    // Pause the loop entirely while the tab is hidden — no wasted CPU/battery.
    const handleVisibility = () => {
      if (document.hidden) stop()
      else start()
    }

    resize()
    start()

    window.addEventListener("resize", resize)
    document.addEventListener("visibilitychange", handleVisibility)
    return () => {
      window.removeEventListener("resize", resize)
      document.removeEventListener("visibilitychange", handleVisibility)
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [colorScheme, prefersReduced])

  if (prefersReduced) return null

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[-1] pointer-events-none"
      aria-hidden="true"
    />
  )
}

export default ParticleField
