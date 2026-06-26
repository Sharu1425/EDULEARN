import React, { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { Loader2, ArrowLeft, CheckCircle2, Lock, Flame, ShieldAlert } from "lucide-react"
import api from "../../utils/api"
import { useToast } from "../../contexts/ToastContext"
import { useTheme } from "../../contexts/ThemeContext"
import { useAuth } from "../../hooks/useAuth"
import { cn } from "../../lib/utils"
import TopicDetailModal from "../../components/mastery/TopicDetailModal"
import CertificateModal from "../../components/mastery/CertificateModal"
import FinalExamModal from "../../components/mastery/FinalExamModal"

export interface TopicNode {
    id: string
    title: string
    difficulty: number
    reading_time_minutes: number
    prerequisites: string[]
    status: "locked" | "available" | "completed"
    quiz_score?: number
    attempts?: number
    locked_until?: string | null
    progress_id?: string
}

export interface MasteryCluster {
    cluster_id: string
    cluster_title: string
    subtopics: TopicNode[]
}

interface RoadmapDetails {
    id: string
    subject: string
    roadmap_title?: string
    topics: MasteryCluster[]
    streak_count: number
}

const MasteryNodeMap: React.FC = () => {
    const { roadmapId } = useParams()
    const navigate = useNavigate()
    const { addToast } = useToast()
    const { colorScheme } = useTheme()
    const { user } = useAuth()
    const isDark = colorScheme === "dark"

    const [roadmap, setRoadmap] = useState<RoadmapDetails | null>(null)
    const [loading, setLoading] = useState(true)
    const [selectedTopic, setSelectedTopic] = useState<TopicNode | null>(null)
    const [showCertificate, setShowCertificate] = useState(false)
    const [showFinalExam, setShowFinalExam] = useState(false)

    useEffect(() => {
        if (roadmapId) {
            fetchRoadmapDetails()
        }
    }, [roadmapId])

    const fetchRoadmapDetails = async () => {
        try {
            const res = await api.get(`/api/mastery/roadmaps/${roadmapId}`)
            setRoadmap(res.data)
        } catch (error: any) {
            console.error(error)
            addToast({ title: "Failed to load roadmap", type: "error" })
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        )
    }

    if (!roadmap) {
        return (
            <div className="flex flex-col h-full items-center justify-center text-center p-6">
                <h2 className="text-2xl font-bold mb-4">Roadmap not found</h2>
                <button onClick={() => navigate("/mastery")} className="text-indigo-500 hover:underline">
                    Back to Mastery Paths
                </button>
            </div>
        )
    }

    // Flatten all topics to compute total and completed
    const allTopics = roadmap.topics.flatMap(c => c.subtopics)
    const completedCount = allTopics.filter(t => t.status === "completed").length
    const totalCount = allTopics.length
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0
    const isAllCompleted = completedCount === totalCount && totalCount > 0

    return (
        <div className="min-h-full flex flex-col items-center relative overflow-x-hidden pt-6 pb-20">
            {/* Header */}
            <div className="w-full max-w-3xl px-6 mb-12 flex flex-col sm:flex-row items-center justify-between gap-6 z-10 sticky top-0 py-4 backdrop-blur-md bg-opacity-80 rounded-b-2xl" style={{ backgroundColor: isDark ? 'rgba(2, 6, 23, 0.7)' : 'rgba(255, 255, 255, 0.7)' }}>
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <button 
                        onClick={() => navigate("/mastery")}
                        className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center transition-colors shrink-0",
                            isDark ? "bg-slate-800 hover:bg-slate-700" : "bg-slate-100 hover:bg-slate-200"
                        )}
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className={cn("text-2xl font-heading font-bold", isDark ? "text-white" : "text-slate-900")}>
                            {roadmap.roadmap_title || roadmap.subject}
                        </h1>
                        <div className="flex items-center gap-3 text-sm mt-1">
                            <span className="font-semibold text-indigo-500">{completedCount} / {totalCount} Mastered</span>
                            <div className="w-32 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden hidden sm:block">
                                <div className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500" style={{ width: `${progress}%` }} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-lg shadow-sm border",
                    isDark ? "bg-slate-900 border-orange-500/20 text-orange-400" : "bg-white border-orange-200 text-orange-500"
                )}>
                    <Flame className={cn("w-6 h-6", roadmap.streak_count > 0 ? "text-orange-500 fill-orange-500" : "text-slate-400")} />
                    {roadmap.streak_count}
                </div>
            </div>

            {/* Structured Skill Tree by Cluster */}
            <div className="w-full max-w-sm px-4 flex flex-col items-center relative gap-4">
                {roadmap.topics.map((cluster, cIndex) => (
                    <div key={cluster.cluster_id} className="w-full flex flex-col items-center mb-12">
                        {/* Cluster Header */}
                        <div className="mb-6 px-6 py-2 rounded-full border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shadow-sm z-20">
                            <h3 className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest text-xs">
                                {cluster.cluster_title}
                            </h3>
                        </div>

                        {cluster.subtopics.map((topic, index) => {
                            const isCompleted = topic.status === "completed"
                            const isAvailable = topic.status === "available"
                            const isLocked = topic.status === "locked"
                            
                            let isCooldown = false
                            let cooldownRemaining = 0
                            if (topic.locked_until) {
                                const lockedDate = new Date(topic.locked_until).getTime()
                                const now = Date.now()
                                if (lockedDate > now) {
                                    isCooldown = true
                                    cooldownRemaining = Math.ceil((lockedDate - now) / 60000)
                                }
                            }

                            const offsetX = index % 2 === 0 ? 0 : (index % 4 === 1 ? 40 : -40)
                            const isLastNode = cIndex === roadmap.topics.length - 1 && index === cluster.subtopics.length - 1

                            return (
                                <div key={topic.id} className="relative w-full flex flex-col items-center">
                                    {/* Vertical connecting line to next node */}
                                    {!isLastNode && (
                                        <div className="h-12 w-3 rounded-full my-2 bg-slate-200 dark:bg-slate-800 relative overflow-hidden shrink-0">
                                            {(isCompleted) && (
                                                <div className="absolute inset-0 bg-green-500" />
                                            )}
                                        </div>
                                    )}

                                    {/* Node */}
                                    <motion.button
                                        whileHover={(isAvailable || isCompleted) && !isCooldown ? { scale: 1.05 } : {}}
                                        whileTap={(isAvailable || isCompleted) && !isCooldown ? { scale: 0.95 } : {}}
                                        onClick={() => {
                                            if (!isCooldown && (isAvailable || isCompleted)) {
                                                setSelectedTopic(topic)
                                            } else if (isCooldown) {
                                                addToast({ title: `Topic in cooldown for ${cooldownRemaining}m`, type: "error" })
                                            }
                                        }}
                                        disabled={isLocked && !isCooldown}
                                        className={cn(
                                            "relative w-20 h-20 rounded-full flex items-center justify-center transition-all z-10 shrink-0",
                                            isCompleted ? "bg-green-500 text-white shadow-[0_6px_0_#16a34a]" : '',
                                            isAvailable && !isCooldown ? "bg-gradient-to-b from-cyan-400 to-indigo-500 text-white shadow-[0_6px_0_#4f46e5]" : '',
                                            (isLocked && !isCooldown) ? "bg-slate-200 dark:bg-slate-800 text-slate-400 shadow-[0_6px_0_#cbd5e1] dark:shadow-[0_6px_0_#0f172a] cursor-not-allowed opacity-80" : '',
                                            isCooldown ? "bg-red-500 text-white shadow-[0_6px_0_#b91c1c] cursor-not-allowed" : ''
                                        )}
                                        style={{ transform: `translateX(${offsetX}px)` }}
                                    >
                                        {/* Glowing rings for available node */}
                                        {isAvailable && !isCooldown && (
                                            <>
                                                <div className="absolute inset-0 rounded-full animate-ping bg-cyan-400/40" style={{ animationDuration: '2s' }} />
                                                <div className="absolute -inset-2 rounded-full border-2 border-indigo-400/50" />
                                            </>
                                        )}

                                        {isCompleted && <CheckCircle2 className="w-8 h-8" />}
                                        {isAvailable && !isCooldown && <span className="font-bold text-xl">{topic.difficulty}</span>}
                                        {(isLocked && !isCooldown) && <Lock className="w-8 h-8" />}
                                        {isCooldown && <ShieldAlert className="w-8 h-8" />}
                                        
                                        {/* Difficulty Badge */}
                                        <div className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-sm">
                                            L{topic.difficulty}
                                        </div>
                                    </motion.button>
                                    
                                    {/* Title below node */}
                                    <div 
                                        className={cn(
                                            "mt-3 text-center px-4 max-w-[200px]",
                                            isCompleted ? "font-semibold text-green-600 dark:text-green-400" :
                                            isAvailable && !isCooldown ? "font-bold text-indigo-600 dark:text-indigo-400" :
                                            isCooldown ? "font-bold text-red-500" :
                                            "font-medium text-slate-500 dark:text-slate-400"
                                        )}
                                        style={{ transform: `translateX(${offsetX}px)` }}
                                    >
                                        {topic.title}
                                        {isCooldown && (
                                            <div className="text-xs mt-1 text-red-400">Cooldown: {cooldownRemaining}m</div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ))}
                
                {/* Final Boss Node */}
                {allTopics.length > 0 && (
                    <div className="w-full flex flex-col items-center mt-4">
                        <div className="h-12 w-3 rounded-full my-2 bg-slate-200 dark:bg-slate-800 relative overflow-hidden shrink-0">
                            {isAllCompleted && <div className="absolute inset-0 bg-green-500" />}
                        </div>
                        <motion.button
                            whileHover={isAllCompleted ? { scale: 1.05 } : {}}
                            whileTap={isAllCompleted ? { scale: 0.95 } : {}}
                            onClick={() => {
                                if (isAllCompleted) setShowFinalExam(true)
                            }}
                            disabled={!isAllCompleted}
                            className={cn(
                                "relative w-28 h-24 rounded-2xl flex items-center justify-center transition-all z-10 shrink-0",
                                isAllCompleted ? "bg-gradient-to-br from-yellow-400 to-amber-600 text-white shadow-[0_8px_0_#b45309]" : "bg-slate-200 dark:bg-slate-800 text-slate-400 shadow-[0_8px_0_#cbd5e1] dark:shadow-[0_8px_0_#0f172a] cursor-not-allowed opacity-80"
                            )}
                        >
                            {isAllCompleted && (
                                <>
                                    <div className="absolute inset-0 rounded-2xl animate-ping bg-yellow-400/40" style={{ animationDuration: '3s' }} />
                                    <div className="absolute -inset-2 rounded-2xl border-2 border-yellow-400/50" />
                                </>
                            )}
                            <div className="flex flex-col items-center gap-1">
                                <Flame className="w-8 h-8" />
                                <span className="font-bold text-xs uppercase tracking-wider">Final Exam</span>
                            </div>
                        </motion.button>
                    </div>
                )}
                
                <div className="h-8" /> {/* extra padding at bottom */}
            </div>

            <TopicDetailModal
                isOpen={!!selectedTopic}
                onClose={() => setSelectedTopic(null)}
                topic={selectedTopic}
                roadmapId={roadmap.id}
                onComplete={(updatedProgress?: any[]) => {
                    if (updatedProgress) {
                        fetchRoadmapDetails()
                    }
                    setSelectedTopic(null)
                }}
            />

            {showFinalExam && (
                <FinalExamModal
                    isOpen={showFinalExam}
                    onClose={() => setShowFinalExam(false)}
                    roadmapId={roadmap.id}
                    onComplete={() => {
                        setShowFinalExam(false)
                        setShowCertificate(true)
                    }}
                />
            )}

            {showCertificate && roadmap && (
                <CertificateModal
                    isOpen={showCertificate}
                    onClose={() => setShowCertificate(false)}
                    studentName={user?.name || user?.username || "Student"}
                    topicName={roadmap.roadmap_title || roadmap.subject}
                    date={new Date()}
                />
            )}
        </div>
    )
}

export default MasteryNodeMap
