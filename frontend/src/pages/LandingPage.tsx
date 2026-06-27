import React, { useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { TextPlugin } from "gsap/TextPlugin"
import Button from "@/components/ui/Button"
import { Sparkles, Brain, Code2, BarChart3, Users, Zap, Trophy, ArrowRight, CheckCircle2 } from "lucide-react"

gsap.registerPlugin(ScrollTrigger, TextPlugin)

/* ─── Data ──────────────────────────────────────────────────────────────────── */
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

const LandingPage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const horizontalSectionRef = useRef<HTMLDivElement>(null)
  const horizontalWrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let ctx = gsap.context(() => {
      
      // 1. Hero Entrance Animations
      const tl = gsap.timeline({ defaults: { ease: "power4.out" } })
      
      // Split text animation for Hero Title
      tl.fromTo(".hero-title-line", 
        { y: 100, opacity: 0, rotateZ: 5 },
        { y: 0, opacity: 1, rotateZ: 0, duration: 1.2, stagger: 0.15 }
      )
      .fromTo(".hero-subtitle",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 1 }, "-=0.8"
      )
      .fromTo(".hero-btn",
        { opacity: 0, scale: 0.8 },
        { opacity: 1, scale: 1, duration: 0.8, stagger: 0.1, ease: "back.out(1.5)" }, "-=0.6"
      )
      .fromTo(".hero-floating-card",
        { opacity: 0, x: 100, rotationY: 20 },
        { opacity: 1, x: 0, rotationY: 0, duration: 1.5, ease: "power3.out" }, "-=1.2"
      )

      // Typewriter Effect
      gsap.to(".gsap-typewriter", {
        text: "Generate unique AI assessments, practice coding, track your progress with intelligent analytics, and compete with peers on live leaderboards.",
        duration: 3,
        ease: "none",
        delay: 0.5
      })

      // 2. Magnetic Buttons Effect
      const magnetics = document.querySelectorAll('.magnetic-btn')
      magnetics.forEach((btn: any) => {
        btn.addEventListener("mousemove", (e: MouseEvent) => {
          const rect = btn.getBoundingClientRect()
          const x = (e.clientX - rect.left - rect.width / 2) * 0.3
          const y = (e.clientY - rect.top - rect.height / 2) * 0.3
          gsap.to(btn, { x, y, duration: 0.3, ease: "power2.out" })
        })
        btn.addEventListener("mouseleave", () => {
          gsap.to(btn, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.3)" })
        })
      })

      // 3. Floating Card 3D Tilt Effect
      const card = document.querySelector(".hero-floating-card")
      if (card) {
        card.addEventListener("mousemove", (e: any) => {
          const rect = card.getBoundingClientRect()
          const x = e.clientX - rect.left
          const y = e.clientY - rect.top
          const centerX = rect.width / 2
          const centerY = rect.height / 2
          const rotateX = ((y - centerY) / centerY) * -15
          const rotateY = ((x - centerX) / centerX) * 15

          gsap.to(card, {
            rotationX,
            rotationY,
            transformPerspective: 1000,
            duration: 0.4,
            ease: "power2.out"
          })
        })
        card.addEventListener("mouseleave", () => {
          gsap.to(card, { rotationX: 0, rotationY: 0, duration: 1, ease: "elastic.out(1, 0.3)" })
        })
      }

      // 4. Pinned Horizontal Scroll Section
      const horizontalCards = gsap.utils.toArray('.horizontal-card')
      if (horizontalSectionRef.current && horizontalWrapperRef.current && horizontalCards.length > 0) {
        gsap.to(horizontalCards, {
          xPercent: -100 * (horizontalCards.length - 1),
          ease: "none",
          scrollTrigger: {
            trigger: horizontalSectionRef.current,
            pin: true,
            scrub: 1,
            // The distance the user must scroll to finish the horizontal movement
            end: () => "+=" + horizontalWrapperRef.current?.offsetWidth
          }
        })
      }

      // 5. How It Works Step Reveals
      const steps = gsap.utils.toArray('.step-card')
      steps.forEach((step: any, i) => {
        gsap.fromTo(step, 
          { opacity: 0, y: 100, scale: 0.8 },
          { 
            opacity: 1, y: 0, scale: 1, duration: 0.8, ease: "back.out(1.2)",
            scrollTrigger: {
              trigger: step,
              start: "top 85%",
              toggleActions: "play none none reverse"
            }
          }
        )
      })

      // Timeline line drawing
      gsap.fromTo(".timeline-line",
        { scaleY: 0 },
        { 
          scaleY: 1, 
          ease: "none",
          scrollTrigger: {
            trigger: ".steps-container",
            start: "top 50%",
            end: "bottom 80%",
            scrub: true
          }
        }
      )

      // 6. CTA Section Boxed Scale Effect
      gsap.fromTo(".cta-box",
        { scale: 0.8, opacity: 0, rotationX: -10 },
        { 
          scale: 1, opacity: 1, rotationX: 0, duration: 1.2, ease: "power3.out",
          scrollTrigger: {
            trigger: ".cta-section",
            start: "top 80%"
          }
        }
      )

    }, containerRef)

    return () => ctx.revert()
  }, [])

  return (
    <div ref={containerRef} className="relative bg-[#020617] text-white overflow-hidden min-h-screen font-sans selection:bg-cyan-500/30">
      
      {/* Background Noise / Grid Overlay */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.2) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

      {/* ── HERO SECTION ──────────────────────────────────────────────────────── */}
      <section className="relative z-10 min-h-screen flex items-center justify-center pt-24 pb-16 px-6 lg:px-12">
        {/* Glows */}
        <div className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 -right-1/4 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Text */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-xs font-bold mb-8 hero-title-line">
              <Sparkles className="w-4 h-4" />
              <span>Powered by Gemini AI v2.0</span>
            </div>

            <h1 className="text-6xl sm:text-7xl xl:text-8xl font-black leading-[1.1] mb-6 overflow-hidden">
              <div className="hero-title-line">The Future of</div>
              <div className="hero-title-line bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400">
                Intelligent Learning
              </div>
            </h1>

            <p className="hero-subtitle text-lg sm:text-xl text-slate-400 mb-10 max-w-xl leading-relaxed h-[80px]">
              <span className="gsap-typewriter"></span>
              <span className="inline-block w-1 h-5 bg-cyan-400 animate-pulse align-middle ml-1"></span>
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/signup" className="hero-btn magnetic-btn">
                <Button variant="glow" size="lg" className="w-full sm:w-auto h-14 px-8 text-base shadow-[0_0_40px_rgba(34,211,238,0.3)] hover:shadow-[0_0_60px_rgba(34,211,238,0.5)] transition-all">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Start Learning Free
                </Button>
              </Link>
              <Link to="/login" className="hero-btn magnetic-btn">
                <Button variant="outline" size="lg" className="w-full sm:w-auto h-14 px-8 text-base border-slate-700 hover:bg-slate-800 hover:text-white">
                  Sign In
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Right 3D Card */}
          <div className="hidden lg:flex justify-end hero-floating-card perspective-[1000px]">
            <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/50 backdrop-blur-xl p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5),_0_0_0_1px_rgba(56,189,248,0.1)]">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center">
                    <Brain className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">EduLearn AI</h3>
                    <p className="text-xs text-cyan-400">Session Active</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-400 tracking-wider">LIVE</span>
                </div>
              </div>

              <div className="space-y-5 mb-8">
                {[
                  { label: "Data Structures", val: "78%", color: "bg-cyan-400" },
                  { label: "Algorithms", val: "62%", color: "bg-purple-400" },
                  { label: "System Design", val: "45%", color: "bg-indigo-400" },
                ].map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs text-slate-400 mb-2">
                      <span>{item.label}</span>
                      <span className="text-white font-bold">{item.val}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className={`h-full rounded-full ${item.color}`} style={{ width: item.val }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-4 flex gap-3">
                <Zap className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-300 leading-relaxed">
                  AI detected you struggle with <strong className="text-cyan-400">Graph traversal</strong>. Personalizing next 3 questions to help you master it.
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── PINNED HORIZONTAL FEATURES SECTION ──────────────────────────────── */}
      <section ref={horizontalSectionRef} className="relative h-screen bg-[#060b24] border-t border-slate-800 overflow-hidden">
        
        <div className="absolute top-12 left-12 z-20">
          <h2 className="text-4xl font-black text-white">
            Core <span className="text-cyan-400">Features</span>
          </h2>
          <p className="text-slate-400 mt-2">Scroll down to explore</p>
        </div>

        <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full h-full flex items-center">
          <div ref={horizontalWrapperRef} className="flex gap-8 px-[10vw]">
            {features.map((feature, i) => (
              <div key={i} className="horizontal-card w-[80vw] sm:w-[400px] h-[500px] shrink-0 rounded-3xl border border-slate-800 bg-slate-900/60 backdrop-blur-lg p-10 flex flex-col justify-between group hover:border-slate-600 transition-colors">
                <div>
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-8 shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 mb-4 border border-slate-700">
                    {feature.badge}
                  </span>
                  <h3 className="text-3xl font-bold text-white mb-4">{feature.title}</h3>
                  <p className="text-slate-400 leading-relaxed text-lg">{feature.description}</p>
                </div>
                <div className="flex items-center gap-2 text-cyan-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-4 group-hover:translate-y-0 duration-300">
                  Explore <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS (VERTICAL SCROLL TIMELINE) ─────────────────────────── */}
      <section className="relative py-32 px-6 lg:px-12 bg-[#020617]">
        <div className="max-w-4xl mx-auto text-center mb-24">
          <h2 className="text-5xl font-black text-white mb-6">How it <span className="text-purple-400">Works</span></h2>
          <p className="text-xl text-slate-400">Three simple steps to transform your learning journey.</p>
        </div>

        <div className="steps-container max-w-5xl mx-auto relative pl-12 sm:pl-0">
          
          {/* Timeline Line */}
          <div className="absolute left-12 sm:left-1/2 top-0 bottom-0 w-1 bg-slate-800 transform sm:-translate-x-1/2">
            <div className="timeline-line w-full h-full bg-gradient-to-b from-cyan-400 via-purple-500 to-indigo-500 origin-top" />
          </div>

          <div className="space-y-24">
            {steps.map((step, i) => (
              <div key={i} className={`step-card relative flex flex-col sm:flex-row items-center gap-8 sm:gap-16 ${i % 2 === 0 ? 'sm:flex-row-reverse' : ''}`}>
                
                {/* Node */}
                <div className="absolute left-[-16px] sm:left-1/2 top-1/2 w-8 h-8 rounded-full border-4 border-[#020617] bg-cyan-400 transform sm:-translate-x-1/2 -translate-y-1/2 z-10 shadow-[0_0_20px_rgba(34,211,238,0.5)]" />
                
                {/* Content */}
                <div className={`w-full sm:w-1/2 ${i % 2 === 0 ? 'sm:text-left' : 'sm:text-right'}`}>
                  <div className="text-7xl font-black text-slate-800 mb-4 opacity-50">{step.num}</div>
                  <h3 className="text-3xl font-bold text-white mb-4">{step.title}</h3>
                  <p className="text-lg text-slate-400">{step.desc}</p>
                </div>
                
                {/* Empty space for alternating layout */}
                <div className="hidden sm:block w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BOX ZOOM SECTION ────────────────────────────────────────────── */}
      <section className="cta-section relative py-32 px-6 lg:px-12 bg-[#060b24]">
        <div className="max-w-5xl mx-auto">
          <div className="cta-box rounded-[3rem] border border-slate-800 bg-slate-900/50 backdrop-blur-3xl p-12 sm:p-20 text-center relative overflow-hidden shadow-2xl">
            
            {/* CTA Background Effects */}
            <div className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-[conic-gradient(from_0deg,transparent,rgba(56,189,248,0.1),rgba(139,92,246,0.1),transparent)] animate-spin-slow pointer-events-none" />
            
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-400 text-sm font-bold mb-8">
                <Users className="w-4 h-4" />
                <span>Join 10,000+ learners globally</span>
              </div>
              
              <h2 className="text-5xl sm:text-6xl font-black text-white mb-8 leading-tight">
                Ready to elevate your <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">potential?</span>
              </h2>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/signup" className="magnetic-btn">
                  <Button variant="glow" size="lg" className="w-full sm:w-auto h-14 px-10 text-lg rounded-2xl">
                    Get Started Free
                  </Button>
                </Link>
                <Link to="/login" className="magnetic-btn">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto h-14 px-10 text-lg rounded-2xl border-slate-700 bg-slate-900/50 hover:bg-slate-800">
                    Sign In
                  </Button>
                </Link>
              </div>
              <p className="mt-8 text-sm text-slate-500">No credit card required. Free forever.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800/50 py-12 px-6 lg:px-12 text-center bg-[#020617]">
        <p className="text-slate-500">© 2026 EduLearn. Built with GSAP & Gemini AI.</p>
      </footer>

    </div>
  )
}

export default LandingPage
