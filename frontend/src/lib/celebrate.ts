/**
 * celebrate() — lightweight confetti burst for "win" moments (assessment pass,
 * achievement unlocked). Pure DOM + Web Animations API, no dependency, and a
 * no-op under prefers-reduced-motion. Self-cleans after the animation.
 */
export function celebrate(options?: { count?: number; originY?: number }) {
  if (typeof window === "undefined") return
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

  const count = options?.count ?? 90
  const colors = ["#10b981", "#14b8a6", "#5eead4", "#fbbf24", "#34d399", "#f472b6"]

  const container = document.createElement("div")
  container.style.cssText =
    "position:fixed;inset:0;pointer-events:none;z-index:10000;overflow:hidden"
  document.body.appendChild(container)

  const originX = window.innerWidth / 2
  const originY = options?.originY ?? window.innerHeight / 3

  for (let i = 0; i < count; i++) {
    const p = document.createElement("div")
    const size = 6 + Math.random() * 6
    p.style.cssText =
      `position:absolute;width:${size}px;height:${size * 0.4}px;` +
      `background:${colors[i % colors.length]};left:${originX}px;top:${originY}px;` +
      `border-radius:1px;will-change:transform,opacity`
    container.appendChild(p)

    const angle = Math.random() * Math.PI * 2
    const velocity = 120 + Math.random() * 240
    const dx = Math.cos(angle) * velocity
    const dy = Math.sin(angle) * velocity - (140 + Math.random() * 120) // bias upward first
    const rot = Math.random() * 720 - 360
    const dur = 900 + Math.random() * 1000

    p.animate(
      [
        { transform: "translate(0,0) rotate(0deg)", opacity: 1 },
        { transform: `translate(${dx}px, ${dy + 460}px) rotate(${rot}deg)`, opacity: 0 },
      ],
      { duration: dur, easing: "cubic-bezier(0.16,1,0.3,1)", fill: "forwards" }
    )
  }

  setTimeout(() => container.remove(), 2400)
}
