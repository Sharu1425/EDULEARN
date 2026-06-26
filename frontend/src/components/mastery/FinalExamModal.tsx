import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Check, Loader2, Award, ShieldAlert, Clock } from "lucide-react"
import api from "../../utils/api"
import { useTheme } from "../../contexts/ThemeContext"
import { useToast } from "../../contexts/ToastContext"
import { cn } from "../../lib/utils"

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
    const { colorScheme } = useTheme()
    const { addToast } = useToast()
    const isDark = colorScheme === "dark"

    const [step, setStep] = useState<Step>("generating")
    const [examData, setExamData] = useState<any>(null)
    const [questions, setQuestions] = useState<Question[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [answers, setAnswers] = useState<Record<number, any>>({})
    const [score, setScore] = useState({ correct: 0, total: 18 })
    
    // 45 minutes global timer
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
    }, [step])

    const generateExam = async () => {
        try {
            const res = await api.post("/api/mastery/final-exam", {
                roadmap_id: roadmapId
            })
            
            setExamData(res.data)
            
            // Normalize FIB options
            const qs = res.data.questions.map((q: any) => {
                if (q.type === "fib" && q.near_miss_options && q.correct_word) {
                    const opts = [...q.near_miss_options, q.correct_word].sort(() => Math.random() - 0.5)
                    return { ...q, options: opts }
                }
                return q
            })
            setQuestions(qs)
            if (res.data.time_limit_minutes) {
                setTimeLeft(res.data.time_limit_minutes * 60)
            }
            setStep("exam")
        } catch (error: any) {
            console.error(error)
            const msg = error.response?.data?.detail || "Failed to generate Final Exam"
            addToast({ title: msg, type: "error" })
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
                if (ansArr.length === correctArr.length && ansArr.every((a: string) => correctArr.includes(a))) {
                    correctCount++
                }
            }
        })
        
        setScore({ correct: correctCount, total: questions.length })
        const passed = correctCount >= (examData?.pass_mark || 15)

        if (passed) {
            addToast({ title: "Mastery Certified! You passed the Final Exam.", type: "success" })
        } else {
            addToast({ title: "Final Exam Failed. Keep studying!", type: "warning" })
        }
    }

    const toggleSataAnswer = (opt: string) => {
        const currentAns = answers[currentIndex] || []
        let newAns;
        if (currentAns.includes(opt)) {
            newAns = currentAns.filter((o: string) => o !== opt)
        } else {
            newAns = [...currentAns, opt]
        }
        setAnswers({ ...answers, [currentIndex]: newAns })
    }

    const setSingleAnswer = (opt: string | number) => {
        setAnswers({ ...answers, [currentIndex]: opt })
    }

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }

    const renderExamStep = () => {
        if (questions.length === 0) return null
        
        const q = questions[currentIndex]
        const progressPercentage = ((currentIndex) / questions.length) * 100

        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 shrink-0 pr-16">
                    <span className="font-semibold text-slate-500 dark:text-slate-400 text-sm tracking-wide uppercase">
                        Question {currentIndex + 1} of {questions.length}
                    </span>
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "flex items-center gap-2 px-3 py-1 rounded-full font-mono font-bold text-sm",
                            timeLeft <= 300 ? "bg-red-100 text-red-600 animate-pulse" : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                        )}>
                            <Clock className="w-4 h-4" /> {formatTime(timeLeft)}
                        </div>
                        <div className="w-24 sm:w-32 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden hidden sm:block">
                            <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${progressPercentage}%` }} />
                        </div>
                    </div>
                </div>

                <div className="flex-1 p-6 md:p-8 overflow-y-auto">
                    {q.cross_topic && (
                        <div className="mb-4 inline-flex items-center px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full text-xs font-bold uppercase tracking-wider">
                            Cross-Topic Synthesis
                        </div>
                    )}

                    {q.type === "scenario" && (
                        <div className="mb-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50">
                            <h4 className="font-bold text-blue-800 dark:text-blue-400 mb-2 uppercase text-xs tracking-wider">Scenario</h4>
                            <p className="text-blue-900 dark:text-blue-200/90 leading-relaxed">{q.scenario}</p>
                        </div>
                    )}
                    
                    {q.type === "fib" && (
                        <div className="mb-8">
                            <h4 className="font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase text-xs tracking-wider">Fill in the blank</h4>
                            <h3 className={cn("text-2xl font-semibold leading-tight", isDark ? "text-white" : "text-slate-900")}>
                                {q.sentence_with_blank?.replace("_____", "___")}
                            </h3>
                        </div>
                    )}

                    {q.type !== "fib" && (
                        <h3 className={cn("text-2xl font-semibold mb-8 leading-tight", isDark ? "text-white" : "text-slate-900")}>
                            {q.question}
                        </h3>
                    )}
                    
                    {q.type === "sata" && (
                        <p className="text-sm text-indigo-500 font-semibold mb-4 uppercase tracking-wider">Select ALL that apply</p>
                    )}

                    <div className="flex flex-col gap-3">
                        {q.options?.map((opt, i) => {
                            let isSelected = false
                            if (q.type === "sata") {
                                isSelected = (answers[currentIndex] || []).includes(opt)
                            } else if (q.type === "mcq" || q.type === "scenario") {
                                isSelected = answers[currentIndex] === opt || answers[currentIndex] === i
                            } else if (q.type === "fib") {
                                isSelected = answers[currentIndex] === opt
                            }

                            return (
                                <button
                                    key={i}
                                    onClick={() => {
                                        if (q.type === "sata") toggleSataAnswer(opt)
                                        else setSingleAnswer(q.type === "mcq" ? (typeof q.correct_answer === 'number' ? i : opt) : opt)
                                    }}
                                    className={cn(
                                        "text-left p-4 rounded-xl border-2 transition-all font-medium flex items-center gap-3",
                                        isSelected 
                                            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                                            : isDark
                                                ? "border-slate-700 bg-slate-800/50 hover:bg-slate-800 text-slate-200"
                                                : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50"
                                    )}
                                >
                                    {q.type === "sata" && (
                                        <div className={cn(
                                            "w-5 h-5 rounded border flex items-center justify-center shrink-0",
                                            isSelected ? "bg-indigo-500 border-indigo-500 text-white" : "border-slate-400"
                                        )}>
                                            {isSelected && <Check className="w-3.5 h-3.5" />}
                                        </div>
                                    )}
                                    {q.type !== "sata" && (
                                        <div className={cn(
                                            "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                                            isSelected ? "border-indigo-500" : "border-slate-400"
                                        )}>
                                            {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />}
                                        </div>
                                    )}
                                    {opt}
                                </button>
                            )
                        })}
                    </div>
                </div>
                
                <div className="shrink-0 flex justify-between items-center p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <button
                        onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                        disabled={currentIndex === 0}
                        className={cn(
                            "px-6 py-2.5 rounded-xl font-semibold transition-all",
                            currentIndex === 0 
                                ? "opacity-50 cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500" 
                                : "bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        )}
                    >
                        Previous
                    </button>
                    
                    {/* Navigation Dots */}
                    <div className="hidden md:flex gap-1">
                        {questions.map((_, i) => (
                            <div key={i} className={cn(
                                "w-2 h-2 rounded-full",
                                i === currentIndex ? "bg-indigo-500" : answers[i] !== undefined ? "bg-indigo-300 dark:bg-indigo-700" : "bg-slate-300 dark:bg-slate-700"
                            )} />
                        ))}
                    </div>

                    <button
                        onClick={() => {
                            if (currentIndex < questions.length - 1) setCurrentIndex(prev => prev + 1)
                            else finishExam()
                        }}
                        className={cn(
                            "px-8 py-2.5 rounded-xl font-semibold transition-all shadow-lg",
                            "bg-indigo-600 text-white hover:bg-indigo-700 hover:-translate-y-0.5"
                        )}
                    >
                        {currentIndex < questions.length - 1 ? "Next" : "Submit Exam"}
                    </button>
                </div>
            </motion.div>
        )
    }

    const renderResultStep = () => {
        const passMark = examData?.pass_mark || 15
        const passed = score.correct >= passMark
        
        return (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col h-full items-center justify-center p-8 text-center overflow-y-auto">
                <div className={cn(
                    "w-32 h-32 rounded-full flex items-center justify-center mb-6 border-8",
                    passed ? "bg-green-100 text-green-500 border-green-200 dark:bg-green-500/20 dark:border-green-500/30" : "bg-red-100 text-red-500 border-red-200 dark:bg-red-500/20 dark:border-red-500/30"
                )}>
                    {passed ? <Award className="w-16 h-16" /> : <ShieldAlert className="w-16 h-16" />}
                </div>
                
                <h2 className={cn("text-4xl font-bold mb-4", isDark ? "text-white" : "text-slate-900")}>
                    {passed ? "Mastery Certified!" : "Exam Failed"}
                </h2>
                
                <p className={cn("text-2xl mb-8", isDark ? "text-slate-300" : "text-slate-600")}>
                    You scored <strong className={passed ? "text-green-500" : "text-red-500"}>{score.correct} out of {score.total}</strong>
                </p>

                <div className="flex gap-4 mt-4">
                    <button 
                        onClick={() => {
                            onClose()
                            if (passed) onComplete()
                        }}
                        className={cn(
                            "px-10 py-4 rounded-2xl text-white font-bold text-lg shadow-xl hover:-translate-y-1 transition-all",
                            passed ? "bg-gradient-to-r from-yellow-400 to-amber-600 shadow-amber-500/30" : "bg-slate-800 hover:bg-slate-700"
                        )}
                    >
                        {passed ? "Claim Certificate" : "Close"}
                    </button>
                </div>
            </motion.div>
        )
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
                    />
                    
                    <motion.div 
                        initial={{ opacity: 0, y: 50, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className={cn(
                            "relative w-full max-w-4xl h-[90vh] sm:h-[85vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl",
                            isDark ? "bg-slate-900 border border-white/10" : "bg-white"
                        )}
                    >
                        {(step === "generating" || step === "exam") && (
                            <button 
                                onClick={onClose}
                                className="absolute right-4 top-4 z-10 w-10 h-10 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 flex items-center justify-center transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-500 dark:text-slate-300" />
                            </button>
                        )}

                        {step === "generating" && (
                            <div className="flex flex-col h-full items-center justify-center p-8 text-center bg-gradient-to-br from-indigo-500/5 to-purple-500/5">
                                <Loader2 className="w-16 h-16 animate-spin text-purple-500 mb-6" />
                                <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent mb-4">
                                    Forging the Final Boss Exam
                                </h3>
                                <p className={isDark ? "text-slate-400" : "text-slate-500"}>Synthesizing knowledge across all completed topics...</p>
                            </div>
                        )}
                        
                        {step === "exam" && renderExamStep()}
                        {step === "result" && renderResultStep()}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}

export default FinalExamModal
