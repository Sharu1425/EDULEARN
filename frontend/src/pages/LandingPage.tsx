
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles as SparklesIcon, Brain, Code2, LineChart, Users, ChevronRight, Shield, Rocket, ArrowRight } from "lucide-react"
import { Canvas } from "@react-three/fiber"
import { Stars } from "@react-three/drei"

/* ─── Shared Glow & Noise Effects ────────────────────────── */
const NoiseBackground = () => (
  <div
    className="fixed inset-0 z-10 opacity-[0.03] pointer-events-none"
    style={{ backgroundImage: "url('https://grainy-gradients.vercel.app/noise.svg')" }}
  />
);

/* ─── Animated Hero Text ────────────────────────────────── */
const TYPING_TEXTS = [
  "Master your exams with AI.",
  "Learn to code interactively.",
  "Track your real progress.",
  "Shape your future.",
]

const TypingSubtitle = () => {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % TYPING_TEXTS.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="h-8 overflow-hidden relative flex justify-center w-full">
      <AnimatePresence mode="wait">
        <motion.p
          key={index}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-xl sm:text-2xl font-medium text-emerald-400 absolute"
        >
          {TYPING_TEXTS[index]}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}

/* ─── Premium Feature Card ──────────────────────────────── */
const FeatureCard = ({ icon: Icon, title, desc, delay }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-50px" }}
    transition={{ duration: 0.7, delay }}
    className="group relative p-[1px] rounded-3xl overflow-hidden cursor-default"
  >
    {/* Animated glowing border */}
    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/50 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-spin-slow" />
    <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-white/0 opacity-100" />

    <div className="relative h-full bg-[#09090b]/80 backdrop-blur-xl rounded-3xl p-8 z-10 flex flex-col items-start overflow-hidden">
      {/* Glow on hover */}
      <div className="absolute -inset-x-12 -top-12 h-32 w-32 bg-emerald-500/20 blur-[50px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center border border-emerald-500/30 mb-6 group-hover:scale-110 transition-transform duration-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
        <Icon className="h-6 w-6 text-emerald-400" />
      </div>

      <h3 className="text-xl font-bold text-white mb-3 group-hover:text-emerald-400 transition-colors duration-300">
        {title}
      </h3>
      <p className="text-white/60 leading-relaxed text-sm">
        {desc}
      </p>
    </div>
  </motion.div>
)

