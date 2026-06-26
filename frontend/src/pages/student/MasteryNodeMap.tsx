import React, { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { Loader2, ArrowLeft, CheckCircle2, Lock, Flame } from "lucide-react"
import api from "../../utils/api"
import { useToast } from "../../contexts/ToastContext"
import { useTheme } from "../../contexts/ThemeContext"
import { useAuth } from "../../hooks/useAuth"
import { cn } from "../../lib/utils"
import TopicDetailModal from "../../components/mastery/TopicDetailModal"
import CertificateModal from "../../components/mastery/CertificateModal"

interface TopicNode {
    id: string
    title: string
    order: number
    concept_summary: string
    estimated_minutes: number
    status: "locked" | "available" | "completed"
    quiz_score?: number
    progress_id?: string
}

interface RoadmapDetails {
    id: string
    subject: string
    topics: TopicNode[]
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

    useEffect(() => {
        if (roadmapId) {
            fetchRoadmapDetails()
        }
    }, [roadmapId])

    const fetchRoadmapDetails = async () => {
        try {
            const res = await api.get(`/api/mastery/roadmaps/${roadmapId}`)
            // Sort topics by order just in case
            const sortedTopics = res.data.topics.sort((a: any, b: any) => a.order - b.order)
            setRoadmap({ ...res.data, topics: sortedTopics })
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

    const completedCount = roadmap.topics.filter(t => t.status === "completed").length
    const totalCount = roadmap.topics.length
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

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
                            {roadmap.subject}
                        </h1>
                        <div className="flex items-center gap-3 text-sm mt-1">
                            <span className="font-semibold text-indigo-500">{completedCount} / {totalCount} Mastered</span>
                            <div className="w-32 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden hidden sm:block">
                                <div className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500" style={{ width: `${progress}%` }} />
                            </div>
                            {completedCount === totalCount && totalCount > 0 && (
                                <button
                                    onClick={() => setShowCertificate(true)}
                                    className="ml-4 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-white font-bold text-xs shadow-md hover:shadow-yellow-500/25 transition-all flex items-center gap-1"
                                >
                                    <Flame className="w-3 h-3" /> View Certificate
                                </button>
                            )}
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

            {/* Duolingo Style Skill Tree */}
            <div className="w-full max-w-sm px-4 flex flex-col items-center relative gap-4">
                {roadmap.topics.map((topic, index) => {
                    const isCompleted = topic.status === "completed"
                    const isAvailable = topic.status === "available"
                    const isLocked = topic.status === "locked"
                    
                    // Simple zigzag logic
                    const offsetX = index % 2 === 0 ? 0 : (index % 4 === 1 ? 40 : -40)

                    return (
                        <div key={topic.id} className="relative w-full flex flex-col items-center">
                            {/* Vertical connecting line to next node */}
                            {index < roadmap.topics.length - 1 && (
                                <div className="h-12 w-3 rounded-full my-2 bg-slate-200 dark:bg-slate-800 relative overflow-hidden shrink-0">
                                    {(isCompleted) && (
                                        <div className="absolute inset-0 bg-green-500" />
                                    )}
                                </div>
                            )}

                            {/* Node */}
                            <motion.button
                                whileHover={isAvailable ? { scale: 1.05 } : {}}
                                whileTap={isAvailable ? { scale: 0.95 } : {}}
                                onClick={() => {
                                    if (isAvailable || isCompleted) setSelectedTopic(topic)
                                }}
                                disabled={isLocked}
                                className={cn(
                                    "relative w-20 h-20 rounded-full flex items-center justify-center transition-all z-10 shrink-0",
                                    isCompleted ? "bg-green-500 text-white shadow-[0_6px_0_#16a34a]" : '',
                                    isAvailable ? "bg-gradient-to-b from-cyan-400 to-indigo-500 text-white shadow-[0_6px_0_#4f46e5]" : '',
                                    isLocked ? "bg-slate-200 dark:bg-slate-800 text-slate-400 shadow-[0_6px_0_#cbd5e1] dark:shadow-[0_6px_0_#0f172a] cursor-not-allowed opacity-80" : ''
                                )}
                                style={{ transform: `translateX(${offsetX}px)` }}
                            >
                                {/* Glowing rings for available node */}
                                {isAvailable && (
                                    <>
                                        <div className="absolute inset-0 rounded-full animate-ping bg-cyan-400/40" style={{ animationDuration: '2s' }} />
                                        <div className="absolute -inset-2 rounded-full border-2 border-indigo-400/50" />
                                    </>
                                )}

                                {isCompleted && <CheckCircle2 className="w-8 h-8" />}
                                {isAvailable && <span className="font-bold text-xl">{index + 1}</span>}
                                {isLocked && <Lock className="w-8 h-8" />}
                            </motion.button>
                            
                            {/* Title below node */}
                            <div 
                                className={cn(
                                    "mt-3 text-center px-4 max-w-[200px]",
                                    isCompleted ? "font-semibold text-green-600 dark:text-green-400" :
                                    isAvailable ? "font-bold text-indigo-600 dark:text-indigo-400" :
                                    "font-medium text-slate-500 dark:text-slate-400"
                                )}
                                style={{ transform: `translateX(${offsetX}px)` }}
                            >
                                {topic.title}
                            </div>
                        </div>
                    )
                })}
                <div className="h-8" /> {/* extra padding at bottom */}
            </div>

            <TopicDetailModal
                isOpen={!!selectedTopic}
                onClose={() => setSelectedTopic(null)}
                topic={selectedTopic}
                onComplete={(updatedProgress?: any[]) => {
                    if (updatedProgress && roadmap) {
                        const progressMap = new Map();
                        updatedProgress.forEach(p => progressMap.set(p.topic_id, p));
                        
                        setRoadmap(prev => {
                            if (!prev) return prev;
                            const newTopics = prev.topics.map(t => {
                                const p = progressMap.get(t.id);
                                if (p) {
                                    return { ...t, status: p.status, quiz_score: p.quiz_score, progress_id: p.id || p._id };
                                }
                                return t;
                            });
                            
                            // Check if this completion finished the entire roadmap
                            const newCompletedCount = newTopics.filter(t => t.status === "completed").length;
                            const newTotalCount = newTopics.length;
                            if (newCompletedCount === newTotalCount && newTotalCount > 0) {
                                // Add a small delay for a better user experience
                                setTimeout(() => setShowCertificate(true), 500);
                            }
                            
                            return { ...prev, topics: newTopics };
                        });
                    } else {
                        fetchRoadmapDetails()
                    }
                    setSelectedTopic(null)
                }}
            />

            {showCertificate && roadmap && (
                <CertificateModal
                    isOpen={showCertificate}
                    onClose={() => setShowCertificate(false)}
                    studentName={user?.name || user?.username || "Student"}
                    topicName={roadmap.subject}
                    date={new Date()}
                />
            )}
        </div>
    )
}

export default MasteryNodeMap
