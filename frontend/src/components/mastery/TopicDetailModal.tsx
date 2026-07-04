import React, { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { X, Check, Loader2, Award, ShieldAlert, Clock, Code2 } from "lucide-react"
import api from "../../utils/api"
import { useToast } from "../../contexts/ToastContext"
import { cn } from "../../lib/utils"
import Overlay from "../ui/Overlay"
import Button from "../ui/Button"
import Badge from "../ui/Badge"

interface TopicDetailModalProps {
    isOpen: boolean
    onClose: () => void
    topic: any
    roadmapId: string
    onComplete: (updatedProgress?: any[]) => void
}

type Step = "loading_read" | "read" | "generating_quiz" | "quiz" | "result"

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
}

const TopicDetailModal: React.FC<TopicDetailModalProps> = ({ isOpen, onClose, topic, onComplete }) => {
    const { addToast } = useToast()

    const [step, setStep] = useState<Step>("loading_read")
    const [summary, setSummary] = useState<any>(null)
    const [questions, setQuestions] = useState<Question[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [answers, setAnswers] = useState<Record<number, any>>({})
    const [score, setScore] = useState({ correct: 0, total: 5 })
    const [submitting, setSubmitting] = useState(false)
    const [completionData, setCompletionData] = useState<any>(null)
    const [timeLeft, setTimeLeft] = useState<number>(30)

    const timerRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        if (isOpen && topic) {
            setStep("loading_read")
            setSummary(null)
            setQuestions([])
            setCurrentIndex(0)
            setAnswers({})
            setCompletionData(null)
            fetchSummary()
        }
        return () => clearInterval(timerRef.current!)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, topic])

    useEffect(() => {
        if (step === "quiz") {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current!)
                        handleNextOrSubmit()
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
        }
        return () => clearInterval(timerRef.current!)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step, currentIndex])

    const fetchSummary = async () => {
        if (!topic) return
        try {
            const res = await api.post("/api/mastery/summary", {
                subtopic_id: topic.id,
                subtopic_title: topic.title,
                difficulty: topic.difficulty || 1,
            })
            setSummary(res.data)
            setStep("read")
        } catch (error) {
            console.error(error)
            addToast({ title: "Failed to load summary", type: "error" })
            onClose()
        }
    }

    const handleStartQuiz = async () => {
        if (!topic) return
        setStep("generating_quiz")
        try {
            const res = await api.post("/api/mastery/generate-quiz", {
                subtopic_id: topic.id,
                subtopic_title: topic.title,
                difficulty: topic.difficulty || 1,
                attempt_number: (topic.attempts || 0) + 1,
            })
            const qs = res.data.questions.map((q: any) => {
                if (q.type === "fib" && q.near_miss_options && q.correct_word) {
                    const opts = [...q.near_miss_options, q.correct_word].sort(() => Math.random() - 0.5)
                    return { ...q, options: opts }
                }
                return q
            })
            setQuestions(qs)
            setTimeLeft(res.data.time_per_question_seconds || 30)
            setStep("quiz")
        } catch (error: any) {
            console.error(error)
            addToast({ title: error.response?.data?.detail || "Failed to generate quiz", type: "error" })
            setStep("read")
        }
    }

    const handleNextOrSubmit = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1)
            setTimeLeft(30)
        } else {
            finishQuiz()
        }
    }

    const finishQuiz = async () => {
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
        const passed = correctCount >= questions.length * 0.8

        if (!topic) return

        try {
            setSubmitting(true)
            const res = await api.patch(`/api/mastery/progress/${topic.id}`, {
                user_id: "",
                quiz_score: correctCount / questions.length,
                status: passed ? "completed" : "locked",
                attempt_number: (topic.attempts || 0) + 1,
            })
            setCompletionData(res.data)
            if (passed) addToast({ title: "Topic Mastered!", type: "success" })
            else addToast({ title: "Quiz failed — 10 minute cooldown.", type: "warning" })
        } catch (error) {
            console.error(error)
            addToast({ title: "Failed to save progress", type: "error" })
        } finally {
            setSubmitting(false)
        }
    }

    const toggleSataAnswer = (opt: string) => {
        const cur = answers[currentIndex] || []
        const next = cur.includes(opt) ? cur.filter((o: string) => o !== opt) : [...cur, opt]
        setAnswers({ ...answers, [currentIndex]: next })
    }
    const setSingleAnswer = (opt: string | number) => setAnswers({ ...answers, [currentIndex]: opt })

    // ── Steps ─────────────────────────────────────────────────────────────────
    const renderReadStep = () => {
        if (step === "loading_read") {
            return (
                <div className="flex h-full flex-col items-center justify-center p-8">
                    <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
                    <p className="text-muted-foreground">Generating deep-dive summary…</p>
                </div>
            )
        }
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-full flex-col">
                <div className="flex-1 overflow-y-auto p-6 md:p-8">
                    <Badge variant="info" className="mb-4">Level {summary?.difficulty} • ~{summary?.estimated_read_minutes} min read</Badge>
                    <h2 className="mb-4 text-3xl font-heading font-bold text-foreground">{summary?.subtopic_title}</h2>

                    {summary?.hook && (
                        <div className="mb-8 border-l-4 border-primary pl-4 text-lg italic text-muted-foreground">{summary.hook}</div>
                    )}

                    <div className="max-w-none leading-relaxed text-muted-foreground">
                        {summary?.explanation?.split("\n").map((p: string, i: number) => (p.trim() ? <p key={i} className="mb-4">{p}</p> : null))}
                    </div>

                    {summary?.example && (
                        <div className="mt-8 rounded-2xl bg-muted/50 p-6">
                            <h4 className="mb-2 font-bold text-foreground">How it works (Example)</h4>
                            <p className="text-muted-foreground">{summary.example}</p>
                        </div>
                    )}

                    {summary?.code_snippet && (
                        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-foreground/[0.04]">
                            <div className="flex items-center border-b border-border px-4 py-2">
                                <Code2 className="mr-2 h-4 w-4 text-muted-foreground" />
                                <span className="font-mono text-xs text-muted-foreground">Example Snippet</span>
                            </div>
                            <pre className="overflow-x-auto p-4 font-mono text-sm text-primary"><code>{summary.code_snippet}</code></pre>
                        </div>
                    )}

                    {summary?.common_mistake && (
                        <div className="mt-8 rounded-2xl border border-warning/30 bg-warning/10 p-6">
                            <h4 className="mb-2 flex items-center gap-2 font-bold text-warning"><ShieldAlert className="h-5 w-5" /> Common Mistake</h4>
                            <p className="text-warning/90">{summary.common_mistake}</p>
                        </div>
                    )}

                    {summary?.key_takeaways && (
                        <div className="mt-8">
                            <h4 className="mb-4 font-bold text-foreground">Key Takeaways</h4>
                            <ul className="space-y-3">
                                {summary.key_takeaways.map((point: string, i: number) => (
                                    <li key={i} className="flex gap-3 text-muted-foreground">
                                        <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                                        <span>{point}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="flex shrink-0 justify-end gap-3 border-t border-border bg-muted/30 p-6">
                    {topic?.status === "completed"
                        ? <Button variant="outline" onClick={onClose}>Close</Button>
                        : <Button variant="primary" onClick={handleStartQuiz}><Check className="h-5 w-5" /> Take the Quiz</Button>}
                </div>
            </motion.div>
        )
    }

    const renderQuizStep = () => {
        if (step === "generating_quiz") {
            return (
                <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                    <Loader2 className="mb-6 h-12 w-12 animate-spin text-primary" />
                    <h3 className="mb-2 text-xl font-heading font-bold text-gradient-primary">Generating Rigorous Quiz</h3>
                    <p className="text-muted-foreground">Our AI is generating non-repeating questions to test true mastery…</p>
                </div>
            )
        }
        if (questions.length === 0) return null
        const q = questions[currentIndex]
        const pct = (currentIndex / questions.length) * 100

        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-full flex-col overflow-hidden">
                <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/30 px-6 py-4 pr-16">
                    <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Question {currentIndex + 1} of {questions.length}</span>
                    <div className="flex items-center gap-4">
                        <div className={cn("flex items-center gap-2 rounded-full px-3 py-1 font-mono text-sm font-bold",
                            timeLeft <= 5 ? "bg-destructive/15 text-destructive animate-pulse" : "bg-muted text-foreground")}>
                            <Clock className="h-4 w-4" /> 00:{timeLeft.toString().padStart(2, "0")}
                        </div>
                        <div className="hidden h-2 w-24 overflow-hidden rounded-full bg-muted sm:block">
                            <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-300" style={{ width: `${pct}%` }} />
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-8">
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
                    {q.type !== "fib" && (
                        <h3 className="mb-8 text-2xl font-semibold leading-tight text-foreground">{q.question}</h3>
                    )}
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

                <div className="flex shrink-0 justify-end border-t border-border bg-muted/30 p-6">
                    <Button variant="primary" onClick={handleNextOrSubmit}>
                        {currentIndex < questions.length - 1 ? "Next Question" : "Submit Quiz"}
                    </Button>
                </div>
            </motion.div>
        )
    }

    const renderResultStep = () => {
        const passed = score.correct >= questions.length * 0.8
        return (
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex h-full flex-col items-center justify-center overflow-y-auto p-8 text-center">
                {submitting ? (
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                ) : (
                    <>
                        <div className={cn("mb-6 flex h-24 w-24 items-center justify-center rounded-full",
                            passed ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>
                            {passed ? <Award className="h-12 w-12" /> : <ShieldAlert className="h-12 w-12" />}
                        </div>
                        <h2 className="mb-2 text-3xl font-heading font-bold text-foreground">{passed ? "Mastery Achieved!" : "Mastery Failed"}</h2>
                        <p className="mb-6 text-xl text-muted-foreground">
                            You scored <strong style={{ color: passed ? "hsl(var(--success))" : "hsl(var(--destructive))" }}>{score.correct} out of {score.total}</strong>
                        </p>
                        {!passed && (
                            <div className="mx-auto mb-8 max-w-md rounded-xl bg-destructive/10 px-6 py-4 text-sm text-destructive">
                                <p className="mb-1 font-bold">Cooldown Initiated</p>
                                <p>Wait 10 minutes before retaking this quiz so you have time to study the material properly.</p>
                            </div>
                        )}
                        <Button
                            variant={passed ? "primary" : "outline"}
                            onClick={() => { if (completionData?.progress) onComplete(completionData.progress); else onComplete() }}
                        >
                            Back to Roadmap
                        </Button>
                    </>
                )}
            </motion.div>
        )
    }

    return (
        <Overlay isOpen={isOpen && !!topic} onClose={onClose} className="max-w-2xl">
            <div className="glass relative flex h-[82vh] flex-col overflow-hidden rounded-3xl shadow-e4 dark:shadow-e4-dark">
                {(step === "loading_read" || step === "read" || step === "generating_quiz" || step === "quiz") && (
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>
                )}
                {step.includes("read") && renderReadStep()}
                {step.includes("quiz") && renderQuizStep()}
                {step === "result" && renderResultStep()}
            </div>
        </Overlay>
    )
}

export default TopicDetailModal
