"use client"

import type React from "react"
import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import type { User } from "../types"
import Card from "../components/ui/Card"
import Button from "../components/ui/Button"
import { ANIMATION_VARIANTS } from "../utils/constants"
import { CheckCircle2, BrainCircuit, Code2, ArrowLeft, Sparkles } from "lucide-react"

interface AssessmentChoiceProps {
  user: User
}

interface ChoiceOption {
  Icon: typeof BrainCircuit
  accent: string
  title: string
  description: string
  features: string[]
  stats: { value: string; label: string }[]
  to: string
  cta: string
  variant: "slideLeft" | "slideRight"
}

const OPTIONS: ChoiceOption[] = [
  {
    Icon: BrainCircuit,
    accent: "primary",
    title: "MCQ Assessment",
    description:
      "Test your theoretical knowledge with AI-powered adaptive multiple-choice questions that adjust to your skill level across topics.",
    features: [
      "AI-powered adaptive questions",
      "Multiple topics & difficulty levels",
      "Instant results & explanations",
    ],
    stats: [
      { value: "15-30", label: "Minutes" },
      { value: "5-25", label: "Questions" },
    ],
    to: "/assessconfig",
    cta: "Start MCQ Assessment",
    variant: "slideLeft",
  },
  {
    Icon: Code2,
    accent: "secondary",
    title: "Coding Challenge",
    description:
      "Practice your programming skills with AI-generated problems. Write code, test solutions, and get detailed AI feedback on your implementation.",
    features: [
      "AI-generated original problems",
      "Multi-language support",
      "Real-time code execution",
      "Detailed AI code review",
    ],
    stats: [
      { value: "30-90", label: "Minutes" },
      { value: "1-3", label: "Problems" },
    ],
    to: "/coding",
    cta: "Start Coding Challenge",
    variant: "slideRight",
  },
]

const AssessmentChoice: React.FC<AssessmentChoiceProps> = () => {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      {/* Hero */}
      <motion.div variants={ANIMATION_VARIANTS.slideUp} initial="initial" animate="animate">
        <Card appearance="glass" hover={false} className="relative overflow-hidden p-7 text-center sm:p-9">
          <div className="aurora-mesh" />
          <div className="relative z-10">
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Practice
            </span>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Choose Your Assessment Type
            </h1>
            <p className="mt-2 text-muted-foreground">Select the type of assessment you'd like to take today</p>
          </div>
        </Card>
      </motion.div>

      {/* Options */}
      <motion.div
        variants={ANIMATION_VARIANTS.stagger}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 gap-6 md:grid-cols-2"
      >
        {OPTIONS.map((opt) => (
          <motion.div key={opt.title} variants={ANIMATION_VARIANTS[opt.variant]}>
            <Card className="group flex h-full flex-col p-7 text-center">
              <span
                className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110"
                style={{ background: `hsl(var(--${opt.accent}) / 0.12)`, color: `hsl(var(--${opt.accent}))` }}
              >
                <opt.Icon className="h-8 w-8" />
              </span>

              <h3 className="mb-3 font-heading text-2xl font-bold text-foreground">{opt.title}</h3>
              <p className="mb-6 leading-relaxed text-muted-foreground">{opt.description}</p>

              <div className="mb-8 space-y-3 text-left">
                {opt.features.map((f) => (
                  <div key={f} className="flex items-center gap-3 text-sm text-foreground/80">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              <div className="mb-6 mt-auto grid grid-cols-2 gap-4 rounded-xl border border-border bg-muted/30 p-4">
                {opt.stats.map((s) => (
                  <div key={s.label}>
                    <div className="font-heading text-lg font-bold text-foreground">{s.value}</div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                  </div>
                ))}
              </div>

              <Link to={opt.to}>
                <Button variant="primary" className="w-full">{opt.cta}</Button>
              </Link>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Back */}
      <motion.div variants={ANIMATION_VARIANTS.slideUp} initial="initial" animate="animate" className="text-center">
        <Link to="/dashboard">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Button>
        </Link>
      </motion.div>
    </div>
  )
}

export default AssessmentChoice
