import React, { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { Check, Loader2, Award, ShieldAlert, Clock, X } from "lucide-react"
import api from "../../utils/api"
import { useToast } from "../../contexts/ToastContext"
import { cn } from "../../lib/utils"
import Overlay from "../ui/Overlay"
import Button from "../ui/Button"
import Badge from "../ui/Badge"

interface FinalExamModalProps {
    isOpen: boolean
    onClose: () => void
    roadmapId: string
    onComplete: () => void
}

type Step = "generating" | "exam" | "result"

interface Question {
    q_id: string
    type: "mcq" | "sata" | "fib" | "scenario" | "coding"
    question?: string
    options?: string[]
    correct_answer?: string | number
    correct_answers?: string[]
    sentence_with_blank?: string
    correct_word?: string
    near_miss_options?: string[]
    scenario?: string
    explanation?: string
    cross_topic?: boolean
}

const FinalExamModal: React.FC<FinalExamModalProps> = ({ isOpen, onClose, roadmapId, onComplete }) => {
    const { addToast } = useToast()

    const [step, setStep] = useState<Step>("generating")
    const [examData, setExamData] = useState<any>(null)
    const [questions, setQuestions] = useState<Question[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [answers, setAnswers] = useState<Record<number, any>>({})
    const [score, setScore] = useState({ correct: 0, total: 18 })
    const [timeLeft, setTimeLeft] = useState<number>(45 * 60)
    const timerRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        if (isOpen) {
            setStep("generating")
            setExamData(null)
            setQuestions([])
            setCurrentIndex(0)
            setAnswers({})
            setTimeLeft(45 * 60)
            generateExam()
        }
        return () => clearInterval(timerRef.current!)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen])

    useEffect(() => {
        if (step === "exam") {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current!)
                        finishExam()
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
        }
        return () => clearInterval(timerRef.current!)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step])

    const generateExam = async () => {
        try {
            const res = await api.post("/api/mastery/final-exam", { roadmap_id: roadmapId })
            setExamData(res.data)
            const qs = res.data.questions.map((q: any) => {
                if (q.type === "fib" && q.near_miss_options && q.correct_word) {
                    const opts = [...q.near_miss_options, q.correct_word].sort(() => Math.random() - 0.5)
                    return { ...q, options: opts }
                }
                return q
            })
            setQuestions(qs)
            if (res.data.time_limit_minutes) setTimeLeft(res.data.time_limit_minutes * 60)
            setStep("exam")
        } catch (error: any) {
            console.error(error)
            addToast({ title: error.response?.data?.detail || "Failed to generate Final Exam", type: "error" })
            onClose()
        }
    }

    const finishExam = async () => {
        setStep("result")
        clearInterval(timerRef.current!)
        let correctCount = 0
        questions.forEach((q, i) => {
            const ans = answers[i]
            if (q.type === "mcq" || q.type === "scenario" || q.type === "fib") {
                if (ans === q.correct_answer || ans === q.correct_word) correctCount++
            } else if (q.type === "sata") {
                const correctArr = q.correct_answers || []
                const ansArr = ans || []
                if (ansArr.length === correctArr.length && ansArr.every((a: string) => correctArr.includes(a))) correctCount++
            }
        })
        setScore({ correct: correctCount, total: questions.length })
        const passed = correctCount >= (examData?.pass_mark || 15)
        if (passed) addToast({ title: "Mastery Certified! You passed the Final Exam.", type: "success" })
        else addToast({ title: "Final Exam failed. Keep studying!", type: "warning" })
    }

    const toggleSataAnswer = (opt: string) => {
        const cur = answers[currentIndex] || []
        const next = cur.includes(opt) ? cur.filter((o: string) => o !== opt) : [...cur, opt]
        setAnswers({ ...answers, [currentIndex]: next })
    }
    const setSingleAnswer = (opt: string | number) => setAnswers({ ...answers, [currentIndex]: opt })

    const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`

    const renderExamStep = () => {
        if (questions.length === 0) return null
        const q = questions[currentIndex]
        const pct = (currentIndex / questions.length) * 100

        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-full flex-col overflow-hidden">
                <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/30 px-6 py-4 pr-16">
                    <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Question {currentIndex + 1} of {questions.length}</span>
                    <div className="flex items-center gap-4">
                        <div className={cn("flex items-center gap-2 rounded-full px-3 py-1 font-mono text-sm font-bold",
                            timeLeft <= 300 ? "bg-destructive/15 text-destructive animate-pulse" : "bg-muted text-foreground")}>
                            <Clock className="h-4 w-4" /> {formatTime(timeLeft)}
                        </div>
                        <div className="hidden h-2 w-24 overflow-hidden rounded-full bg-muted sm:block">
                            <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-300" style={{ width: `${pct}%` }} />
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-8">
                    {q.cross_topic && <Badge variant="ai" className="mb-4">Cross-Topic Synthesis</Badge>}
                    {q.type === "scenario" && (
                        <div className="mb-6 rounded-xl border border-info/30 bg-info/10 p-4">
                            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-info">Scenario</h4>
                            <p className="leading-relaxed text-foreground/90">{q.scenario}</p>
                        </div>
                    )}
                    {q.type === "fib" && (
                        <div className="mb-8">
                            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Fill in the blank</h4>
                            <h3 className="text-2xl font-semibold leading-tight text-foreground">{q.sentence_with_blank?.replace("_____", "___")}</h3>
                        </div>
                    )}
                    {q.type !== "fib" && <h3 className="mb-8 text-2xl font-semibold leading-tight text-foreground">{q.question}</h3>}
                    {q.type === "sata" && <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary">Select ALL that apply</p>}

                    <div className="flex flex-col gap-3">
                        {q.options?.map((opt, i) => {
                            let isSelected = false
                            if (q.type === "sata") isSelected = (answers[currentIndex] || []).includes(opt)
                            else if (q.type === "mcq" || q.type === "scenario") isSelected = answers[currentIndex] === opt || answers[currentIndex] === i
                            else if (q.type === "fib") isSelected = answers[currentIndex] === opt

                            return (
                                <button
                                    key={i}
                                    onClick={() => {
                                        if (q.type === "sata") toggleSataAnswer(opt)
                                        else setSingleAnswer(q.type === "mcq" ? (typeof q.correct_answer === "number" ? i : opt) : opt)
                                    }}
                                    className={cn(
                                        "flex items-center gap-3 rounded-xl border-2 p-4 text-left font-medium transition-all",
                                        isSelected ? "border-primary bg-primary/10 text-primary"
                                            : "border-border bg-muted/30 text-foreground hover:border-primary/40 hover:bg-muted/60"
                                    )}
                                >
                                    {q.type === "sata" ? (
                                        <div className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                                            isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground")}>
                                            {isSelected && <Check className="h-3.5 w-3.5" />}
                                        </div>
                                    ) : (
                                        <div className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                                            isSelected ? "border-primary" : "border-muted-foreground")}>
                                            {isSelected && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                                        </div>
                                    )}
                                    {opt}
                                </button>
                            )
                        })}
                    </div>
                </div>

                <div className="flex shrink-0 items-center justify-between border-t border-border bg-muted/30 p-6">
                    <Button variant="outline" onClick={() => setCurrentIndex(p => Math.max(0, p - 1))} disabled={currentIndex === 0}>Previous</Button>
                    <div className="hidden gap-1 md:flex">
                        {questions.map((_, i) => (
                            <div key={i} className={cn("h-2 w-2 rounded-full",
                                i === currentIndex ? "bg-primary" : answers[i] !== undefined ? "bg-primary/40" : "bg-muted-foreground/30")} />
                        ))}
                    </div>
                    <Button variant="primary" onClick={() => { if (currentIndex < questions.length - 1) setCurrentIndex(p => p + 1); else finishExam() }}>
                        {currentIndex < questions.length - 1 ? "Next" : "Submit Exam"}
                    </Button>
                </div>
            </motion.div>
        )
    }

    const renderResultStep = () => {
        const passed = score.correct >= (examData?.pass_mark || 15)
        return (
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex h-full flex-col items-center justify-center overflow-y-auto p-8 text-center">
                <div className={cn("mb-6 flex h-32 w-32 items-center justify-center rounded-full border-8",
                    passed ? "border-success/30 bg-success/15 text-success" : "border-destructive/30 bg-destructive/15 text-destructive")}>
                    {passed ? <Award className="h-16 w-16" /> : <ShieldAlert className="h-16 w-16" />}
                </div>
                <h2 className="mb-4 text-4xl font-heading font-bold text-foreground">{passed ? "Mastery Certified!" : "Exam Failed"}</h2>
                <p className="mb-8 text-2xl text-muted-foreground">
                    You scored <strong style={{ color: passed ? "hsl(var(--success))" : "hsl(var(--destructive))" }}>{score.correct} out of {score.total}</strong>
                </p>
                <button
                    onClick={() => { onClose(); if (passed) onComplete() }}
                    className={cn(
                        "rounded-2xl px-10 py-4 text-lg font-bold text-white shadow-e3 transition-all hover:-translate-y-1",
                        passed ? "bg-gradient-to-r from-amber-400 to-amber-600" : "bg-foreground/80"
                    )}
                >
                    {passed ? "Claim Certificate" : "Close"}
                </button>
            </motion.div>
        )
    }

    return (
        <Overlay isOpen={isOpen} onClose={onClose} className="max-w-4xl">
            <div className="glass relative flex h-[88vh] flex-col overflow-hidden rounded-3xl shadow-e4 dark:shadow-e4-dark sm:h-[85vh]">
                {(step === "generating" || step === "exam") && (
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>
                )}

                {step === "generating" && (
                    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                        <Loader2 className="mb-6 h-16 w-16 animate-spin text-primary" />
                        <h3 className="mb-4 text-2xl font-heading font-bold text-gradient-primary">Forging the Final Exam</h3>
                        <p className="text-muted-foreground">Synthesizing knowledge across all completed topics…</p>
                    </div>
                )}
                {step === "exam" && renderExamStep()}
                {step === "result" && renderResultStep()}
            </div>
        </Overlay>
    )
}

export default FinalExamModal
