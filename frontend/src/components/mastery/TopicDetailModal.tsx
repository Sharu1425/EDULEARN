import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Check, Loader2, Award, ShieldAlert, Clock, Code2 } from "lucide-react"
import api from "../../utils/api"
import { useTheme } from "../../contexts/ThemeContext"
import { useToast } from "../../contexts/ToastContext"
import { cn } from "../../lib/utils"

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
    const { colorScheme } = useTheme()
    const { addToast } = useToast()
    const isDark = colorScheme === "dark"

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

    // Reset and fetch summary when opened
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
    }, [isOpen, topic])

    // Timer logic
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
    }, [step, currentIndex])

    const fetchSummary = async () => {
        try {
            const res = await api.post("/api/mastery/summary", {
                subtopic_id: topic.id,
                subtopic_title: topic.title,
                difficulty: topic.difficulty || 1
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
        setStep("generating_quiz")
        try {
            const res = await api.post("/api/mastery/generate-quiz", {
                subtopic_id: topic.id,
                subtopic_title: topic.title,
                difficulty: topic.difficulty || 1,
                attempt_number: (topic.attempts || 0) + 1
            })
            // Normalize FIB options into a shuffled array if needed
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
            const msg = error.response?.data?.detail || "Failed to generate quiz"
            addToast({ title: msg, type: "error" })
            setStep("read")
        }
    }

    const handleNextOrSubmit = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1)
            setTimeLeft(30) // Reset timer
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
                // Check string or index match
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
        
        const passed = correctCount >= (questions.length * 0.8) // 80% passing threshold

        try {
            setSubmitting(true)
            const res = await api.patch(`/api/mastery/progress/${topic.id}`, {
                user_id: "",
                quiz_score: correctCount / questions.length,
                status: passed ? "completed" : "locked",
                attempt_number: (topic.attempts || 0) + 1
            })
            setCompletionData(res.data)
            
            if (passed) {
                addToast({ title: `Topic Mastered!`, type: "success" })
            } else {
                addToast({ title: `Quiz Failed. Topic is in cooldown for 10 minutes.`, type: "warning" })
            }
        } catch (error) {
            console.error(error)
            addToast({ title: "Failed to save progress", type: "error" })
        } finally {
            setSubmitting(false)
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

    const renderReadStep = () => {
        if (step === "loading_read") {
            return (
                <div className="flex flex-col h-full items-center justify-center p-8">
                    <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mb-4" />
                    <p className={isDark ? "text-slate-400" : "text-slate-500"}>Generating deep dive summary...</p>
                </div>
            )
        }
        
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto p-6 md:p-8">
                    <div className="inline-block px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-medium rounded-full text-xs uppercase tracking-wider mb-4">
                        Level {summary?.difficulty} • ~{summary?.estimated_read_minutes} min read
                    </div>
                    <h2 className={cn("text-3xl font-heading font-bold mb-4", isDark ? "text-white" : "text-slate-900")}>
                        {summary?.subtopic_title}
                    </h2>
                    
                    {summary?.hook && (
                        <div className="text-lg italic text-slate-500 dark:text-slate-400 mb-8 border-l-4 border-indigo-500 pl-4">
                            {summary.hook}
                        </div>
                    )}

                    <div className={cn("prose prose-lg dark:prose-invert max-w-none leading-relaxed", isDark ? "text-slate-300" : "text-slate-700")}>
                        {summary?.explanation.split('\n').map((paragraph: string, i: number) => (
                            paragraph.trim() && <p key={i} className="mb-4">{paragraph}</p>
                        ))}
                    </div>
                    
                    {summary?.example && (
                        <div className="mt-8 bg-slate-100 dark:bg-slate-800/50 p-6 rounded-2xl">
                            <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">How it works (Example)</h4>
                            <p className="text-slate-600 dark:text-slate-400">{summary.example}</p>
                        </div>
                    )}

                    {summary?.code_snippet && (
                        <div className="mt-6 bg-slate-900 rounded-2xl overflow-hidden shadow-lg border border-slate-800">
                            <div className="flex items-center px-4 py-2 bg-slate-800 border-b border-slate-700">
                                <Code2 className="w-4 h-4 text-slate-400 mr-2" />
                                <span className="text-xs text-slate-400 font-mono">Example Snippet</span>
                            </div>
                            <pre className="p-4 text-sm font-mono text-indigo-300 overflow-x-auto">
                                <code>{summary.code_snippet}</code>
                            </pre>
                        </div>
                    )}

                    {summary?.common_mistake && (
                        <div className="mt-8 border border-orange-200 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-900/10 p-6 rounded-2xl">
                            <h4 className="font-bold text-orange-800 dark:text-orange-400 mb-2 flex items-center gap-2">
                                <ShieldAlert className="w-5 h-5" /> Common Mistake
                            </h4>
                            <p className="text-orange-700 dark:text-orange-300/80">{summary.common_mistake}</p>
                        </div>
                    )}

                    {summary?.key_takeaways && (
                        <div className="mt-8">
                            <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-4">Key Takeaways</h4>
                            <ul className="space-y-3">
                                {summary.key_takeaways.map((point: string, i: number) => (
                                    <li key={i} className="flex gap-3 text-slate-600 dark:text-slate-400">
                                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                                        <span>{point}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
                
                <div className={cn("p-6 border-t flex justify-end gap-4 shrink-0", isDark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-slate-50")}>
                    {topic.status === "completed" ? (
                        <button onClick={onClose} className="px-6 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 font-semibold transition-colors">
                            Close
                        </button>
                    ) : (
                        <button 
                            onClick={handleStartQuiz}
                            className="px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-semibold flex items-center gap-2 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                        >
                            <Check className="w-5 h-5" /> Take the Quiz
                        </button>
                    )}
                </div>
            </motion.div>
        )
    }

    const renderQuizStep = () => {
        if (step === "generating_quiz") {
            return (
                <div className="flex flex-col h-full items-center justify-center p-8 text-center bg-gradient-to-br from-indigo-500/5 to-cyan-500/5">
                    <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mb-6" />
                    <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-500 to-cyan-500 bg-clip-text text-transparent mb-2">Generating Rigorous Quiz</h3>
                    <p className={isDark ? "text-slate-400" : "text-slate-500"}>Our AI is generating non-repeating questions to test true mastery...</p>
                </div>
            )
        }

        if (questions.length === 0) return null
        
        const q = questions[currentIndex]
        const progressPercentage = ((currentIndex) / questions.length) * 100

        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 shrink-0 pr-16">
                    <span className="font-semibold text-slate-500 dark:text-slate-400 text-sm tracking-wide uppercase">Question {currentIndex + 1} of {questions.length}</span>
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "flex items-center gap-2 px-3 py-1 rounded-full font-mono font-bold text-sm",
                            timeLeft <= 5 ? "bg-red-100 text-red-600 animate-pulse" : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                        )}>
                            <Clock className="w-4 h-4" /> 00:{timeLeft.toString().padStart(2, '0')}
                        </div>
                        <div className="w-24 sm:w-32 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${progressPercentage}%` }} />
                        </div>
                    </div>
                </div>

                <div className="flex-1 p-6 md:p-8 overflow-y-auto">
                    {/* Scenario Badge */}
                    {q.type === "scenario" && (
                        <div className="mb-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50">
                            <h4 className="font-bold text-blue-800 dark:text-blue-400 mb-2 uppercase text-xs tracking-wider">Scenario</h4>
                            <p className="text-blue-900 dark:text-blue-200/90 leading-relaxed">{q.scenario}</p>
                        </div>
                    )}
                    
                    {/* FIB formatting */}
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
                                // Sometimes correct_answer is an index, sometimes string. Assume string or option value matching
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
                
                <div className="shrink-0 flex justify-end items-center p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <button
                        onClick={handleNextOrSubmit}
                        className={cn(
                            "px-8 py-3 rounded-xl font-semibold transition-all shadow-lg",
                            "bg-indigo-600 text-white hover:bg-indigo-700 hover:-translate-y-0.5"
                        )}
                    >
                        {currentIndex < questions.length - 1 ? "Next Question" : "Submit Quiz"}
                    </button>
                </div>
            </motion.div>
        )
    }

    const renderResultStep = () => {
        const passMark = questions.length * 0.8
        const passed = score.correct >= passMark
        
        return (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col h-full items-center justify-center p-8 text-center overflow-y-auto">
                {submitting ? (
                    <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mb-4" />
                ) : (
                    <>
                        <div className={cn(
                            "w-24 h-24 rounded-full flex items-center justify-center mb-6",
                            passed ? "bg-green-100 text-green-500 dark:bg-green-500/20" : "bg-red-100 text-red-500 dark:bg-red-500/20"
                        )}>
                            {passed ? <Award className="w-12 h-12" /> : <ShieldAlert className="w-12 h-12" />}
                        </div>
                        
                        <h2 className={cn("text-3xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>
                            {passed ? "Mastery Achieved!" : "Mastery Failed"}
                        </h2>
                        
                        <p className={cn("text-xl mb-6", isDark ? "text-slate-300" : "text-slate-600")}>
                            You scored <strong className={passed ? "text-green-500" : "text-red-500"}>{score.correct} out of {score.total}</strong>
                        </p>
                        
                        {!passed && (
                            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-6 py-4 rounded-xl text-sm max-w-md mx-auto mb-8">
                                <p className="font-bold mb-1">Cooldown Initiated</p>
                                <p>You must wait 10 minutes before retaking this quiz to ensure you have time to study the material properly.</p>
                            </div>
                        )}

                        <div className="flex gap-4">
                            <button 
                                onClick={() => {
                                    if (completionData?.progress) onComplete(completionData.progress)
                                    else onComplete()
                                }}
                                className={cn(
                                    "px-8 py-3 rounded-xl text-white font-semibold shadow-lg hover:-translate-y-0.5 transition-all",
                                    passed ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:shadow-green-500/25" : "bg-slate-800 hover:bg-slate-700"
                                )}
                            >
                                Back to Roadmap
                            </button>
                        </div>
                    </>
                )}
            </motion.div>
        )
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
                    />
                    
                    <motion.div 
                        initial={{ opacity: 0, y: 50, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className={cn(
                            "relative w-full max-w-2xl h-[85vh] sm:h-[80vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl",
                            isDark ? "bg-slate-900 border border-white/10" : "bg-white"
                        )}
                    >
                        {(step === "loading_read" || step === "read" || step === "generating_quiz" || step === "quiz") && (
                            <button 
                                onClick={onClose}
                                className="absolute right-4 top-4 z-10 w-10 h-10 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 flex items-center justify-center transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-500 dark:text-slate-300" />
                            </button>
                        )}

                        {step.includes("read") && renderReadStep()}
                        {step.includes("quiz") && renderQuizStep()}
                        {step === "result" && renderResultStep()}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}

export default TopicDetailModal