/* ─── Main Landing Page Component ────────────────────────── */
const LandingPage = () => {
  return (
    <div className="min-h-screen bg-[#050505] selection:bg-emerald-500/30 text-white overflow-x-hidden font-sans relative">
      <NoiseBackground />

      {/* ── Fixed 3D Background (non-interactive star field) ── */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Canvas camera={{ position: [0, 0, 8], fov: 45 }} dpr={[1, 1.5]} frameloop="always">
          <ambientLight intensity={0.5} />
          <Stars radius={100} depth={50} count={3500} factor={4} saturation={0} fade speed={0.8} />
        </Canvas>
        {/* Soft brand glow accents behind content */}
        <div className="absolute top-[-10%] left-[-5%] h-[40rem] w-[40rem] rounded-full bg-emerald-500/10 blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-5%] h-[36rem] w-[36rem] rounded-full bg-teal-500/10 blur-[140px]" />
      </div>

      {/* ── Navbar ───────────────────────────────────────── */}
      <nav className="fixed top-0 w-full z-50 px-6 py-4 pointer-events-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between p-2 rounded-2xl bg-[#09090b]/40 backdrop-blur-xl border border-white/5 shadow-2xl pointer-events-auto">
          <div className="flex items-center gap-2 px-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)]">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">EduLearn</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/70">
            <a href="#highlights" className="hover:text-emerald-400 transition-colors">Highlights</a>
            <a href="#features" className="hover:text-emerald-400 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-emerald-400 transition-colors">How it Works</a>
          </div>

          <div className="flex items-center gap-3 pr-2">
            <Link to="/login" className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link to="/signup" className="group relative px-5 py-2 text-sm font-semibold text-black bg-white rounded-xl overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)]">
              <span className="relative z-10 flex items-center gap-1">
                Get Started <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero Section (Centered) ──────────────────────── */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 flex items-center justify-center min-h-[95vh] z-20 pointer-events-none">

        <div className="max-w-4xl mx-auto px-6 w-full flex flex-col items-center justify-center text-center pointer-events-auto">

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-emerald-400 mb-8 backdrop-blur-md shadow-lg"
          >
            <SparklesIcon className="w-3.5 h-3.5" />
            <span>The Next Generation of Education</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tighter leading-[1.05] mb-6 drop-shadow-2xl"
          >
            Learn faster.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 animate-gradient-x">
              Code smarter.
            </span>
          </motion.h1>

          <TypingSubtitle />

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-lg text-white/70 mb-10 max-w-2xl mt-6 leading-relaxed backdrop-blur-md p-4 rounded-2xl bg-black/20 border border-white/5 shadow-2xl"
          >
            A unified, intelligent platform combining interactive AI assessments, real-time code execution, and deeply personalized learning analytics.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center"
          >
            <Link to="/signup" className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-bold text-lg transition-all hover:scale-105 shadow-[0_0_40px_rgba(16,185,129,0.3)] hover:shadow-[0_0_60px_rgba(16,185,129,0.5)]">
              Start for free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a href="#features" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-semibold text-lg transition-colors border border-white/10 backdrop-blur-xl">
              Explore platform
            </a>
          </motion.div>

        </div>

        {/* Scroll cue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/40 pointer-events-none"
        >
          <span className="text-[10px] uppercase tracking-[0.3em]">Scroll</span>
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
            <ChevronRight className="w-5 h-5 rotate-90" />
          </motion.div>
        </motion.div>
      </section>

      {/* ── Highlights Band ──────────────────────────────── */}
      <section id="highlights" className="py-14 border-y border-white/5 bg-black/40 backdrop-blur-sm relative z-20">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { stat: "15+", label: "Languages supported" },
            { stat: "Gemini", label: "AI-powered engine" },
            { stat: "Real-time", label: "Code execution" },
            { stat: "Adaptive", label: "Mastery paths" },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <div className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 drop-shadow">
                {item.stat}
              </div>
              <div className="mt-2 text-sm text-white/50 font-medium">{item.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Features Grid ────────────────────────────────── */}
      <section id="features" className="py-32 relative z-20 bg-gradient-to-b from-transparent via-[#050505]/80 to-[#050505]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-24">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-6xl font-black mb-6 drop-shadow-lg"
            >
              Built for Excellence.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-lg text-white/60 max-w-2xl mx-auto"
            >
              Everything you need to run, evaluate, and scale educational experiences. Powered by cutting-edge technology.
            </motion.p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={Brain}
              title="AI Assessments"
              desc="Generate unique, adaptive questions with Gemini AI. Tailored perfectly to individual student learning styles."
              delay={0}
            />
            <FeatureCard
              icon={Code2}
              title="Live Code Editor"
              desc="15+ programming languages supported out of the box with real-time compilation and intelligent error suggestions."
              delay={0.1}
            />
            <FeatureCard
              icon={LineChart}
              title="Smart Analytics"
              desc="Uncover deep insights into performance trajectories. Our AI detects invisible patterns to suggest micro-improvements."
              delay={0.2}
            />
            <FeatureCard
              icon={Users}
              title="Batch Management"
              desc="A command center for educators. Assign tests, track progress, and manage thousands of students effortlessly."
              delay={0.3}
            />
            <FeatureCard
              icon={Shield}
              title="Proctoring Ready"
              desc="Secure testing environments with tab-tracking, copy-paste prevention, and AI-driven behavioral analysis."
              delay={0.4}
            />
            <FeatureCard
              icon={Rocket}
              title="Scalable Infrastructure"
              desc="Built on modern cloud architecture to handle thousands of concurrent test-takers without breaking a sweat."
              delay={0.5}
            />
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────── */}
      <section id="how-it-works" className="py-32 relative z-20 bg-[#050505]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-6xl font-black mb-6 drop-shadow-lg"
            >
              From sign-up to{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">mastery</span>.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-lg text-white/60"
            >
              Three steps to a smarter way of learning.
            </motion.p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { n: "01", icon: SparklesIcon, title: "Create your account", desc: "Sign up free in seconds and tell us what you want to learn." },
              { n: "02", icon: Brain, title: "Practice & assess", desc: "Take AI-generated MCQs, solve coding challenges, and sit adaptive ThinkTrace interviews." },
              { n: "03", icon: LineChart, title: "Track & master", desc: "Personalized analytics and topic-mastery paths guide every next step." },
            ].map((step, i) => (
              <motion.div
                key={step.n}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: i * 0.12 }}
                className="group relative rounded-3xl border border-white/10 bg-[#09090b]/80 backdrop-blur-xl p-8 overflow-hidden"
              >
                <div className="absolute -inset-x-12 -top-12 h-32 w-32 bg-emerald-500/20 blur-[50px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                <div className="flex items-center justify-between mb-6">
                  <span className="text-5xl font-black text-white/10">{step.n}</span>
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center border border-emerald-500/30 group-hover:scale-110 transition-transform duration-500">
                    <step.icon className="h-6 w-6 text-emerald-400" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-emerald-400 transition-colors duration-300">{step.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Immersive CTA ────────────────────────────────── */}
      <section className="py-40 relative overflow-hidden z-20 bg-[#050505]">
        <div className="absolute inset-0 bg-emerald-900/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/20 blur-[150px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 relative z-10 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-5xl md:text-7xl font-black mb-8 leading-tight drop-shadow-2xl"
          >
            Ready to upgrade your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">
              learning stack?
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-emerald-100/70 mb-12 max-w-2xl mx-auto"
          >
            Join the educators and students who are already experiencing the next generation of digital learning.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <Link to="/signup" className="group relative inline-flex items-center justify-center gap-3 px-10 py-5 bg-white text-black rounded-3xl font-bold text-xl transition-all hover:scale-105 hover:shadow-[0_0_80px_rgba(255,255,255,0.4)]">
              Get Started for Free
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </section>


    </div>
  )
}

export default LandingPage
