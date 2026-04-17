import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import { motion, useMotionValue, useTransform, useInView } from "framer-motion"
import Button from "@/components/ui/Button"
import { Sparkles, Brain, Code2, BarChart3, Users, Zap, Trophy, ArrowRight, CheckCircle2 } from "lucide-react"

/* ─── Data ──────────────────────────────────────────────────────────────────── */
const TYPING_TEXTS = [
  "AI that understands how you learn.",
  "Personalized. Adaptive. Intelligent.",
  "The smartest way to ace your exams.",
  "Code, compete & conquer your goals.",
]

const features = [
  {
    icon: Brain,
    title: "AI-Powered Assessments",
    description: "Generate unique, adaptive questions with Gemini AI — personalized to your topic, difficulty, and learning style.",
    gradient: "from-cyan-500 to-blue-600",
    glow: "rgba(34,211,238,0.3)",
    badge: "+40% retention",
  },
  {
    icon: Code2,
    title: "Real-time Code Execution",
    description: "Practice coding with our integrated IDE supporting 15+ languages. Instant feedback, real-time compilation.",
    gradient: "from-emerald-500 to-teal-600",
    glow: "rgba(52,211,153,0.3)",
    badge: "15+ Languages",
  },
  {
    icon: BarChart3,
    title: "Smart Analytics",
    description: "Deep insights into your performance trajectory. AI detects patterns humans can't see and suggests micro-improvements.",
    gradient: "from-violet-500 to-purple-600",
    glow: "rgba(139,92,246,0.3)",
    badge: "AI Insights",
  },
  {
    icon: Users,
    title: "Batch Management",
    description: "Teachers get a command center for managing batches, assigning AI-generated tests, and tracking every student's journey.",
    gradient: "from-orange-500 to-rose-500",
    glow: "rgba(249,115,22,0.3)",
    badge: "Live Tracking",
  },
  {
    icon: Zap,
    title: "ThinkTrace AI Interview",
    description: "An AI that probes your reasoning, not just your answers. Adaptive conversations that reveal true understanding.",
    gradient: "from-yellow-500 to-amber-600",
    glow: "rgba(234,179,8,0.3)",
    badge: "Adaptive AI",
  },
  {
    icon: Trophy,
    title: "Leaderboards & Ranks",
    description: "Compete with peers on dynamically updated leaderboards. Celebrate milestones and keep your competitive edge.",
    gradient: "from-pink-500 to-rose-600",
    glow: "rgba(236,72,153,0.3)",
    badge: "Live Rankings",
  },
]

const steps = [
  {
    num: "01",
    title: "Sign Up & Choose Your Role",
    desc: "Create your account as a Student, Teacher, or Admin. Get onboarded in under 60 seconds.",
    icon: "👤",
    color: "#38bdf8",
  },
  {
    num: "02",
    title: "Generate or Take AI Assessments",
    desc: "Teachers craft exams in seconds. Students attempt personalized tests with real-time AI feedback.",
    icon: "🧠",
    color: "#8b5cf6",
  },
  {
    num: "03",
    title: "Track, Compete & Grow",
    desc: "Monitor progress with rich analytics, compete on leaderboards, and unlock your full potential.",
    icon: "🚀",
    color: "#22d3ee",
  },
]

const aiTags = [
  { text: "+12% improvement detected", color: "#38bdf8" },
  { text: "AI adapting difficulty...", color: "#8b5cf6" },
  { text: "3 new insights ready", color: "#22d3ee" },
  { text: "89% accuracy predicted", color: "#34d399" },
]

