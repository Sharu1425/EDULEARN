import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Check, Loader2, Award, RefreshCcw } from "lucide-react"
import api from "../../utils/api"
import { useTheme } from "../../contexts/ThemeContext"
import { useToast } from "../../contexts/ToastContext"
import { cn } from "../../lib/utils"

interface TopicDetailModalProps {
    isOpen: boolean
    onClose: () => void
    topic: any
    onComplete: (updatedProgress?: any[]) => void
}

type Step = "read" | "quiz" | "result"

interface Question {
    question: string
    options: string[]
    correct_answer: number
}

const TopicDetailModal: React.FC<TopicDetailModalProps> = ({ isOpen, onClose, topic, onComplete }) => {
    const { colorScheme } = useTheme()
    const { addToast } = useToast()
    const isDark = colorScheme === "dark"

    const [step, setStep] = useState<Step>("read")
    const [generating, setGenerating] = useState(false)
    const [questions, setQuestions] = useState<Question[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [answers, setAnswers] = useState<number[]>([])
    const [score, setScore] = useState({ correct: 0, total: 5 })
    const [submitting, setSubmitting] = useState(false)
    const [completionData, setCompletionData] = useState<any>(null)

    // Reset state when topic changes or modal opens
    useEffect(() => {
        if (isOpen && topic) {
            setStep("read")
            setQuestions([])
            setCurrentIndex(0)
            setAnswers([])
            setCompletionData(null)
            
            // If already completed, maybe just show read mode or indicate completion
            if (topic.status === "completed") {
                // Keep it read, user can review it.
            }
        }
    }, [isOpen, topic])

    if (!isOpen || !topic) return null

    const handleStartQuiz = async () => {
        setStep("quiz")
        setGenerating(true)
        try {
            const res = await api.post("/api/mastery/generate-quiz", {
                topic_id: topic.id,
                topic_title: topic.title,
                concept_summary: topic.concept_summary
            })
            setQuestions(res.data)
        } catch (error) {
            console.error(error)
            addToast({ title: "Failed to generate quiz", type: "error" })
            setStep("read") // go back
        } finally {
            setGenerating(false)
        }
    }

    const handleAnswer = (optionIdx: number) => {
        const newAnswers = [...answers, optionIdx]
        setAnswers(newAnswers)

        // Give a slight delay before moving to next question for visual polish
        setTimeout(() => {
            if (currentIndex + 1 < questions.length) {
                setCurrentIndex(currentIndex + 1)
            } else {
                finishQuiz(newAnswers)
            }
        }, 400)
    }

    const finishQuiz = async (finalAnswers: number[]) => {
        setStep("result")
        
        let correctCount = 0
        questions.forEach((q, i) => {
            if (finalAnswers[i] === q.correct_answer) {
                correctCount++
            }
        })
        
        setScore({ correct: correctCount, total: questions.length })

        // Submit to backend
        if (topic.status !== "completed") {
            try {
                setSubmitting(true)
                // Using new topic-based PATCH endpoint
                const res = await api.patch(`/api/mastery/progress/${topic.id}`, {
                    user_id: "",
                    quiz_score: correctCount / questions.length,
                    status: "completed"
                })
                setCompletionData(res.data)
                
                // Note: new response format expects "credits" instead of "credits_awarded" 
                // but checking for new updated progress array to trigger success
                if (res.data.progress) {
                    addToast({ title: `Topic Mastered! +10 Credits`, type: "success" })
                }
            } catch (error) {
                console.error(error)
                addToast({ title: "Failed to save progress", type: "error" })
            } finally {
                setSubmitting(false)
            }
        }
    }

    const renderReadStep = () => (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-6 md:p-8">
                <div className="inline-block px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-medium rounded-full text-sm mb-4">
                    ~{topic.estimated_minutes} min read
                </div>
                <h2 className={cn("text-3xl font-heading font-bold mb-6", isDark ? "text-white" : "text-slate-900")}>
                    {topic.title}
                </h2>
                <div className={cn("prose prose-lg dark:prose-invert max-w-none leading-relaxed", isDark ? "text-slate-300" : "text-slate-700")}>
                    {topic.concept_summary.split('\n').map((paragraph: string, i: number) => (
                        paragraph.trim() && <p key={i} className="mb-4">{paragraph}</p>
                    ))}
                </div>
            </div>
            
            <div className={cn("p-6 border-t flex justify-end gap-4", isDark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-slate-50")}>
                {topic.status === "completed" ? (
                    <button onClick={onClose} className="px-6 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 font-semibold transition-colors">
                        Close
                    </button>
                ) : (
                    <button 
                        onClick={handleStartQuiz}
                        className="px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-semibold flex items-center gap-2 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                    >
                        <Check className="w-5 h-5" /> I've Read This
                    </button>
                )}
            </div>
        </motion.div>
    )

    const renderQuizStep = () => {
        if (generating) {
            return (
                <div className="flex flex-col h-full items-center justify-center p-8 text-center bg-gradient-to-br from-indigo-500/5 to-cyan-500/5">
                    <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mb-6" />
                    <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-500 to-cyan-500 bg-clip-text text-transparent mb-2">Generating Your Quiz</h3>
                    <p className={isDark ? "text-slate-400" : "text-slate-500"}>Our AI is analyzing the concept to test your understanding...</p>
                </div>
            )
        }

        if (questions.length === 0) return null
        
        const q = questions[currentIndex]
        const progressPercentage = ((currentIndex) / questions.length) * 100

        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full">
                {/* Progress Bar */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
                    <span className="font-semibold text-slate-500 dark:text-slate-400 text-sm tracking-wide uppercase">Question {currentIndex + 1} of {questions.length}</span>
                    <div className="w-32 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${progressPercentage}%` }} />
                    </div>
                </div>

                <div className="flex-1 p-6 md:p-8 overflow-y-auto">
                    <h3 className={cn("text-2xl font-semibold mb-8 leading-tight", isDark ? "text-white" : "text-slate-900")}>
                        {q.question}
                    </h3>

                    <div className="flex flex-col gap-3">
                        {q.options.map((opt, i) => {
                            const isSelected = answers[currentIndex] === i
                            return (
                                <button
                                    key={i}
                                    onClick={() => handleAnswer(i)}
                                    className={cn(
                                        "text-left p-4 rounded-xl border-2 transition-all font-medium",
                                        isSelected 
                                            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                                            : isDark
                                                ? "border-slate-700 bg-slate-800/50 hover:bg-slate-800 text-slate-200"
                                                : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50"
                                    )}
                                >
                                    {opt}
                                </button>
                            )
                        })}
                    </div>
                </div>
            </motion.div>
        )
    }

    const renderResultStep = () => {
        const passed = score.correct >= 3 // 60% of 5
        
        return (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col h-full items-center justify-center p-8 text-center">
                {submitting ? (
                    <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mb-4" />
                ) : (
                    <>
                        <div className={cn(
                            "w-24 h-24 rounded-full flex items-center justify-center mb-6",
                            passed ? "bg-green-100 text-green-500 dark:bg-green-500/20" : "bg-orange-100 text-orange-500 dark:bg-orange-500/20"
                        )}>
                            {passed ? <Award className="w-12 h-12" /> : <RefreshCcw className="w-12 h-12" />}
                        </div>
                        
                        <h2 className={cn("text-3xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>
                            {passed ? "Excellent Work!" : "Not quite there"}
                        </h2>
                        
                        <p className={cn("text-xl mb-8", isDark ? "text-slate-300" : "text-slate-600")}>
                            You scored <strong className={passed ? "text-green-500" : "text-orange-500"}>{score.correct} out of {score.total}</strong>
                        </p>

                        {passed && completionData?.credits_awarded && (
                            <div className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-lg font-bold mb-8 animate-bounce">
                                +{completionData.credits_awarded} Credits Earned!
                            </div>
                        )}

                        <div className="flex gap-4">
                            {!passed && (
                                <button 
                                    onClick={() => {
                                        setStep("read")
                                    }}
                                    className="px-6 py-3 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 font-semibold transition-colors"
                                >
                                    Review Topic
                                </button>
                            )}
                            <button 
                                onClick={() => {
                                    if (passed && completionData?.progress) onComplete(completionData.progress)
                                    else if (passed) onComplete()
                                    else onClose()
                                }}
                                className="px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-semibold shadow-lg hover:shadow-indigo-500/25 transition-all"
                            >
                                Continue
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
                        {/* Header area Close button */}
                        {(step === "read" || step === "quiz") && (
                            <button 
                                onClick={onClose}
                                className="absolute right-4 top-4 z-10 w-10 h-10 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 flex items-center justify-center transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-500 dark:text-slate-300" />
                            </button>
                        )}

                        {step === "read" && renderReadStep()}
                        {step === "quiz" && renderQuizStep()}
                        {step === "result" && renderResultStep()}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}

export default TopicDetailModal
