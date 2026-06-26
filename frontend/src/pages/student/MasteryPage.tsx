import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { Loader2, Plus, Map, ArrowRight } from "lucide-react"
import api from "../../utils/api"
import { useToast } from "../../contexts/ToastContext"
import { useTheme } from "../../contexts/ThemeContext"
import { cn } from "../../lib/utils"

interface RoadmapPreview {
    id: string
    subject: string
    completed_count: number
    total_count: number
    created_at: string
}

const MasteryPage: React.FC = () => {
    const navigate = useNavigate()
    const { addToast } = useToast()
    const { colorScheme } = useTheme()
    const isDark = colorScheme === "dark"

    const [roadmaps, setRoadmaps] = useState<RoadmapPreview[]>([])
    const [loading, setLoading] = useState(true)
    const [subject, setSubject] = useState("")
    const [generating, setGenerating] = useState(false)
    const [showNew, setShowNew] = useState(false)

    useEffect(() => {
        fetchRoadmaps()
    }, [])

    const fetchRoadmaps = async () => {
        try {
            setLoading(true)
            const res = await api.get("/api/mastery/roadmaps")
            setRoadmaps(res.data)
        } catch (error: any) {
            console.error("Error fetching roadmaps", error)
            addToast({ title: "Failed to load roadmaps", type: "error" })
        } finally {
            setLoading(false)
        }
    }

    const handleGenerate = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        if (!subject.trim()) return

        try {
            setGenerating(true)
            const res = await api.post("/api/mastery/generate-roadmap", { subject })
            if (res.data.id) {
                addToast({ title: "Roadmap generated!", type: "success" })
                navigate(`/mastery/${res.data.id}`)
            }
        } catch (error: any) {
            console.error("Error generating roadmap", error)
            const errMsg = error.response?.data?.detail || "Failed to generate roadmap. Please try again."
            addToast({ title: errMsg, type: "error" })
        } finally {
            setGenerating(false)
        }
    }

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        )
    }

    const renderNewForm = () => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto w-full flex flex-col items-center justify-center min-h-[60vh] text-center px-4"
        >
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-400 to-indigo-500 flex items-center justify-center mb-6 shadow-xl">
                <Map className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-heading font-bold mb-4 bg-gradient-to-r from-cyan-400 to-indigo-500 bg-clip-text text-transparent">
                What do you want to master today?
            </h1>
            <p className={cn("text-lg mb-8 max-w-lg", isDark ? "text-slate-400" : "text-slate-600")}>
                Enter any subject and our AI will generate a personalized pathway to mastery.
            </p>

            <form onSubmit={handleGenerate} className="w-full max-w-md relative">
                <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter a subject (e.g. Data Structures, Python, React)"
                    disabled={generating}
                    className={cn(
                        "w-full px-6 py-4 rounded-2xl border outline-none text-lg transition-all pr-36",
                        isDark 
                            ? "bg-slate-900/50 border-white/10 text-white focus:border-cyan-500/50 focus:bg-slate-900" 
                            : "bg-white border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                    )}
                />
                <button
                    type="submit"
                    disabled={generating || !subject.trim()}
                    className={cn(
                        "absolute right-2 top-2 bottom-2 px-6 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2",
                        "bg-gradient-to-r from-cyan-500 to-indigo-600 text-white hover:shadow-lg hover:shadow-indigo-500/25"
                    )}
                >
                    {generating ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>Start <ArrowRight className="w-4 h-4" /></>
                    )}
                </button>
            </form>
            
            {generating && (
                <div className="mt-8 text-sm animate-pulse text-indigo-400">
                    Generating your custom learning roadmap...
                </div>
            )}
        </motion.div>
    )

    if (roadmaps.length === 0 || showNew) {
        return renderNewForm()
    }

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-heading font-bold bg-gradient-to-r from-cyan-400 to-indigo-500 bg-clip-text text-transparent">
                        Your Mastery Paths
                    </h1>
                    <p className={cn("mt-1", isDark ? "text-slate-400" : "text-slate-500")}>
                        Continue your learning journeys or start a new one.
                    </p>
                </div>
                <button
                    onClick={() => setShowNew(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all hover:-translate-y-0.5"
                >
                    <Plus className="w-5 h-5" />
                    New Subject
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roadmaps.map((r) => {
                    const progress = r.total_count ? Math.round((r.completed_count / r.total_count) * 100) : 0
                    
                    return (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            key={r.id}
                            onClick={() => navigate(`/mastery/${r.id}`)}
                            className={cn(
                                "group text-left p-6 rounded-2xl border transition-all h-full flex flex-col items-start gap-4 hover:-translate-y-1 hover:shadow-xl",
                                isDark 
                                    ? "bg-slate-900/50 border-white/10 hover:border-cyan-500/30 hover:bg-slate-900/80" 
                                    : "bg-white border-slate-200 hover:border-indigo-300 hover:shadow-indigo-500/10"
                            )}
                        >
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 flex items-center justify-center">
                                <Map className="w-6 h-6 text-indigo-500" />
                            </div>
                            
                            <div className="flex-1 w-full flex flex-col justify-center">
                                <h3 className={cn("text-xl font-heading font-bold mb-1", isDark ? "text-white" : "text-slate-900")}>
                                    {r.subject}
                                </h3>
                                <div className="flex items-center justify-between text-sm mt-3 mb-2">
                                    <span className={isDark ? "text-slate-400" : "text-slate-500"}>Progress</span>
                                    <span className="font-semibold text-indigo-500">{r.completed_count} / {r.total_count}</span>
                                </div>
                                <div className={cn("w-full h-2 rounded-full overflow-hidden", isDark ? "bg-slate-800" : "bg-slate-100")}>
                                    <div 
                                        className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 transition-all duration-500"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>
                        </motion.button>
                    )
                })}
            </div>
        </div>
    )
}

export default MasteryPage