/* ─── Typing Animation ──────────────────────────────────────────────────────── */
const TypingText: React.FC = () => {
  const [index, setIndex] = useState(0)
  const [displayed, setDisplayed] = useState("")
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const text = TYPING_TEXTS[index]
    if (!deleting && displayed.length < text.length) {
      const t = setTimeout(() => setDisplayed(text.slice(0, displayed.length + 1)), 45)
      return () => clearTimeout(t)
    }
    if (!deleting && displayed.length === text.length) {
      const t = setTimeout(() => setDeleting(true), 2200)
      return () => clearTimeout(t)
    }
    if (deleting && displayed.length > 0) {
      const t = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 22)
      return () => clearTimeout(t)
    }
    if (deleting && displayed.length === 0) {
      setDeleting(false)
      setIndex((i) => (i + 1) % TYPING_TEXTS.length)
    }
  }, [displayed, deleting, index])

  return (
    <span>
      <span style={{ color: "#38bdf8" }}>{displayed}</span>
      <span className="typing-cursor" style={{ background: "#38bdf8" }} />
    </span>
  )
}

/* ─── 3D Tilt Hero Card ─────────────────────────────────────────────────────── */
const HeroCard: React.FC = () => {
  const cardRef = useRef<HTMLDivElement>(null)
  const rotateX = useMotionValue(0)
  const rotateY = useMotionValue(0)
  const glowX = useTransform(rotateY, [-15, 15], ["0%", "100%"])
  const glowY = useTransform(rotateX, [-15, 15], ["0%", "100%"])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect()
    if (!rect) return
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    rotateX.set(((e.clientY - cy) / (rect.height / 2)) * -10)
    rotateY.set(((e.clientX - cx) / (rect.width / 2)) * 10)
  }

  const handleMouseLeave = () => {
    rotateX.set(0)
    rotateY.set(0)
  }

  return (
    <motion.div
      ref={cardRef}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d", perspective: "1000px" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="animate-float"
    >
      <div
        className="relative w-full max-w-sm rounded-3xl border p-6 overflow-hidden cursor-pointer"
        style={{
          background: "rgba(10,18,40,0.7)",
          backdropFilter: "blur(20px)",
          borderColor: "rgba(56,189,248,0.2)",
          boxShadow: "0 25px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(56,189,248,0.1)",
        }}
      >
        {/* Shimmer overlay */}
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-3xl opacity-30"
          style={{
            background: `radial-gradient(circle at ${glowX} ${glowY}, rgba(56,189,248,0.2), transparent 60%)`,
          }}
        />

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#38bdf8,#8b5cf6)" }}>
              <Brain className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-white text-xs font-bold">EduLearn AI</p>
              <p className="text-xs" style={{ color: "#38bdf8" }}>Session Active</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-emerald-400 font-semibold">LIVE</span>
          </div>
        </div>

        {/* Progress bars */}
        <div className="space-y-3 mb-5">
          {[
            { label: "Data Structures", val: 78, color: "#38bdf8" },
            { label: "Algorithms", val: 62, color: "#8b5cf6" },
            { label: "System Design", val: 45, color: "#22d3ee" },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex justify-between text-[11px] mb-1">
                <span style={{ color: "rgba(255,255,255,0.7)" }}>{item.label}</span>
                <span style={{ color: item.color }}>{item.val}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${item.val}%` }}
                  transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${item.color}, rgba(255,255,255,0.4))` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* AI Insight */}
        <div className="rounded-xl p-3 flex items-center gap-3"
          style={{ background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.15)" }}>
          <Sparkles className="h-4 w-4 shrink-0" style={{ color: "#38bdf8" }} />
          <p className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>
            AI detected you struggle with <strong style={{ color: "#38bdf8" }}>Graph traversal</strong>. 
            Personalizing next 3 questions.
          </p>
        </div>

        {/* Score badge */}
        <div className="absolute -top-3 -right-3 w-14 h-14 rounded-full flex flex-col items-center justify-center text-center"
          style={{
            background: "linear-gradient(135deg,#38bdf8,#8b5cf6)",
            boxShadow: "0 0 30px rgba(56,189,248,0.5)",
          }}>
          <span className="text-white font-black text-lg leading-none">92</span>
          <span className="text-white/70 text-[9px] font-semibold">SCORE</span>
        </div>
      </div>
    </motion.div>
  )
}

/* ─── Feature Card ──────────────────────────────────────────────────────────── */
const FeatureCard: React.FC<typeof features[0] & { index: number }> = ({
  icon: Icon, title, description, gradient, glow, badge, index
}) => {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: "-80px" })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      className="feature-card group relative rounded-2xl border p-6 overflow-hidden cursor-default"
      style={{
        background: "rgba(10,14,30,0.55)",
        backdropFilter: "blur(16px)",
        borderColor: "rgba(255,255,255,0.06)",
      }}
    >
      {/* Background glow on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none"
        style={{ background: `radial-gradient(circle at 30% 30%, ${glow}, transparent 70%)` }}
      />

      {/* Icon */}
      <motion.div
        whileHover={{ scale: 1.1, rotate: 5 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className={`relative z-10 w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4 shadow-lg`}
        style={{ boxShadow: `0 8px 24px ${glow}` }}
      >
        <Icon className="h-6 w-6 text-white" />
      </motion.div>

      {/* Badge */}
      <div className="relative z-10 mb-3">
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
          style={{
            background: `${glow.replace("0.3", "0.12")}`,
            border: `1px solid ${glow.replace("0.3", "0.35")}`,
            color: glow.includes("34,211") ? "#34d399" : glow.includes("139,92") ? "#a78bfa" : "#38bdf8",
          }}>
          <Sparkles className="h-2.5 w-2.5" />
          {badge}
        </span>
      </div>

      <h3 className="relative z-10 text-lg font-bold text-white mb-2">{title}</h3>
      <p className="relative z-10 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
        {description}
      </p>

      {/* Bottom arrow on hover */}
      <div className="relative z-10 mt-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-2 group-hover:translate-x-0">
        <span className="text-xs font-semibold" style={{ color: "#38bdf8" }}>Explore</span>
        <ArrowRight className="h-3 w-3" style={{ color: "#38bdf8" }} />
      </div>
    </motion.div>
  )
}

/* ─── Step Card ─────────────────────────────────────────────────────────────── */
const StepCard: React.FC<typeof steps[0] & { index: number }> = ({
  num, title, desc, icon, color, index
}) => {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: "-60px" })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay: index * 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="relative"
    >
      <div
        className="rounded-2xl border p-7 h-full"
        style={{
          background: "rgba(10,14,30,0.6)",
          backdropFilter: "blur(16px)",
          borderColor: `${color}25`,
          boxShadow: `0 8px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)`,
        }}
      >
        {/* Step number */}
        <div className="text-7xl font-black mb-4 leading-none"
          style={{
            WebkitTextFillColor: "transparent",
            WebkitTextStroke: `1px ${color}50`,
          }}>
          {num}
        </div>

        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">{icon}</span>
          <h3 className="text-lg font-bold text-white">{title}</h3>
        </div>

        <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
          {desc}
        </p>

        {/* Color accent line */}
        <div className="mt-5 h-0.5 w-16 rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
      </div>
    </motion.div>
  )
}

/* ─── Floating AI Tag ───────────────────────────────────────────────────────── */
const FloatingTag: React.FC<{ text: string; color: string; delay: number; className?: string }> = ({
  text, color, delay, className
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8, y: 20 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    transition={{ delay, duration: 0.6, ease: "backOut" }}
    className={`absolute hidden lg:flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold shadow-xl z-20 ${className}`}
    style={{
      background: "rgba(10,14,30,0.8)",
      backdropFilter: "blur(12px)",
      border: `1px solid ${color}35`,
      color,
    }}
  >
    <motion.div
      animate={{ scale: [1, 1.3, 1] }}
      transition={{ duration: 2, repeat: Infinity, delay }}
      className="h-1.5 w-1.5 rounded-full"
      style={{ background: color }}
    />
    {text}
  </motion.div>
)

/* ─── Neural Wave SVG ───────────────────────────────────────────────────────── */
const NeuralWave: React.FC = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
    <svg
      className="absolute bottom-0 left-0 w-full opacity-[0.04]"
      viewBox="0 0 1440 320"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      {[0, 20, 40, 60].map((phase, i) => (
        <motion.path
          key={i}
          d={`M0,${160 + phase} C360,${80 + i * 10} 720,${200 - i * 10} 1080,${120 + i * 5} L1440,${100 - phase} L1440,320 L0,320 Z`}
          fill="url(#waveGrad)"
          animate={{
            d: [
              `M0,${160 + phase} C360,${80 + i * 10} 720,${200 - i * 10} 1080,${120 + i * 5} L1440,${100 - phase} L1440,320 L0,320 Z`,
              `M0,${140 - phase} C360,${200 - i * 10} 720,${100 + i * 10} 1080,${160 - i * 5} L1440,${140 + phase} L1440,320 L0,320 Z`,
              `M0,${160 + phase} C360,${80 + i * 10} 720,${200 - i * 10} 1080,${120 + i * 5} L1440,${100 - phase} L1440,320 L0,320 Z`,
            ],
          }}
          transition={{ duration: 8 + i * 2, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </svg>
  </div>
)

/* ─── Main Component ────────────────────────────────────────────────────────── */
const LandingPage: React.FC = () => {
  const featuresRef = useRef(null)
  const howItWorksRef = useRef(null)

  return (
    <div className="relative overflow-hidden bg-[#020617]">
      {/* Grid overlay */}
      <div className="grid-overlay" />

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <NeuralWave />

        {/* Background hero glows */}
        <div className="hero-glow bg-blue-500/10 top-1/4 -left-1/4" />
        <div className="hero-glow bg-purple-500/10 top-1/3 -right-1/4" />

        {/* Floating AI Tags */}
        <FloatingTag text={aiTags[0].text} color={aiTags[0].color} delay={1.5} className="top-1/4 left-8" />
        <FloatingTag text={aiTags[1].text} color={aiTags[1].color} delay={2.0} className="top-1/3 right-4" />
        <FloatingTag text={aiTags[2].text} color={aiTags[2].color} delay={2.5} className="bottom-1/3 left-16" />
        <FloatingTag text={aiTags[3].text} color={aiTags[3].color} delay={3.0} className="bottom-1/4 right-16" />

        <div className="relative z-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center pt-24 pb-16">
          {/* Left — Text */}
          <div className="text-center lg:text-left">
            {/* AI Badge */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 ai-badge mb-6"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Powered by Gemini AI</span>
              <span className="h-1 w-1 rounded-full bg-current opacity-40" />
              <span>v2.0</span>
            </motion.div>

            {/* Main Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="text-5xl sm:text-6xl xl:text-7xl font-black leading-[1.05] mb-6 text-balance"
            >
              <span className="text-white">The Future of </span>
              <br />
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: "linear-gradient(135deg, #38bdf8 0%, #818cf8 50%, #a78bfa 100%)",
                  backgroundSize: "200% 200%",
                  animation: "gradient-shift 4s ease infinite",
                }}
              >
                Intelligent Learning
              </span>
            </motion.h1>

            {/* Typing Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="text-xl sm:text-2xl mb-4 font-medium min-h-[2rem]"
              style={{ color: "rgba(255,255,255,0.65)" }}
            >
              <TypingText />
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="text-base sm:text-lg mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              Generate unique AI assessments, practice coding, track your progress with intelligent analytics,
              and compete with peers on live leaderboards.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center"
            >
              <Link to="/signup">
                <Button variant="glow" size="lg" className="min-w-[200px] text-base">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Start Learning Free
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="ghost-glow" size="lg" className="min-w-[160px] text-base">
                  Sign In
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </motion.div>

            {/* Trust indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="flex items-center gap-6 mt-8 justify-center lg:justify-start"
            >
              {[
                { icon: "✓", text: "No credit card" },
                { icon: "✓", text: "Free forever" },
                { icon: "✓", text: "Start in 60s" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-1.5 text-sm"
                  style={{ color: "rgba(255,255,255,0.4)" }}>
                  <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "#34d399" }} />
                  {item.text}
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right — 3D Card */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex justify-center lg:justify-end"
          >
            <HeroCard />
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Scroll to explore</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-5 h-8 rounded-full border flex items-start justify-center pt-1.5"
            style={{ borderColor: "rgba(255,255,255,0.2)" }}
          >
            <div className="w-1 h-2 rounded-full" style={{ background: "#38bdf8" }} />
          </motion.div>
        </motion.div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────────── */}
      <section ref={featuresRef} className="relative py-28 px-4 sm:px-6 lg:px-8">
        {/* Section glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="hero-glow bg-violet-500/5 top-0 left-1/4" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 ai-badge mb-4"
            >
              <Zap className="h-3 w-3" />
              Core Features
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl font-black text-white mb-4"
            >
              Everything you need to{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(135deg, #38bdf8, #8b5cf6)" }}
              >
                excel
              </span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg max-w-3xl mx-auto"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              A full-stack AI learning platform built for the next generation of students and educators.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <FeatureCard key={feature.title} {...feature} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────────── */}
      <section ref={howItWorksRef} className="relative py-28 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 pointer-events-none">
          <div className="hero-glow bg-cyan-500/5 top-1/2 right-0" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 ai-badge mb-4"
            >
              <Brain className="h-3 w-3" />
              How It Works
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-4xl sm:text-5xl font-black text-white mb-4"
            >
              Three steps to{" "}
              <span className="bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(135deg, #22d3ee, #8b5cf6)" }}>
                transform
              </span>{" "}
              your learning
            </motion.h2>
          </div>

          {/* Animated connector line */}
          <div className="relative">
            <div className="hidden lg:block absolute top-16 left-[calc(16%+2rem)] right-[calc(16%+2rem)] h-px z-0">
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
                className="h-full origin-left"
                style={{ background: "linear-gradient(90deg, #38bdf8, #8b5cf6, #22d3ee)" }}
              />
              {/* Connector dots */}
              <div className="absolute -top-1.5 left-0 h-3 w-3 rounded-full bg-[#38bdf8]" />
              <div className="absolute -top-1.5 right-0 h-3 w-3 rounded-full bg-[#22d3ee]" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
              {steps.map((step, index) => (
                <StepCard key={step.num} {...step} index={index} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section className="relative py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative rounded-3xl border p-16 text-center overflow-hidden"
            style={{
              background: "rgba(10,14,30,0.7)",
              backdropFilter: "blur(20px)",
              borderColor: "rgba(56,189,248,0.15)",
              boxShadow: "0 0 80px rgba(56,189,248,0.08), 0 40px 80px rgba(0,0,0,0.4)",
            }}
          >
            {/* Background shimmer */}
            <div className="absolute inset-0 pointer-events-none rounded-3xl overflow-hidden">
              <div className="absolute -top-1/2 -left-1/2 w-full h-full rounded-full animate-spin-slow opacity-10"
                style={{ background: "conic-gradient(from 0deg, #38bdf8, #8b5cf6, #22d3ee, transparent)" }} />
            </div>

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 ai-badge mb-6">
                <Sparkles className="h-3.5 w-3.5" />
                Join 10,000+ learners
              </div>

              <h2 className="text-4xl sm:text-5xl font-black text-white mb-6">
                Ready to Transform Your{" "}
                <span className="bg-clip-text text-transparent"
                  style={{ backgroundImage: "linear-gradient(135deg, #38bdf8, #8b5cf6)" }}>
                  Learning?
                </span>
              </h2>

              <p className="text-lg mb-10 max-w-2xl mx-auto" style={{ color: "rgba(255,255,255,0.5)" }}>
                Join thousands of students and teachers already experiencing the future of education.
                Start your journey today and unlock your full potential.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link to="/signup">
                  <Button variant="glow" size="lg" className="min-w-[200px] text-base">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Get Started Free
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="ghost-glow" size="lg" className="min-w-[160px] text-base">
                    Sign In
                  </Button>
                </Link>
              </div>

              <p className="mt-8 text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
                No credit card required • Free forever • Start in 60 seconds
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <footer className="border-t py-8 px-8 text-center"
        style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.25)" }}>
          © 2026 EduLearn. Built with ❤️ and Gemini AI.
        </p>
      </footer>
    </div>
  )
}

export default LandingPage
